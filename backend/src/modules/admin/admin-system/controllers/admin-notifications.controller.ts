import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { parsePaginationParams, calculateOffset, buildPaginationResult } from "../../../../common/utils/pagination";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { CreateNotificationDto } from "../dtos/admin-system.dto";

@Controller("admin/notifications")
@UseGuards(AdminAuthGuard)
export class AdminNotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request) {
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
  async create(@Body() body: CreateNotificationDto) {
    const payload = body?.notification || body || {};
    if (!payload.title) {
      throw new BadRequestException("缺少title参数");
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
          data: users.map((user: { id: string }) => ({
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
      throw new BadRequestException("缺少userId参数");
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

  @Delete(":id")
  async remove(@Param("id") id: string) {
    if (!id) {
      throw new BadRequestException("缺少通知ID参数");
    }
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("通知不存在");
    }
    await this.prisma.notification.delete({ where: { id } });
    return { ok: true };
  }
}
