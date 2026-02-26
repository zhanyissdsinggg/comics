import { Body, Controller, Get, Patch, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("admin/comments")
export class AdminCommentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
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
  async hide(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = body?.seriesId;
    const commentId = body?.commentId;
    const hidden = Boolean(body?.hidden);
    if (!seriesId || !commentId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const comment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { hidden },
    });
    return { comment };
  }

  @Patch("recalc-rating")
  async recalc(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = body?.seriesId;
    if (!seriesId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
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
