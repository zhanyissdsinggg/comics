import { Controller, Get, Logger, Query, Req, Res } from "@nestjs/common";
import { EpisodeService } from "./episode.service";
import { Request, Response } from "express";
import { checkAdultGate } from "../../common/utils/adult-gate";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StatsService } from "../../common/services/stats.service";

@Controller("episode")
export class EpisodeController {
  private readonly logger = new Logger(EpisodeController.name);

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
    const normalizedSeriesId = String(seriesId || "").trim();
    const normalizedEpisodeId = String(episodeId || "").trim();

    if (!normalizedSeriesId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, { message: "seriesId is required" });
    }

    if (!normalizedEpisodeId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, { message: "episodeId is required" });
    }

    const series = await this.prisma.series.findUnique({ where: { id: normalizedSeriesId } });
    if (!series) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    if (series.adult) {
      const gate = checkAdultGate(req.cookies || {});
      if (!gate.ok) {
        res.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }

    const userId = getUserIdFromRequest(req, false);
    let hasAccess = false;

    if (userId) {
      try {
        const entitlement = await this.prisma.entitlement.findUnique({
          where: {
            userId_episodeId: {
              userId,
              episodeId: normalizedEpisodeId,
            },
          },
        });
        hasAccess = !!entitlement;
      } catch (error) {
        this.logger.warn(
          `Entitlement lookup failed for user ${userId}, episode ${normalizedEpisodeId}.`
        );
        if (error instanceof Error) {
          this.logger.debug(error.message);
        }
      }
    }

    const payload = await this.episodeService.getEpisode(normalizedSeriesId, normalizedEpisodeId);
    if (!payload) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }

    if (!hasAccess && payload.episode?.pages && Array.isArray(payload.episode.pages)) {
      const previewCount = Number((payload.episode as any)?.previewFreePages || 3) || 3;
      payload.episode.pages = payload.episode.pages.slice(0, previewCount);
      (payload.episode as any).isPreview = true;
      (payload.episode as any).previewCount = previewCount;
    }

    try {
      await this.statsService.recordSeriesView(userId, normalizedSeriesId);
      if (series.type === "comic") {
        await this.statsService.recordComicView(userId);
      }
    } catch (error) {
      this.logger.warn(`Stats recording failed for series ${normalizedSeriesId}, skipped.`);
      if (error instanceof Error) {
        this.logger.debug(error.message);
      }
    }

    return payload;
  }
}
