import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { parsePaginationParams, calculateOffset, buildPaginationResult } from "../../common/utils/pagination";

@Controller("admin/notifications")
export class AdminNotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }

    // 添加分页参数
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
      }),
      this.prisma.notification.count(),
    ]);

    return buildPaginationResult(notifications, total, page, pageSize);
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
      // 艹！这个SB代码之前直接加载所有用户到内存，现在改成分页处理
      const pageSize = 1000;
      let skip = 0;
      let totalCreated = 0;

      while (true) {
        const users = await this.prisma.user.findMany({
          select: { id: true },
          take: pageSize,
          skip: skip,
        });

        if (users.length === 0) break;

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

        totalCreated += users.length;
        skip += pageSize;
      }

      return { ok: true, count: totalCreated };
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
