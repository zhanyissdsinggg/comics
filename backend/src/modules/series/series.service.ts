import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CacheService } from "../../common/cache/cache.service";
import { Cacheable, CacheEvict } from "../../common/cache/cache.decorator";

@Injectable()
export class SeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  private toSeriesView(series: any) {
    return {
      id: series.id,
      title: series.title,
      type: series.type,
      adult: series.adult,
      coverTone: series.coverTone || "",
      coverUrl: series.coverUrl || "",
      badge: series.badge || "",
      badges: Array.isArray(series.badges) && series.badges.length
        ? series.badges
        : series.badge
          ? [series.badge]
          : [],
      latest: series.latestEpisodeId ? `Ep ${series.latestEpisodeId}` : "",
      latestEpisodeId: series.latestEpisodeId || "",
      genres: Array.isArray(series.genres) ? series.genres : [],
      status: series.status || "Ongoing",
      rating: series.rating || 0,
      ratingCount: series.ratingCount || 0,
      description: series.description || "",
      pricing: {
        currency: "POINTS",
        episodePrice: series.episodePrice || 0,
        discount: 0,
      },
      ttf: {
        enabled: Boolean(series.ttfEnabled),
        intervalHours: series.ttfIntervalHours || 24,
      },
    };
  }

  private applyTtfAcceleration(episode: any, series: any, subscription: any) {
    if (!episode.ttfEligible || !episode.ttfReadyAt) {
      return episode;
    }
    const multiplier = subscription?.perks?.ttfMultiplier;
    if (!multiplier || multiplier >= 1) {
      return episode;
    }
    const releasedAtMs = new Date(episode.releasedAt).getTime();
    if (Number.isNaN(releasedAtMs)) {
      return episode;
    }
    const intervalHours = series?.ttfIntervalHours || 24;
    const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
    const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
    const originalReadyAtMs = new Date(episode.ttfReadyAt).getTime();
    const targetReadyAtMs = Number.isNaN(originalReadyAtMs)
      ? Math.min(baseReadyAtMs, acceleratedReadyAtMs)
      : Math.min(originalReadyAtMs, acceleratedReadyAtMs);
    return {
      ...episode,
      ttfReadyAt: new Date(targetReadyAtMs),
    };
  }

  private isMissingPreviewFreePagesField(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code !== "P2022") {
        return false;
      }
      const missingColumn = String((error.meta as { column?: string } | undefined)?.column || "");
      if (missingColumn.includes("previewFreePages")) {
        return true;
      }
    }

    const message = String((error as { message?: string }).message || "");
    return message.includes("previewFreePages");
  }

  private async fetchSeriesWithEpisodes(seriesId: string) {
    try {
      return await this.prisma.series.findUnique({
        where: { id: seriesId },
        include: {
          episodes: {
            select: {
              id: true,
              seriesId: true,
              number: true,
              title: true,
              releasedAt: true,
              pricePts: true,
              ttfEligible: true,
              ttfReadyAt: true,
              previewFreePages: true,
            },
            orderBy: { number: "asc" },
          },
        },
      });
    } catch (error) {
      if (!this.isMissingPreviewFreePagesField(error)) {
        throw error;
      }

      const fallback = await this.prisma.series.findUnique({
        where: { id: seriesId },
        include: {
          episodes: {
            select: {
              id: true,
              seriesId: true,
              number: true,
              title: true,
              releasedAt: true,
              pricePts: true,
              ttfEligible: true,
              ttfReadyAt: true,
            },
            orderBy: { number: "asc" },
          },
        },
      });

      if (!fallback) {
        return fallback;
      }

      return {
        ...fallback,
        episodes: fallback.episodes.map((episode) => ({
          ...episode,
          previewFreePages: 0,
        })),
      };
    }
  }

  @Cacheable("series:list", 3600)
  async list(adult: boolean | null) {
    const where = adult === null ? {} : { adult };
    const list = await this.prisma.series.findMany({
      where,
      orderBy: { title: "asc" },
    });
    return list.map((item) => this.toSeriesView(item));
  }

  async detail(seriesId: string, subscription?: any) {
    const data = await this.fetchSeriesWithEpisodes(seriesId);

    if (!data) {
      return null;
    }

    const accelerated = subscription
      ? data.episodes.map((ep) => this.applyTtfAcceleration(ep, data, subscription))
      : data.episodes;

    return { series: this.toSeriesView(data), episodes: accelerated };
  }
}
