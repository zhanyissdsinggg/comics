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
import { AdminAudit } from "../../decorators/admin-audit.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { BlockUserDto } from "../dtos/admin-system.dto";

function readBooleanFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  throw new BadRequestException("blocked must be a boolean.");
}

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
  @AdminAudit("update", "user")
  async block(@Body() body: BlockUserDto) {
    const userId = body?.userId;
    if (!userId) {
      throw new BadRequestException("缺少userId参数");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: readBooleanFlag(body?.blocked, true) },
    });
    return { user };
  }

  @Patch(":id/block")
  @AdminAudit("update", "user")
  async blockByPath(@Param("id") userId: string, @Body() body: { blocked?: boolean | string }) {
    if (!userId) {
      throw new BadRequestException("缺少userId参数");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: readBooleanFlag(body?.blocked, true) },
    });
    return { user };
  }

  @Delete(":id")
  @AdminAudit("delete", "user")
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
