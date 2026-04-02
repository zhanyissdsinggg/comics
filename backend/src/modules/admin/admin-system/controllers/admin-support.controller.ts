import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request } from "express";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  buildAdminVisibleSupportTicketWhere,
  readIncludeTestDataFlag,
} from "../../../../common/utils/admin-visible-data";
import {
  buildPaginationResult,
  calculateOffset,
  parsePaginationParams,
} from "../../../../common/utils/pagination";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";

const SUPPORT_SORT_FIELDS = new Set(["createdAt", "updatedAt", "status"]);
type SupportTicketListRow = {
  id: string;
  userId: string | null;
  orderId?: string | null;
  topic?: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: { email: string | null } | null;
  replyEmail?: string | null;
};

function parseSortOrder(value: unknown): Prisma.SortOrder {
  return String(value || "desc").toLowerCase() === "asc" ? "asc" : "desc";
}

function parseSupportOrderBy(sortBy: unknown, sortOrder: Prisma.SortOrder): Prisma.SupportTicketOrderByWithRelationInput {
  const field = String(sortBy || "createdAt");
  if (!SUPPORT_SORT_FIELDS.has(field)) {
    return { createdAt: sortOrder };
  }
  return { [field]: sortOrder } as Prisma.SupportTicketOrderByWithRelationInput;
}

@Controller("admin/support")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.SUPPORT_READ)
export class AdminSupportController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request) {
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = calculateOffset(page, pageSize);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const includeTestData = readIncludeTestDataFlag(req.query.includeTestData);
    const sortOrder = parseSortOrder(req.query.sortOrder);
    const orderBy = parseSupportOrderBy(req.query.sortBy, sortOrder);

    const where = buildAdminVisibleSupportTicketWhere(
      this.buildListWhere(search, status),
      includeTestData,
    );
    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        select: this.buildListSelect(),
        orderBy,
        take: pageSize,
        skip: offset,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    const normalized = (tickets as SupportTicketListRow[]).map((ticket) => ({
      id: ticket.id,
      userId: ticket.userId,
      replyEmail: ticket.replyEmail || null,
      orderId: ticket.orderId || null,
      topic: ticket.topic || null,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      userEmail: ticket.user?.email || ticket.replyEmail || null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    return buildPaginationResult(normalized, total, page, pageSize);
  }

  @Post(":id/reply")
  @RequireAdminPermissions(AdminPermission.SUPPORT_UPDATE)
  async reply(@Param("id") id: string, @Body() body: { message?: string }) {
    const message = String(body?.message || "").trim();
    if (!message) {
      throw new BadRequestException("Missing reply message.");
    }

    const ticket = await this.findTicketSummary(id);
    if (!ticket) {
      throw new NotFoundException("Support ticket not found.");
    }

    const nextStatus = ticket.status.toLowerCase() === "closed" ? "closed" : "in_progress";
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: nextStatus },
    });

    return {
      ok: true,
      ticket: updated,
      reply: {
        message,
        repliedAt: new Date().toISOString(),
      },
    };
  }

  @Patch(":id/close")
  @RequireAdminPermissions(AdminPermission.SUPPORT_UPDATE)
  async close(@Param("id") id: string) {
    const ticket = await this.findTicketSummary(id);
    if (!ticket) {
      throw new NotFoundException("Support ticket not found.");
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: "closed" },
    });

    return { ok: true, ticket: updated };
  }

  @Delete(":id")
  @RequireAdminPermissions(AdminPermission.SUPPORT_DELETE)
  async remove(@Param("id") id: string) {
    const ticket = await this.findTicketSummary(id);
    if (!ticket) {
      throw new NotFoundException("Support ticket not found.");
    }
    await this.prisma.supportTicket.delete({ where: { id } });
    return { ok: true };
  }

  private buildListWhere(
    search: string,
    status: string,
  ): Prisma.SupportTicketWhereInput {
    const where: Prisma.SupportTicketWhereInput = {};

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { userId: { contains: search, mode: "insensitive" } },
        { replyEmail: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { orderId: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { topic: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { subject: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        {
          user: {
            is: {
              email: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    return where;
  }

  private buildListSelect(): Prisma.SupportTicketSelect {
    return {
      id: true,
      userId: true,
      orderId: true,
      topic: true,
      subject: true,
      message: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      replyEmail: true,
      user: {
        select: { email: true },
      },
    };
  }

  private async findTicketSummary(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });
  }
}
