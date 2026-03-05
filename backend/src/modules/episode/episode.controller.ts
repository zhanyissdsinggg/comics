import { Controller, Get, Logger, Query, Req, Res } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

  private buildFallbackEpisodePayload(
    seriesId: string,
    episodeId: string,
    seriesType: string,
  ) {
    const normalizedSeriesType = String(seriesType || "comic").toLowerCase();
    const number = Number(episodeId.replace(`${seriesId}e`, "")) || 1;
    if (normalizedSeriesType === "novel") {
      return {
        episode: {
          id: episodeId,
          seriesId,
          number,
          title: `Episode ${number}`,
          type: "novel",
          paragraphs: Array.from({ length: 12 }, (_, idx) =>
            `(${seriesId}-${episodeId}) Paragraph ${idx + 1}.`,
          ),
          previewParagraphs: 3,
        },
      };
    }

    return {
      episode: {
        id: episodeId,
        seriesId,
        number,
        title: `Episode ${number}`,
        type: "comic",
        pages: Array.from({ length: 12 }, (_, idx) => ({
          url: `https://placehold.co/800x1200?text=${seriesId}-${episodeId}-P${idx + 1}`,
          w: 800,
          h: 1200,
        })),
        isPreview: true,
        previewCount: 3,
        previewFreePages: 3,
      },
    };
  }

  private isSchemaDriftError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === "P2021" || error.code === "P2022";
    }
    const message = String((error as { message?: string }).message || "");
    return message.includes("does not exist") || message.includes("Unknown column");
  }

  private async findSeriesLite(seriesId: string) {
    try {
      return await this.prisma.series.findUnique({
        where: { id: seriesId },
        select: {
          id: true,
          type: true,
          adult: true,
        },
      });
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Series lite query failed for ${seriesId}, switching to compatibility mode.`,
      );
    }

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT "id", "type", "adult" FROM "series" WHERE "id" = $1 LIMIT 1`,
        seriesId,
      );
      if (!rows.length) {
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
    }

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
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

    let seriesType = "comic";
    try {
      const series = await this.findSeriesLite(normalizedSeriesId);
      if (!series) {
        res.status(404);
        return buildError(ERROR_CODES.NOT_FOUND);
      }

      seriesType = String(series.type || "comic");

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
    } catch (error) {
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error(
        `Episode endpoint degraded for series ${normalizedSeriesId}, episode ${normalizedEpisodeId}.`,
        stack,
      );
      return this.buildFallbackEpisodePayload(normalizedSeriesId, normalizedEpisodeId, seriesType);
    }
  }
}
