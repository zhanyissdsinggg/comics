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
    const payload = await this.episodeService.getEpisode(seriesId, episodeId);
    if (!payload) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }
    const userId = getUserIdFromRequest(req, false);
    await this.statsService.recordSeriesView(userId, seriesId);
    if (series?.type === "comic") {
      await this.statsService.recordComicView(userId);
    }
    return payload;
  }
}
