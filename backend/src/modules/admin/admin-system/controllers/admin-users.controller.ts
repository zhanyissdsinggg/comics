import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { parsePaginationParams, calculateOffset, buildPaginationResult } from "../../../../common/utils/pagination";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { BlockUserDto } from "../dtos/admin-system.dto";

@Controller("admin/users")
@UseGuards(AdminAuthGuard)
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request) {
    // 添加分页参数
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        include: { wallet: true },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
      }),
      this.prisma.user.count(),
    ]);

    return buildPaginationResult(users, total, page, pageSize);
  }

  @Get("support")
  async tickets(@Req() req: Request) {
    // 添加分页参数
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
      }),
      this.prisma.supportTicket.count(),
    ]);

    return buildPaginationResult(tickets, total, page, pageSize);
  }

  @Patch("block")
  async block(@Body() body: BlockUserDto) {
    const userId = body?.userId;
    if (!userId) {
      throw new BadRequestException("缺少userId参数");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: Boolean(body?.blocked) },
    });
    return { user };
  }

  @Patch(":id/block")
  async blockByPath(@Param("id") userId: string, @Body() body: { blocked?: boolean }) {
    if (!userId) {
      throw new BadRequestException("缺少userId参数");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: Boolean(body?.blocked) },
    });
    return { user };
  }

  @Delete(":id")
  async deactivate(@Param("id") userId: string) {
    if (!userId) {
      throw new BadRequestException("缺少userId参数");
    }
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundException("用户不存在");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });
    return { ok: true, user, softDeleted: true };
  }
}
