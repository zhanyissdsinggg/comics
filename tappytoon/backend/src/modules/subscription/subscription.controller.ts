import { Body, Controller, Delete, Post, Req, Res } from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("subscription")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  async subscribe(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
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
    const subscription = await this.subscriptionService.subscribe(userId, planId);
    if (!subscription) {
      res.status(400);
      return buildError("INVALID_PLAN");
    }
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
    return { subscription };
  }
}
