import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("admin/notifications")
export class AdminNotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const notifications = await this.prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { notifications };
  }

  @Post()
  async create(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const payload = body?.notification || body || {};
    if (!payload.title) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    if (payload.broadcast) {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      await this.prisma.notification.createMany({
        data: users.map((user) => ({
          id: `N_${user.id}_${Date.now()}`,
          userId: user.id,
          type: payload.type || "PROMO",
          title: payload.title,
          message: payload.message || "",
          seriesId: payload.seriesId || null,
          episodeId: payload.episodeId || null,
          read: false,
          createdAt: new Date(),
        })),
      });
      return { ok: true, count: users.length };
    }
    const userId = payload.userId;
    if (!userId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const notification = await this.prisma.notification.create({
      data: {
        id: `N_${userId}_${Date.now()}`,
        userId,
        type: payload.type || "PROMO",
        title: payload.title,
        message: payload.message || "",
        seriesId: payload.seriesId || null,
        episodeId: payload.episodeId || null,
        read: false,
        createdAt: new Date(),
      },
    });
    return { notification };
  }
}
