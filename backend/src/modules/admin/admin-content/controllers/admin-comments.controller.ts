import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { UpdateCommentDto } from "../dtos/admin-content.dto";
import { logger } from "../../../../common/logger/winston.init";

@Controller("admin/comments")
@UseGuards(AdminAuthGuard)
export class AdminCommentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    try {
      const comments = await this.prisma.comment.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      });
      return {
        comments: comments.map((item: (typeof comments)[number]) => ({
          id: item.id,
          seriesId: item.seriesId,
          userId: item.userId,
          author: item.user?.email || "Guest",
          text: item.text,
          hidden: item.hidden,
          createdAt: item.createdAt,
        })),
      };
    } catch (error: any) {
      logger.warn("[admin-comments] prisma query failed, fallback to raw sql", {
        message: error?.message || String(error),
      });

      const rawComments = await this.prisma.$queryRaw<any[]>`SELECT * FROM "comments" LIMIT 500`;
      return {
        comments: rawComments.map((item: any) => ({
          id: item?.id || "",
          seriesId: item?.seriesId || item?.series_id || "",
          userId: item?.userId || item?.user_id || "",
          author: item?.author || "Guest",
          text: item?.text || item?.content || "",
          hidden: Boolean(item?.hidden),
          createdAt: item?.createdAt || item?.created_at || null,
        })),
      };
    }
  }

  @Patch("hide")
  async hide(@Body() body: UpdateCommentDto) {
    const seriesId = body?.seriesId;
    const commentId = body?.commentId;
    const hidden = Boolean(body?.hidden);
    if (!seriesId || !commentId) {
      throw new BadRequestException("缺少必需参数");
    }
    const comment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { hidden },
    });
    return { comment };
  }

  @Patch("recalc-rating")
  async recalc(@Body() body: UpdateCommentDto) {
    const seriesId = body?.seriesId;
    if (!seriesId) {
      throw new BadRequestException("缺少seriesId参数");
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
  async remove(@Param("id") id: string) {
    if (!id) {
      throw new BadRequestException("缺少评论ID参数");
    }
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("评论不存在");
    }
    await this.prisma.comment.delete({ where: { id } });
    return { ok: true };
  }
}
