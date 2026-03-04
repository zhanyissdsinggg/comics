import { Body, Controller, Get, Patch, UseGuards, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";

@Controller("admin/comments")
@UseGuards(AdminAuthGuard)
export class AdminCommentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const comments = await this.prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });
    return {
      comments: comments.map((item) => ({
        id: item.id,
        seriesId: item.seriesId,
        userId: item.userId,
        author: item.user?.email || "Guest",
        text: item.text,
        hidden: item.hidden,
        createdAt: item.createdAt,
      })),
    };
  }

  @Patch("hide")
  async hide(@Body() body: any) {
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
  async recalc(@Body() body: any) {
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
}
