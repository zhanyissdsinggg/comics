import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { PaymentsService } from "../payments.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../../common/utils/errors";
import {
  checkRateLimit,
  getIdempotencyRecord,
  setIdempotencyRecord,
} from "../../../common/storage/limits";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { buildWalletSnapshot } from "../../../common/utils/subscription";
import { StatsService } from "../../../common/services/stats.service";

/**
 * 订单支付Controller - 处理支付创建、确认、退款等订单相关操作
 */
@Controller("payments")
export class PaymentsOrdersController {
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
    // 老王说：前端必须传入expectedAmount，用于金额验证
    const expectedAmount = body?.expectedAmount;
    if (typeof expectedAmount !== "number" || expectedAmount <= 0) {
      res.status(400);
      const body = buildError(ERROR_CODES.INVALID_REQUEST, { reason: "MISSING_EXPECTED_AMOUNT" });
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 400,
          body,
        });
      }
      return body;
    }
    const created = await this.paymentsService.create(userId, packageId, expectedAmount, provider);
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
}
