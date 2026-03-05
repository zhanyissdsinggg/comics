import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CacheService } from "../../common/cache/cache.service";
import { Cacheable, CacheEvict } from "../../common/cache/cache.decorator";

type SeriesEpisodeRow = {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  releasedAt: Date | null;
  pricePts: number;
  ttfEligible: boolean;
  ttfReadyAt: Date | null;
  previewFreePages: number;
};

@Injectable()
export class SeriesService {
  private readonly logger = new Logger(SeriesService.name);

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

  private isSchemaDriftError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021" || error.code === "P2022") {
        return true;
      }
    }

    const message = String((error as { message?: string }).message || "");
    return (
      message.includes("previewFreePages") ||
      message.includes("does not exist") ||
      message.includes("Unknown column")
    );
  }

  private normalizeEpisode(episode: Partial<SeriesEpisodeRow> & Record<string, any>): SeriesEpisodeRow {
    return {
      id: String(episode.id || ""),
      seriesId: String(episode.seriesId || ""),
      number: Number(episode.number || 0),
      title: String(episode.title || ""),
      releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : null,
      pricePts: Number(episode.pricePts || 0),
      ttfEligible: Boolean(episode.ttfEligible),
      ttfReadyAt: episode.ttfReadyAt ? new Date(episode.ttfReadyAt) : null,
      previewFreePages: Number(episode.previewFreePages || 0),
    };
  }

  private inferEpisodeCount(series: any): number {
    const latestRaw = String(series?.latestEpisodeId || "");
    const match = latestRaw.match(/(\d+)$/);
    const count = Number(match?.[1] || 0);
    if (!Number.isFinite(count) || count <= 0) {
      return 0;
    }
    return Math.min(count, 300);
  }

  private buildFallbackEpisodes(series: any): SeriesEpisodeRow[] {
    const count = this.inferEpisodeCount(series);
    if (count <= 0) {
      return [];
    }

    return Array.from({ length: count }, (_, idx) => {
      const number = idx + 1;
      return {
        id: `${series.id}e${number}`,
        seriesId: series.id,
        number,
        title: `Episode ${number}`,
        releasedAt: null,
        pricePts: Number(series?.episodePrice || 0),
        ttfEligible: false,
        ttfReadyAt: null,
        previewFreePages: 0,
      };
    });
  }

  private async fetchEpisodesWithFallback(seriesId: string): Promise<SeriesEpisodeRow[] | null> {
    try {
      const rows = await this.prisma.episode.findMany({
        where: { seriesId },
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
      });
      return rows.map((episode) => this.normalizeEpisode(episode));
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Episode full query failed for series ${seriesId}, switching to compatibility mode.`,
      );
    }

    try {
      const rows = await this.prisma.episode.findMany({
        where: { seriesId },
        select: {
          id: true,
          seriesId: true,
          number: true,
          title: true,
        },
        orderBy: { number: "asc" },
      });
      return rows.map((episode) => this.normalizeEpisode(episode));
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Episode compatibility query failed for series ${seriesId}, using synthetic episodes.`,
      );
      return null;
    }
  }

  private async fetchSeriesWithEpisodes(seriesId: string) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) {
      return null;
    }

    const episodes = await this.fetchEpisodesWithFallback(seriesId);
    return {
      ...series,
      episodes: episodes && episodes.length > 0 ? episodes : this.buildFallbackEpisodes(series),
    };
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
