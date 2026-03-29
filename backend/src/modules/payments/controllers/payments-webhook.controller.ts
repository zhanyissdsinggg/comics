import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { Request, Response } from "express";
import { getWebhookSecretConfig } from "../../../common/config/app-config";
import { getTopupPackage } from "../../../common/config/topup";
import { logger } from "../../../common/logger/winston.init";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  checkRateLimitByIp,
  getIdempotencyRecord,
  setIdempotencyRecord,
} from "../../../common/storage/limits";
import { getUserIdFromRequest } from "../../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../../common/utils/errors";
import { getClientIp } from "../../../common/utils/ip";
import { ORDER_STATUS } from "../../../common/utils/order-status";
import { PaymentsService } from "../payments.service";

type AuditPayload = {
  userId?: string | null;
  targetType?: string;
  targetId?: string;
  eventType?: string;
  [key: string]: unknown;
};

type WebhookBody = {
  eventType?: string;
  orderId?: string;
  userId?: string | null;
  eventId?: string;
  [key: string]: unknown;
};

@Controller("payments")
export class PaymentsWebhookController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  private async logAudit(action: string, payload: AuditPayload): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: payload.userId || "",
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

  private verifyWebhookSignature(req: Request, body: WebhookBody): boolean {
    const secret = getWebhookSecretConfig();
    if (!secret) {
      logger.error("WEBHOOK_SECRET is missing; rejecting webhook request.");
      return false;
    }

    const signature = String(req.headers["x-webhook-signature"] || "");
    if (!signature) {
      logger.warn("Webhook request is missing x-webhook-signature header.");
      return false;
    }

    const rawBody = req.rawBody || JSON.stringify(body || {});
    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
      if (!isValid) {
        logger.warn("Webhook signature validation failed.");
      }
      return isValid;
    } catch (error) {
      logger.error("Webhook signature validation threw an error.", { error });
      return false;
    }
  }

  @Post("webhook")
  async webhook(
    @Body() body: WebhookBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = getClientIp(req);
    logger.info("Received webhook request", {
      ip,
      eventType: body.eventType,
      orderId: body.orderId,
    });

    const eventType = body.eventType;
    const orderId = body.orderId;
    const userId = body.userId || getUserIdFromRequest(req, false);
    const eventId = body.eventId || req.headers["idempotency-key"];
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
      return buildError(ERROR_CODES.UNAUTHENTICATED, {
        reason: "INVALID_WEBHOOK_SIGNATURE",
      });
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
        data: {
          status: eventType === "payment_timeout" ? ORDER_STATUS.TIMEOUT : ORDER_STATUS.FAILED,
        },
      });
      await this.logAudit("payment_webhook_failed", {
        userId,
        targetType: "order",
        targetId: orderId,
        eventType,
      });
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
      await this.logAudit("payment_webhook_refund", {
        userId,
        targetType: "order",
        targetId: orderId,
      });
      return result;
    }

    if (eventType === "payment_dispute") {
      await this.prisma.order.updateMany({
        where: { id: orderId, userId },
        data: { status: ORDER_STATUS.DISPUTED },
      });
      await this.logAudit("payment_webhook_dispute", {
        userId,
        targetType: "order",
        targetId: orderId,
      });
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

      const currentPaidPts = wallet?.paidPts || 0;
      const currentBonusPts = wallet?.bonusPts || 0;
      const chargebackPaidPts = pkg?.paidPts || 0;
      const chargebackBonusPts = pkg?.bonusPts || 0;

      const paidShortfall = Math.max(0, chargebackPaidPts - currentPaidPts);
      const bonusShortfall = Math.max(0, chargebackBonusPts - currentBonusPts);
      const totalShortfall = paidShortfall + bonusShortfall;

      if (totalShortfall > 0) {
        logger.error("Chargeback failed: wallet balance is insufficient", {
          paidShortfall,
          bonusShortfall,
          totalShortfall,
        });
        res.status(400);
        return buildError(ERROR_CODES.INSUFFICIENT_POINTS, {
          chargebackShortfall: totalShortfall,
        });
      }

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
      await this.logAudit("payment_webhook_chargeback", {
        userId,
        targetType: "order",
        targetId: orderId,
      });
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


