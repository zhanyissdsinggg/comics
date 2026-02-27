import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { PaymentsService } from "../payments.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../../common/utils/errors";
import {
  checkRateLimitByIp,
  getIdempotencyRecord,
  setIdempotencyRecord,
} from "../../../common/storage/limits";
import { getTopupPackage } from "../../../common/config/topup";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { ORDER_STATUS } from "../../../common/utils/order-status";
import { createHmac, timingSafeEqual } from "crypto";
import { getClientIp } from "../../../common/utils/ip";

/**
 * 支付Webhook Controller - 处理来自支付提供商的webhook回调
 */
@Controller("payments")
export class PaymentsWebhookController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService
  ) {}

  private async logAudit(action: string, payload: Record<string, any>, req: Request) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: payload.userId || null,
          action,
          resource: payload.targetType || "payment",
          targetType: payload.targetType || "payment",
          targetId: payload.targetId || "",
          payload: JSON.stringify(payload),
        },
      });
    } catch {
      // ignore audit errors
    }
  }

  /**
   * 老王说：Webhook签名验证是防止伪造请求的关键
   * 如果未设置WEBHOOK_SECRET，必须拒绝所有webhook请求
   */
  private verifyWebhookSignature(req: Request, body: any) {
    const secret = process.env.WEBHOOK_SECRET || "";
    // 老王说：没有secret就是裸奔，必须拒绝
    if (!secret) {
      console.error("❌ 致命错误：未设置WEBHOOK_SECRET环境变量，拒绝webhook请求");
      return false;
    }
    const signature = String(req.headers["x-webhook-signature"] || "");
    if (!signature) {
      console.warn("⚠️ Webhook请求缺少签名header");
      return false;
    }
    const rawBody = (req as any).rawBody || JSON.stringify(body || {});
    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
      if (!isValid) {
        console.warn("⚠️ Webhook签名验证失败");
      }
      return isValid;
    } catch (err) {
      console.error("❌ Webhook签名验证异常:", err);
      return false;
    }
  }

  @Post("webhook")
  async webhook(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // 老王说：记录所有webhook请求，方便排查问题
    const ip = getClientIp(req);
    console.log(`📥 收到Webhook请求: IP=${ip}, eventType=${body?.eventType}, orderId=${body?.orderId}`);

    const eventType = body?.eventType;
    const orderId = body?.orderId;
    const userId = body?.userId || getUserIdFromRequest(req, false);
    const eventId = body?.eventId || req.headers["idempotency-key"];
    if (!eventType || !orderId || !userId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const rate = await checkRateLimitByIp(this.prisma, ip, "webhook", 120, 60);
    if (!rate.ok) {
      res.status(429);
      return buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
    }
    if (!this.verifyWebhookSignature(req, body)) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED, { reason: "INVALID_WEBHOOK_SIGNATURE" });
    }
    if (eventId) {
      const cached = await getIdempotencyRecord(this.prisma, userId, String(eventId));
      if (cached) {
        res.status(cached.status || 200);
        return cached.body;
      }
    }
    if (eventType === "payment_failed" || eventType === "payment_timeout") {
      await this.prisma.order.updateMany({
        where: { id: orderId, userId },
        data: { status: eventType === "payment_timeout" ? ORDER_STATUS.TIMEOUT : ORDER_STATUS.FAILED },
      });
      await this.logAudit(
        "payment_webhook_failed",
        { userId, targetType: "order", targetId: orderId, eventType },
        req
      );
      if (eventType === "payment_timeout") {
        const payment = await this.prisma.paymentIntent.findFirst({
          where: { orderId },
          orderBy: { createdAt: "desc" },
        });
        await this.paymentsService.enqueueRetry(userId, orderId, payment?.id, "TIMEOUT");
      }
      const responseBody = { ok: true };
      if (eventId) {
        await setIdempotencyRecord(this.prisma, userId, String(eventId), {
          status: 200,
          body: responseBody,
        });
      }
      return responseBody;
    }
    if (eventType === "payment_refunded") {
      const result = await this.paymentsService.refund(userId, orderId);
      if (!result.ok) {
        res.status(400);
        const responseBody = buildError(result.error || ERROR_CODES.INTERNAL);
        if (eventId) {
          await setIdempotencyRecord(this.prisma, userId, String(eventId), {
            status: 400,
            body: responseBody,
          });
        }
        return responseBody;
      }
      if (eventId) {
        await setIdempotencyRecord(this.prisma, userId, String(eventId), {
          status: 200,
          body: result,
        });
      }
      await this.logAudit(
        "payment_webhook_refund",
        { userId, targetType: "order", targetId: orderId },
        req
      );
      return result;
    }
    if (eventType === "payment_dispute") {
      await this.prisma.order.updateMany({
        where: { id: orderId, userId },
        data: { status: ORDER_STATUS.DISPUTED },
      });
      await this.logAudit(
        "payment_webhook_dispute",
        { userId, targetType: "order", targetId: orderId },
        req
      );
      const responseBody = { ok: true };
      if (eventId) {
        await setIdempotencyRecord(this.prisma, userId, String(eventId), {
          status: 200,
          body: responseBody,
        });
      }
      return responseBody;
    }
    if (eventType === "payment_chargeback") {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.userId !== userId) {
        res.status(404);
        return buildError(ERROR_CODES.INVALID_REQUEST);
      }
      if (order.status === ORDER_STATUS.CHARGEBACK) {
        return { ok: true };
      }
      const pkg = await getTopupPackage(this.prisma, order.packageId);
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

      // 老王说：拒付处理必须检查点数是否足够扣除，和退款逻辑一样
      const currentPaidPts = wallet?.paidPts || 0;
      const currentBonusPts = wallet?.bonusPts || 0;
      const chargebackPaidPts = pkg?.paidPts || 0;
      const chargebackBonusPts = pkg?.bonusPts || 0;

      // 计算拒付后的点数不足量
      const paidShortfall = Math.max(0, chargebackPaidPts - currentPaidPts);
      const bonusShortfall = Math.max(0, chargebackBonusPts - currentBonusPts);
      const totalShortfall = paidShortfall + bonusShortfall;

      // 老王说：如果点数不足，拒绝拒付处理
      if (totalShortfall > 0) {
        console.error(
          `❌ 拒付处理失败：用户点数不足。当前付费点数=${currentPaidPts}, 需扣除=${chargebackPaidPts}, 不足=${paidShortfall}; 当前赠送点数=${currentBonusPts}, 需扣除=${chargebackBonusPts}, 不足=${bonusShortfall}`
        );
        res.status(400);
        return buildError(ERROR_CODES.INSUFFICIENT_POINTS, {
          chargebackShortfall: totalShortfall,
        });
      }

      // 老王说：点数足够才能扣除，不使用Math.max防止负数
      const paidPts = currentPaidPts - chargebackPaidPts;
      const bonusPts = currentBonusPts - chargebackBonusPts;

      const next = await this.prisma.$transaction(async (tx) => {
        const nextWallet = await tx.wallet.upsert({
          where: { userId },
          update: { paidPts, bonusPts },
          create: { userId, paidPts, bonusPts, plan: "free" },
        });
        const nextOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: ORDER_STATUS.CHARGEBACK },
        });
        return { nextWallet, nextOrder };
      });
      const responseBody = {
        ok: true,
        order: next.nextOrder,
        wallet: next.nextWallet,
        chargebackShortfall: 0,
      };
      await this.logAudit(
        "payment_webhook_chargeback",
        { userId, targetType: "order", targetId: orderId },
        req
      );
      if (eventId) {
        await setIdempotencyRecord(this.prisma, userId, String(eventId), {
          status: 200,
          body: responseBody,
        });
      }
      return responseBody;
    }
    res.status(400);
    const responseBody = buildError(ERROR_CODES.INVALID_REQUEST);
    if (eventId) {
      await setIdempotencyRecord(this.prisma, userId, String(eventId), {
        status: 400,
        body: responseBody,
      });
    }
    return responseBody;
  }
}
