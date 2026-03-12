import { Controller, Get, Logger, Query, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { checkAdultGate } from "../../common/utils/adult-gate";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { isPrismaSchemaDriftError } from "../../common/utils/prisma-schema-drift";
import { StatsService } from "../../common/services/stats.service";
import { EpisodeService } from "./episode.service";

@Controller("episode")
export class EpisodeController {
  private readonly logger = new Logger(EpisodeController.name);

  constructor(
    private readonly episodeService: EpisodeService,
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
  ) {}

  private isSchemaDriftError(error: unknown): boolean {
    return isPrismaSchemaDriftError(error);
  }

  private async findSeriesLite(seriesId: string) {
    try {
      const row = await this.prisma.series.findUnique({
        where: { id: seriesId },
        select: {
          id: true,
          type: true,
          adult: true,
          isPublished: true,
        },
      });
      if (!row || row.isPublished === false) {
        return null;
      }
      return row;
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(`Series lite query failed for ${seriesId}, switching to compatibility mode.`);
    }

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT "id", "type", "adult", "isPublished" FROM "series" WHERE "id" = $1 LIMIT 1`,
        seriesId,
      );
      if (!rows.length || rows[0].isPublished === false) {
        return null;
      }
      return {
        id: String(rows[0].id || ""),
        type: String(rows[0].type || "comic"),
        adult: Boolean(rows[0].adult),
      };
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(`Series lite compatibility query failed for ${seriesId}, retrying without publish state.`);
    }

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT "id", "type" FROM "series" WHERE "id" = $1 LIMIT 1`,
        seriesId,
      );
      if (!rows.length) {
        return null;
      }
      return {
        id: String(rows[0].id || ""),
        type: String(rows[0].type || "comic"),
        adult: false,
      };
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(`Series compatibility query failed for ${seriesId}.`);
      return null;
    }
  }

  @Get()
  async getEpisode(
    @Query("seriesId") seriesId: string,
    @Query("episodeId") episodeId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
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

    try {
      const series = await this.findSeriesLite(normalizedSeriesId);
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
          this.logger.warn(`Entitlement lookup failed for user ${userId}, episode ${normalizedEpisodeId}.`);
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

      if (!hasAccess && Array.isArray(payload.episode?.pages)) {
        const previewCountValue = Number((payload.episode as { previewFreePages?: number }).previewFreePages ?? 3);
        const previewCount = Number.isFinite(previewCountValue) ? Math.max(0, previewCountValue) : 3;
        payload.episode.pages = payload.episode.pages.slice(0, previewCount);
        (payload.episode as { isPreview?: boolean }).isPreview = true;
        (payload.episode as { previewCount?: number }).previewCount = previewCount;
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
    } catch (error) {
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error(
        `Episode endpoint failed for series ${normalizedSeriesId}, episode ${normalizedEpisodeId}.`,
        stack,
      );
      res.status(503);
      return buildError(ERROR_CODES.INTERNAL, { message: "Failed to load episode." });
    }
  }
}
