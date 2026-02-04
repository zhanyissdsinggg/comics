import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import {
  checkRateLimit,
  checkRateLimitByIp,
  getIdempotencyRecord,
  setIdempotencyRecord,
} from "../../common/storage/limits";
import { getTopupPackage } from "../../common/config/topup";
import { PrismaService } from "../../common/prisma/prisma.service";
import { buildWalletSnapshot } from "../../common/utils/subscription";
import { StatsService } from "../../common/services/stats.service";
import { ORDER_STATUS } from "../../common/utils/order-status";
import { createHmac, timingSafeEqual } from "crypto";
import { getClientIp } from "../../common/utils/ip";

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService
  ) {}

  private async logAudit(action: string, payload: Record<string, any>, req: Request) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: payload.userId || null,
          action,
          targetType: payload.targetType || "payment",
          targetId: payload.targetId || "",
          payload,
          requestId: req.requestId || "",
        },
      });
    } catch {
      // ignore audit errors
    }
  }

  private verifyWebhookSignature(req: Request, body: any) {
    const secret = process.env.WEBHOOK_SECRET || "";
    if (!secret) {
      return true;
    }
    const signature = String(req.headers["x-webhook-signature"] || "");
    if (!signature) {
      return false;
    }
    const rawBody = (req as any).rawBody || JSON.stringify(body || {});
    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    } catch {
      return false;
    }
  }

  @Post("create")
  async create(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const idempotencyKey = body?.idempotencyKey || req.headers["idempotency-key"];
    if (idempotencyKey) {
      const cached = await getIdempotencyRecord(this.prisma, userId, String(idempotencyKey));
      if (cached) {
        res.status(cached.status || 200);
        return cached.body;
      }
    }
    const rate = await checkRateLimit(this.prisma, userId, "topup_create", 10, 60);
    if (!rate.ok) {
      res.status(429);
      const body = buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 429,
          body,
        });
      }
      return body;
    }
    const packageId = body?.packageId;
    const provider = body?.provider || "stripe";
    const created = await this.paymentsService.create(userId, packageId, provider);
    if (!created) {
      res.status(400);
      const body = buildError(ERROR_CODES.INVALID_REQUEST);
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 400,
          body,
        });
      }
      return body;
    }
    const responseBody = {
      payment: created.payment,
      order: created.order ? { ...created.order, orderId: created.order.id } : null,
    };
    await this.logAudit(
      "payment_create",
      { userId, targetType: "order", targetId: created.order?.id || "", packageId },
      req
    );
    if (idempotencyKey) {
      await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
        status: 200,
        body: responseBody,
      });
    }
    return responseBody;
  }

  @Post("confirm")
  async confirm(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const idempotencyKey = body?.idempotencyKey || req.headers["idempotency-key"];
    if (idempotencyKey) {
      const cached = await getIdempotencyRecord(this.prisma, userId, String(idempotencyKey));
      if (cached) {
        res.status(cached.status || 200);
        return cached.body;
      }
    }
    const rate = await checkRateLimit(this.prisma, userId, "topup_confirm", 10, 60);
    if (!rate.ok) {
      res.status(429);
      const body = buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 429,
          body,
        });
      }
      return body;
    }
    const paymentId = body?.paymentId;
    const result = await this.paymentsService.confirm(userId, paymentId);
    if (!result.ok) {
      res.status(400);
      const body = buildError(result.error || ERROR_CODES.INTERNAL);
      await this.logAudit(
        "payment_confirm_failed",
        { userId, targetType: "payment", targetId: paymentId || "", error: body.error },
        req
      );
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 400,
          body,
        });
      }
      return body;
    }
    const responseBody = {
      ok: true,
      order: result.order ? { ...result.order, orderId: result.order.id } : null,
      wallet: await buildWalletSnapshot(this.prisma, userId, result.wallet),
    };
    await this.logAudit(
      "payment_confirm",
      { userId, targetType: "payment", targetId: paymentId || "", orderId: result.order?.id || "" },
      req
    );
    await this.statsService.recordPaidOrder();
    if (idempotencyKey) {
      await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
        status: 200,
        body: responseBody,
      });
    }
    return responseBody;
  }

  @Post("refund")
  async refund(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const idempotencyKey = body?.idempotencyKey || req.headers["idempotency-key"];
    if (idempotencyKey) {
      const cached = await getIdempotencyRecord(this.prisma, userId, String(idempotencyKey));
      if (cached) {
        res.status(cached.status || 200);
        return cached.body;
      }
    }
    const rate = await checkRateLimit(this.prisma, userId, "refund", 5, 60);
    if (!rate.ok) {
      res.status(429);
      const body = buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 429,
          body,
        });
      }
      return body;
    }
    const orderId = body?.orderId;
    const result = await this.paymentsService.refund(userId, orderId);
    if (!result.ok) {
      res.status(400);
      const body = buildError(result.error || ERROR_CODES.INTERNAL);
      await this.logAudit(
        "payment_refund_failed",
        { userId, targetType: "order", targetId: orderId || "", error: body.error },
        req
      );
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 400,
          body,
        });
      }
      return body;
    }
    const responseBody = {
      ok: true,
      order: result.order ? { ...result.order, orderId: result.order.id } : null,
      wallet: await buildWalletSnapshot(this.prisma, userId, result.wallet),
      refundShortfall: result.refundShortfall,
    };
    await this.logAudit(
      "payment_refund",
      { userId, targetType: "order", targetId: orderId || "" },
      req
    );
    if (idempotencyKey) {
      await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
        status: 200,
        body: responseBody,
      });
    }
    return responseBody;
  }

  @Post("webhook")
  async webhook(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const eventType = body?.eventType;
    const orderId = body?.orderId;
    const userId = body?.userId || getUserIdFromRequest(req, false);
    const eventId = body?.eventId || req.headers["idempotency-key"];
    if (!eventType || !orderId || !userId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const ip = getClientIp(req);
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
      const paidPts = Math.max(0, (wallet?.paidPts || 0) - (pkg?.paidPts || 0));
      const bonusPts = Math.max(0, (wallet?.bonusPts || 0) - (pkg?.bonusPts || 0));
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
      const responseBody = { ok: true, order: next.nextOrder, wallet: next.nextWallet };
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
