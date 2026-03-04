import { Injectable } from "@nestjs/common";
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

  @Cacheable('series:list', 3600) // 老王说：缓存1小时，热点数据必须缓存
  async list(adult: boolean | null) {
    const where = adult === null ? {} : { adult };
    const list = await this.prisma.series.findMany({
      where,
      orderBy: { title: "asc" },
    });
    return list.map((item) => this.toSeriesView(item));
  }

  async detail(seriesId: string, subscription?: any) {
    // 老王说：使用include一次性查询series和episodes，避免N+1问题
    const data = await this.prisma.series.findUnique({
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
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!data) {
      return null;
    }

    const accelerated = subscription
      ? data.episodes.map((ep) => this.applyTtfAcceleration(ep, data, subscription))
      : data.episodes;

    return { series: this.toSeriesView(data), episodes: accelerated };
  }
}
