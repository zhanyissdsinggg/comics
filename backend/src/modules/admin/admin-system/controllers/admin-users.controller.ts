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
import {
  buildAdminVisibleSupportTicketWhere,
  buildAdminVisibleUserWhere,
  readIncludeTestDataFlag,
} from "../../../../common/utils/admin-visible-data";
import {
  buildPaginationResult,
  calculateOffset,
  parsePaginationParams,
} from "../../../../common/utils/pagination";
import { AdminAudit } from "../../decorators/admin-audit.decorator";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";
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

function readSortOrder(value: unknown): "asc" | "desc" {
  return String(value || "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";
}

@Controller("admin/users")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.USER_READ)
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request) {
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const includeTestData = readIncludeTestDataFlag(req.query.includeTestData);
    const sortBy =
      typeof req.query.sortBy === "string" ? req.query.sortBy.trim() : "createdAt";
    const sortOrder = readSortOrder(req.query.sortOrder);
    const baseWhere = search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const where = buildAdminVisibleUserWhere(baseWhere, includeTestData);
    const orderBy = sortBy === "email" ? { email: sortOrder } : { createdAt: sortOrder };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          isBlocked: true,
          createdAt: true,
          wallet: {
            select: {
              paidPts: true,
              bonusPts: true,
            },
          },
        },
        orderBy,
        take: pageSize,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginationResult(users, total, page, pageSize);
  }

  @Get("support")
  async tickets(@Req() req: Request) {
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);
    const includeTestData = readIncludeTestDataFlag(req.query.includeTestData);
    const where = buildAdminVisibleSupportTicketWhere({}, includeTestData);

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return buildPaginationResult(tickets, total, page, pageSize);
  }

  @Patch("block")
  @AdminAudit("update", "user")
  @RequireAdminPermissions(AdminPermission.USER_BAN)
  async block(@Body() body: BlockUserDto) {
    const userId = body?.userId;
    if (!userId) {
      throw new BadRequestException("userId is required.");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: readBooleanFlag(body?.blocked, true) },
    });
    return { user };
  }

  @Patch(":id/block")
  @AdminAudit("update", "user")
  @RequireAdminPermissions(AdminPermission.USER_BAN)
  async blockByPath(@Param("id") userId: string, @Body() body: { blocked?: boolean | string }) {
    if (!userId) {
      throw new BadRequestException("userId is required.");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: readBooleanFlag(body?.blocked, true) },
    });
    return { user };
  }

  @Delete(":id")
  @AdminAudit("delete", "user")
  @RequireAdminPermissions(AdminPermission.USER_DELETE)
  async deactivate(@Param("id") userId: string) {
    if (!userId) {
      throw new BadRequestException("userId is required.");
    }
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundException("User not found.");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });
    return { ok: true, user, softDeleted: true };
  }
}
