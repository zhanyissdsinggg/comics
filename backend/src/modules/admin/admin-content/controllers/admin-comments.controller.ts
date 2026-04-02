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
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";
import { UpdateCommentDto } from "../dtos/admin-content.dto";

@Controller("admin/comments")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.COMMENT_READ)
export class AdminCommentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const comments = await this.prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
      take: 500,
    });
    return {
      comments: comments.map((item: (typeof comments)[number]) => ({
        id: item.id,
        seriesId: item.seriesId,
        userId: item.userId,
        author: item.user?.email || "Guest",
        text: item.text || item.content || "",
        hidden: item.hidden,
        createdAt: item.createdAt,
      })),
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
    });
    return { comment };
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
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Comment not found.");
    }
    await this.prisma.comment.delete({ where: { id } });
    return { ok: true };
  }
}
