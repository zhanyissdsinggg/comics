import { Body, Controller, Delete, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { normalizePaymentAttribution } from "../../common/utils/payment-attribution";
import { SubscriptionService } from "./subscription.service";

@Controller("subscription")
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
  ) {}

  private async logAudit(action: string, payload: Record<string, unknown>) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: String(payload.userId || ""),
          action,
          resource: "subscription",
          targetType: "subscription",
          targetId: String(payload.targetId || payload.userId || ""),
          payload: JSON.stringify(payload),
        },
      });
    } catch {
      // ignore audit errors
    }
  }

  @Post()
  async subscribe(@Body() body: Record<string, any>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const planId = body?.planId;
    if (!planId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }

    const attribution = normalizePaymentAttribution(body?.attribution);
    const subscription = await this.subscriptionService.subscribe(userId, planId);
    if (!subscription) {
      res.status(400);
      return buildError("INVALID_PLAN");
    }

    await this.logAudit("subscription_create", {
      userId,
      targetId: userId,
      planId,
      attribution,
    });

    return { subscription };
  }

  @Delete()
  async cancel(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const subscription = await this.subscriptionService.cancel(userId);
    await this.logAudit("subscription_cancel", {
      userId,
      targetId: userId,
    });
    return { subscription };
  }
}
