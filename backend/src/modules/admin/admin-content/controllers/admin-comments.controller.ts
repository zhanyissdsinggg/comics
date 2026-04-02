import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  buildAdminVisibleCommentWhere,
  readIncludeTestDataFlag,
} from "../../../../common/utils/admin-visible-data";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";
import { UpdateCommentDto } from "../dtos/admin-content.dto";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const adminCommentSelect = {
  id: true,
  seriesId: true,
  userId: true,
  text: true,
  content: true,
  hidden: true,
  createdAt: true,
  user: {
    select: {
      email: true,
    },
  },
} as const;

type AdminCommentRecord = {
  id: string;
  seriesId: string;
  userId: string;
  text: string | null;
  content: string;
  hidden: boolean;
  createdAt: Date;
  user: { email: string | null } | null;
};

type AdminCommentSortField = "createdAt" | "userId";

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePageSize(value: unknown) {
  return Math.min(toPositiveInt(value, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
}

function normalizeSortField(value: unknown): AdminCommentSortField {
  const raw = String(value || "").trim();
  if (raw === "userId") {
    return "userId";
  }
  return "createdAt";
}

function normalizeSortOrder(value: unknown): "asc" | "desc" {
  return String(value || "").trim().toLowerCase() === "asc" ? "asc" : "desc";
}

function buildCommentWhere(search: unknown): Prisma.CommentWhereInput {
  const normalizedSearch = String(search || "").trim();
  if (!normalizedSearch) {
    return {};
  }

  return {
    OR: [
      { id: { contains: normalizedSearch, mode: "insensitive" as const } },
      { userId: { contains: normalizedSearch, mode: "insensitive" as const } },
      { seriesId: { contains: normalizedSearch, mode: "insensitive" as const } },
      { text: { contains: normalizedSearch, mode: "insensitive" as const } },
      { content: { contains: normalizedSearch, mode: "insensitive" as const } },
      {
        user: {
          is: {
            email: { contains: normalizedSearch, mode: "insensitive" as const },
          },
        },
      },
    ],
  };
}

function toAdminComment(item: {
  id: string;
  seriesId: string;
  userId: string;
  text: string | null;
  content: string;
  hidden: boolean;
  createdAt: Date;
  user: { email: string | null } | null;
}) {
  const content = item.text || item.content || "";
  const userEmail = item.user?.email || null;

  return {
    id: item.id,
    seriesId: item.seriesId,
    userId: item.userId,
    userEmail,
    author: userEmail || "Guest",
    content,
    text: content,
    rating: null,
    hidden: item.hidden,
    createdAt: item.createdAt,
  };
}

@Controller("admin/comments")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.COMMENT_READ)
export class AdminCommentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query("page") pageParam?: string,
    @Query("pageSize") pageSizeParam?: string,
    @Query("search") searchParam?: string,
    @Query("sortBy") sortByParam?: string,
    @Query("sortOrder") sortOrderParam?: string,
    @Query("includeTestData") includeTestDataParam?: string,
  ) {
    const page = toPositiveInt(pageParam, DEFAULT_PAGE);
    const pageSize = normalizePageSize(pageSizeParam);
    const sortBy = normalizeSortField(sortByParam);
    const sortOrder = normalizeSortOrder(sortOrderParam);
    const where = buildAdminVisibleCommentWhere(
      buildCommentWhere(searchParam),
      readIncludeTestDataFlag(includeTestDataParam),
    );

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        select: adminCommentSelect,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.comment.count({ where }),
    ]);

    const data = comments.map((item: AdminCommentRecord) => toAdminComment(item));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      comments: data,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  @Patch("hide")
  @RequireAdminPermissions(AdminPermission.COMMENT_UPDATE)
  async hide(@Body() body: UpdateCommentDto) {
    const seriesId = body?.seriesId;
    const commentId = body?.commentId;
    const hidden = Boolean(body?.hidden);
    if (!seriesId || !commentId) {
      throw new BadRequestException("seriesId and commentId are required.");
    }
    const comment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { hidden },
      select: adminCommentSelect,
    });
    return { comment: toAdminComment(comment) };
  }

  @Patch("recalc-rating")
  @RequireAdminPermissions(AdminPermission.COMMENT_UPDATE)
  async recalc(@Body() body: UpdateCommentDto) {
    const seriesId = body?.seriesId;
    if (!seriesId) {
      throw new BadRequestException("seriesId is required.");
    }
    const stats = await this.prisma.rating.aggregate({
      where: { seriesId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const rating = Number(stats._avg.rating || 0);
    const count = Number(stats._count.rating || 0);
    await this.prisma.series.update({
      where: { id: seriesId },
      data: { rating, ratingCount: count },
    });
    return { rating: Number(rating.toFixed(2)), count };
  }

  @Delete(":id")
  @RequireAdminPermissions(AdminPermission.COMMENT_DELETE)
  async remove(@Param("id") id: string) {
    if (!id) {
      throw new BadRequestException("commentId is required.");
    }
    const existing = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Comment not found.");
    }
    await this.prisma.comment.delete({
      where: { id },
      select: { id: true },
    });
    return { ok: true };
  }
}
