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
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request } from "express";
import { logger } from "../../../../common/logger/winston.init";
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
const SUPPORT_REPLY_COMPAT_RECHECK_MS = 30_000;
type SupportReplyCapabilityMode = "unknown" | "full" | "reply_compat";
type SupportTicketListRow = {
  id: string;
  userId: string | null;
  orderId?: string | null;
  topic?: string | null;
  subject: string;
  message: string;
  adminReply?: string | null;
  adminRepliedAt?: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: { email: string | null } | null;
  replyEmail?: string | null;
};
type SupportListResult = {
  tickets: SupportTicketListRow[];
  total: number;
  capabilities: {
    replyPersistence: boolean;
  };
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
  private replyCapabilityMode: SupportReplyCapabilityMode = "unknown";
  private replyCapabilityMarkedAt = 0;

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

    const { tickets, total, capabilities } = await this.listTickets({
      search,
      status,
      includeTestData,
      orderBy,
      pageSize,
      offset,
    });

    const normalized = (tickets as SupportTicketListRow[]).map((ticket) => ({
      id: ticket.id,
      userId: ticket.userId,
      replyEmail: ticket.replyEmail || null,
      orderId: ticket.orderId || null,
      topic: ticket.topic || null,
      subject: ticket.subject,
      message: ticket.message,
      adminReply: ticket.adminReply || null,
      adminRepliedAt: ticket.adminRepliedAt || null,
      status: ticket.status,
      userEmail: ticket.user?.email || ticket.replyEmail || null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    return {
      ...buildPaginationResult(normalized, total, page, pageSize),
      meta: {
        capabilities,
      },
    };
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
    const repliedAt = new Date();
    if (this.replyCapabilityMode === "reply_compat" && !this.shouldProbeReplyPersistence()) {
      throw this.buildReplyPersistenceUnavailableError();
    }

    let updated;
    try {
      updated = await this.prisma.supportTicket.update({
        where: { id },
        data: {
          status: nextStatus,
          adminReply: message,
          adminRepliedAt: repliedAt,
        },
      });
      this.replyCapabilityMode = "full";
    } catch (error) {
      if (this.isSupportReplyStorageUnavailable(error)) {
        this.markReplyCompatMode(error);
        throw this.buildReplyPersistenceUnavailableError();
      }
      throw error;
    }

    return {
      ok: true,
      ticket: updated,
      reply: {
        message,
        repliedAt: repliedAt.toISOString(),
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
    includeReplySearch: boolean,
  ): Prisma.SupportTicketWhereInput {
    const where: Prisma.SupportTicketWhereInput = {};

    if (search) {
      const searchClauses: Prisma.SupportTicketWhereInput[] = [
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

      if (includeReplySearch) {
        searchClauses.push({
          adminReply: { contains: search, mode: "insensitive" },
        });
      }

      where.OR = searchClauses;
    }

    if (status) {
      where.status = status;
    }

    return where;
  }

  private buildListSelect(includeReplyFields: boolean): Prisma.SupportTicketSelect {
    return {
      id: true,
      userId: true,
      orderId: true,
      topic: true,
      subject: true,
      message: true,
      ...(includeReplyFields
        ? {
            adminReply: true,
            adminRepliedAt: true,
          }
        : {}),
      status: true,
      createdAt: true,
      updatedAt: true,
      replyEmail: true,
      user: {
        select: { email: true },
      },
    };
  }

  private async listTickets(input: {
    search: string;
    status: string;
    includeTestData: boolean;
    orderBy: Prisma.SupportTicketOrderByWithRelationInput;
    pageSize: number;
    offset: number;
  }): Promise<SupportListResult> {
    return this.runWithReplyCompatFallback<SupportListResult>(
      async () => {
        const where = buildAdminVisibleSupportTicketWhere(
          this.buildListWhere(input.search, input.status, true),
          input.includeTestData,
        );
        const [tickets, total] = await Promise.all([
          this.prisma.supportTicket.findMany({
            where,
            select: this.buildListSelect(true),
            orderBy: input.orderBy,
            take: input.pageSize,
            skip: input.offset,
          }),
          this.prisma.supportTicket.count({ where }),
        ]);

        return {
          tickets: tickets as SupportTicketListRow[],
          total,
          capabilities: {
            replyPersistence: true,
          },
        };
      },
      async () => {
        const where = buildAdminVisibleSupportTicketWhere(
          this.buildListWhere(input.search, input.status, false),
          input.includeTestData,
        );
        const [tickets, total] = await Promise.all([
          this.prisma.supportTicket.findMany({
            where,
            select: this.buildListSelect(false),
            orderBy: input.orderBy,
            take: input.pageSize,
            skip: input.offset,
          }),
          this.prisma.supportTicket.count({ where }),
        ]);

        return {
          tickets: tickets as SupportTicketListRow[],
          total,
          capabilities: {
            replyPersistence: false,
          },
        };
      },
    );
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

  private async runWithReplyCompatFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    if (this.replyCapabilityMode === "reply_compat") {
      if (!this.shouldProbeReplyPersistence()) {
        return await fallback();
      }
    }

    try {
      const result = await operation();
      this.replyCapabilityMode = "full";
      this.replyCapabilityMarkedAt = 0;
      return result;
    } catch (error) {
      if (this.isSupportReplyStorageUnavailable(error)) {
        this.markReplyCompatMode(error);
        return await fallback();
      }
      throw error;
    }
  }

  private isSupportReplyStorageUnavailable(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const candidate = error as {
      code?: unknown;
      message?: unknown;
      meta?: Record<string, unknown>;
    };
    const code = String(candidate.code || "").trim();
    const columnName = String(candidate.meta?.column || candidate.meta?.field_name || "").toLowerCase();
    const message = String(candidate.message || "").toLowerCase();
    const mentionsReplyColumn = columnName.includes("adminreply")
      || columnName.includes("adminrepliedat")
      || message.includes("adminreply")
      || message.includes("adminrepliedat");
    const referencesSupportTickets = message.includes("support_tickets");

    if (!mentionsReplyColumn || !referencesSupportTickets) {
      return false;
    }

    return code === "P2021" || code === "P2022" || message.includes("does not exist");
  }

  private markReplyCompatMode(error: unknown): void {
    if (this.replyCapabilityMode === "reply_compat") {
      return;
    }

    this.replyCapabilityMode = "reply_compat";
    this.replyCapabilityMarkedAt = Date.now();
    const message = error instanceof Error ? error.message : String(error || "unknown error");
    logger.warn("[admin-support] support reply persistence is unavailable; entering reply-compat mode", {
      message,
    });
  }

  private shouldProbeReplyPersistence(): boolean {
    if (this.replyCapabilityMode !== "reply_compat") {
      return true;
    }

    return Date.now() - this.replyCapabilityMarkedAt >= SUPPORT_REPLY_COMPAT_RECHECK_MS;
  }

  private buildReplyPersistenceUnavailableError(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      message:
        "当前数据库还没有应用客服回复字段迁移，客服队列暂时只支持查看和关单。请先执行 support_tickets 回复字段迁移。",
      code: "SUPPORT_REPLY_PERSISTENCE_UNAVAILABLE",
      capabilities: {
        replyPersistence: false,
      },
    });
  }
}
