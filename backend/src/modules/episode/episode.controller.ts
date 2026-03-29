import { Controller, Get, Logger, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { StatsService } from "../../common/services/stats.service";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { checkAdultGate } from "../../common/utils/adult-gate";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EpisodeService } from "./episode.service";

function hasEpisodePages(
  episode: unknown,
): episode is {
  pages: Array<Record<string, unknown>>;
  previewFreePages?: number;
} {
  return Array.isArray((episode as { pages?: unknown } | null | undefined)?.pages);
}

@Controller("episode")
export class EpisodeController {
  private readonly logger = new Logger(EpisodeController.name);

  constructor(
    private readonly episodeService: EpisodeService,
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
  ) {}

  @Get()
  async getEpisode(
    @Query("seriesId") seriesId: string,
    @Query("episodeId") episodeId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedSeriesId = String(seriesId || "").trim();
    const normalizedEpisodeId = String(episodeId || "").trim();

    if (!normalizedSeriesId || !normalizedEpisodeId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST, {
        message: "seriesId and episodeId are required",
      });
    }

    try {
      const series = await this.prisma.series.findUnique({
        where: { id: normalizedSeriesId },
        select: {
          id: true,
          adult: true,
          type: true,
          isPublished: true,
        },
      });

      if (!series || series.isPublished === false) {
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
      const entitlement = userId
        ? await this.prisma.entitlement.findUnique({
            where: {
              userId_episodeId: {
                userId,
                episodeId: normalizedEpisodeId,
              },
            },
          })
        : null;

      const payload = await this.episodeService.getEpisode(normalizedSeriesId, normalizedEpisodeId);
      if (!payload) {
        res.status(404);
        return buildError(ERROR_CODES.NOT_FOUND);
      }

      const responsePayload = hasEpisodePages(payload.episode)
        ? {
            ...payload,
            episode: {
              ...payload.episode,
              pages: [...payload.episode.pages],
            },
          }
        : payload;

      if (!entitlement && hasEpisodePages(responsePayload.episode)) {
        const previewCount = Math.max(
          0,
          Number((responsePayload.episode as { previewFreePages?: number }).previewFreePages || 0),
        );
        responsePayload.episode.pages = responsePayload.episode.pages.slice(0, previewCount);
        (responsePayload.episode as { isPreview?: boolean }).isPreview = true;
        (responsePayload.episode as { previewCount?: number }).previewCount = previewCount;
      }

      await this.statsService.recordSeriesView(userId, normalizedSeriesId).catch(() => undefined);
      if (String(series.type || "").toLowerCase() === "comic") {
        await this.statsService.recordComicView(userId).catch(() => undefined);
      }

      return responsePayload;
    } catch (error) {
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error(
        `Failed to load episode ${normalizedEpisodeId} for series ${normalizedSeriesId}.`,
        stack,
      );
      res.status(503);
      return buildError(ERROR_CODES.INTERNAL, { message: "Failed to load episode." });
    }
  }
}
