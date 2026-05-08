import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { Request } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { parseBool, resolveAdultGateContext } from "../../common/utils/adult-gate";
import { Response } from "express";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(
    @Query("adult") adultParam: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = await resolveAdultGateContext(this.prisma, req);
      if (!gate.ok) {
        res.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      // 未登录时返回空数组，而不是401错误
      return { notifications: [] };
    }
    const notifications = await this.notificationsService.list(userId);
    return { notifications };
  }

  @Post("read")
  markRead(
    @Body() body: Record<string, any>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const notificationIds = Array.isArray(body?.notificationIds) ? body.notificationIds : [];
    const notifications = this.notificationsService.markRead(userId, notificationIds);
    return { notifications };
  }
}
