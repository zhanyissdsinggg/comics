import { Controller, Get, Logger, Param, Query, Req, Res } from "@nestjs/common";
import { SeriesService } from "./series.service";
import { Request } from "express";
import { checkAdultGate, parseBool } from "../../common/utils/adult-gate";
import { Response } from "express";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { getSubscriptionPayload } from "../../common/utils/subscription";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("series")
export class SeriesController {
  private readonly logger = new Logger(SeriesController.name);

  constructor(
    private readonly seriesService: SeriesService,
    private readonly prisma: PrismaService
  ) {}

  private buildFallbackEpisodes(seriesId: string, latestEpisodeId: string, episodePrice: number) {
    const match = String(latestEpisodeId || "").match(/(\d+)$/);
    const total = Math.max(1, Math.min(20, Number(match?.[1] || 1)));
    return Array.from({ length: total }, (_, idx) => {
      const number = idx + 1;
      return {
        id: `${seriesId}e${number}`,
        seriesId,
        number,
        title: `Episode ${number}`,
        releasedAt: null,
        pricePts: Math.max(0, Math.floor(Number(episodePrice || 0))),
        ttfEligible: false,
        ttfReadyAt: null,
        previewFreePages: 3,
      };
    });
  }

  private buildFallbackDetail(seriesId: string, base?: Record<string, any>) {
    const fallbackSeries = {
      id: seriesId,
      title: String(base?.title || `Series ${seriesId}`),
      type: String(base?.type || "comic"),
      adult: Boolean(base?.adult),
      coverTone: String(base?.coverTone || ""),
      coverUrl: String(base?.coverUrl || ""),
      badge: String(base?.badge || ""),
      badges: Array.isArray(base?.badges) ? base.badges : [],
      latest: String(base?.latest || ""),
      latestEpisodeId: String(base?.latestEpisodeId || `${seriesId}e1`),
      genres: Array.isArray(base?.genres) ? base.genres : [],
      status: String(base?.status || "Ongoing"),
      rating: Number(base?.rating || 0),
      ratingCount: Number(base?.ratingCount || 0),
      description: String(base?.description || ""),
      pricing: {
        currency: String(base?.pricing?.currency || "POINTS"),
        episodePrice: Number(base?.pricing?.episodePrice || 0),
        discount: Number(base?.pricing?.discount || 0),
      },
      ttf: {
        enabled: Boolean(base?.ttf?.enabled),
        intervalHours: Number(base?.ttf?.intervalHours || 24),
      },
    };

    return {
      series: fallbackSeries,
      episodes: this.buildFallbackEpisodes(
        fallbackSeries.id,
        fallbackSeries.latestEpisodeId,
        fallbackSeries.pricing.episodePrice,
      ),
    };
  }

  @Get()
  async list(@Query("adult") adultParam: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = checkAdultGate(req.cookies || {});
      if (!gate.ok) {
        res.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }
    return { series: await this.seriesService.list(adult) };
  }

  @Get(":id")
  async detail(
    @Param("id") id: string,
    @Query("adult") adultParam: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = checkAdultGate(req.cookies || {});
      if (!gate.ok) {
        res.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }
    try {
      const userId = getUserIdFromRequest(req, false);
      let subscription = null;
      if (userId) {
        try {
          subscription = await getSubscriptionPayload(this.prisma, userId);
        } catch {
          subscription = null;
        }
      }

      const result = await this.seriesService.detail(id, subscription);
      if (!result) {
        res.status(404);
        return buildError(ERROR_CODES.NOT_FOUND);
      }
      if (result.series.adult) {
        const gate = checkAdultGate(req.cookies || {});
        if (!gate.ok) {
          res.status(403);
          return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
        }
      }
      return result;
    } catch (error) {
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error(`Series detail endpoint degraded for ${id}.`, stack);

      try {
        const candidates = await this.seriesService.list(null);
        const matched = Array.isArray(candidates) ? candidates.find((item) => item?.id === id) : null;
        if (!matched) {
          res.status(404);
          return buildError(ERROR_CODES.NOT_FOUND);
        }
        if (matched.adult) {
          const gate = checkAdultGate(req.cookies || {});
          if (!gate.ok) {
            res.status(403);
            return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
          }
        }
        return this.buildFallbackDetail(id, matched);
      } catch {
        res.status(404);
        return buildError(ERROR_CODES.NOT_FOUND);
      }
    }
  }
}
