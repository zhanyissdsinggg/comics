import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import { EpisodeService } from "./episode.service";
import { Request } from "express";
import { checkAdultGate } from "../../common/utils/adult-gate";
import { Response } from "express";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StatsService } from "../../common/services/stats.service";

@Controller("episode")
export class EpisodeController {
  constructor(
    private readonly episodeService: EpisodeService,
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService
  ) {}

  @Get()
  async getEpisode(
    @Query("seriesId") seriesId: string,
    @Query("episodeId") episodeId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }
    if (series?.adult) {
      const gate = checkAdultGate(req.cookies || {});
      if (!gate.ok) {
        res.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }

    // 老王注释：检查用户是否已解锁该章节（付费验证）
    const userId = getUserIdFromRequest(req, false);
    let hasAccess = false;

    if (userId) {
      // 检查用户是否已解锁该章节
      const entitlement = await this.prisma.entitlement.findUnique({
        where: {
          userId_episodeId: {
            userId,
            episodeId,
          },
        },
      });
      hasAccess = !!entitlement;
    }

    // 获取章节数据
    const payload = await this.episodeService.getEpisode(seriesId, episodeId);
    if (!payload) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    // 老王注释：如果用户没有解锁，只返回预览内容（前3页）
    if (!hasAccess && payload.episode?.pages && Array.isArray(payload.episode.pages)) {
      const previewCount = 3; // 预览页数
      payload.episode.pages = payload.episode.pages.slice(0, previewCount);
      (payload.episode as any).isPreview = true;
      (payload.episode as any).previewCount = previewCount;
    }

    await this.statsService.recordSeriesView(userId, seriesId);
    if (series?.type === "comic") {
      await this.statsService.recordComicView(userId);
    }
    return payload;
  }
}
