import { Injectable } from "@nestjs/common";
import { CacheService } from "../../common/cache/cache.service";
import { CreatorCreditsService } from "../../common/creators/creator-credits.service";
import { mapEpisodeListItem, mapStorefrontSeriesSummary, type SeriesAnalyticsSnapshot } from "../../common/mappers/storefront-series.mapper";
import { PrismaService } from "../../common/prisma/prisma.service";
import { loadSeriesAnalytics } from "../../common/queries/series-analytics";

type SeriesListRow = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  coverUrl: string | null;
  coverTone: string | null;
  adult: boolean;
  isPublished: boolean;
  genres: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type SeriesDetailRow = SeriesListRow & {
  latestEpisodeId: string | null;
  ttfIntervalHours: number;
};

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

type StorefrontSeriesSummary = ReturnType<typeof mapStorefrontSeriesSummary>;

type CachedSeriesDetail = {
  series: StorefrontSeriesSummary;
  episodes: SeriesEpisodeRow[];
  ttfIntervalHours: number;
};

const SERIES_LIST_TTL_SECONDS = 300;
const SERIES_DETAIL_TTL_SECONDS = 180;

@Injectable()
export class SeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly creatorCreditsService: CreatorCreditsService,
  ) {}

  private applyTtfAcceleration(
    episode: SeriesEpisodeRow,
    series: { ttfIntervalHours: number },
    subscription?: { perks?: { ttfMultiplier?: number } } | null,
  ): SeriesEpisodeRow {
    if (!subscription || !episode.ttfEligible || !episode.ttfReadyAt || !episode.releasedAt) {
      return episode;
    }

    const multiplier = Number(subscription.perks?.ttfMultiplier || 1);
    if (!Number.isFinite(multiplier) || multiplier >= 1 || multiplier <= 0) {
      return episode;
    }

    const releasedAtMs = episode.releasedAt.getTime();
    const intervalHours = Math.max(1, Number(series.ttfIntervalHours || 24));
    const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
    const existingReadyAtMs = episode.ttfReadyAt.getTime();

    return {
      ...episode,
      ttfReadyAt: new Date(Math.min(existingReadyAtMs, acceleratedReadyAtMs)),
    };
  }

  private buildSeriesSummary(
    row: SeriesListRow,
    analytics: SeriesAnalyticsSnapshot,
    credits: Awaited<ReturnType<CreatorCreditsService["getCreditsForSeries"]>>,
    legacyAuthor?: string,
  ) {
    const identity = this.creatorCreditsService.buildIdentity(credits, legacyAuthor);
    return mapStorefrontSeriesSummary(
      row,
      {
        ...analytics,
        latestEpisodeId: analytics.latestEpisodeId || String((row as Partial<SeriesDetailRow>).latestEpisodeId || ""),
      },
      identity,
      credits,
    );
  }

  async list(adult: boolean | null) {
    const cacheKey = `series:list:${adult === null ? "all" : adult ? "adult" : "standard"}`;
    const cached = await this.cacheService.get<StorefrontSeriesSummary[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const where =
      adult === null
        ? { isPublished: true }
        : {
            isPublished: true,
            adult,
          };

    const rows = await this.prisma.series.findMany({
      where,
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        coverUrl: true,
        coverTone: true,
        adult: true,
        isPublished: true,
        genres: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const seriesIds = rows.map((row) => row.id);
    const [analyticsMap, creditsMap, authorMap] = await Promise.all([
      loadSeriesAnalytics(this.prisma, seriesIds),
      this.creatorCreditsService.getCreditsMap(seriesIds),
      this.creatorCreditsService.getLegacyAuthorMap(seriesIds),
    ]);

    const series = rows.map((row) =>
      this.buildSeriesSummary(
        row,
        analyticsMap.get(row.id) || {
          episodeCount: 0,
          latestEpisodeId: "",
          latestEpisodeNumber: null,
          followers: 0,
          views: 0,
        },
        creditsMap.get(row.id) || [],
        authorMap.get(row.id),
      ),
    );

    await this.cacheService.set(cacheKey, series, SERIES_LIST_TTL_SECONDS);
    return series;
  }

  async detail(seriesId: string, subscription?: { perks?: { ttfMultiplier?: number } } | null) {
    const cacheKey = `series:detail:${seriesId}`;
    let cached = await this.cacheService.get<CachedSeriesDetail>(cacheKey);

    if (!cached) {
      const row = await this.prisma.series.findUnique({
        where: { id: seriesId },
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          coverUrl: true,
          coverTone: true,
          adult: true,
          isPublished: true,
          latestEpisodeId: true,
          genres: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          ttfIntervalHours: true,
        },
      });

      if (!row || row.isPublished === false) {
        return null;
      }

      const [episodes, analyticsMap, credits, authorMap] = await Promise.all([
        this.prisma.episode.findMany({
          where: {
            seriesId,
            isDeleted: false,
          },
          orderBy: { number: "asc" },
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
        }),
        loadSeriesAnalytics(this.prisma, [seriesId]),
        this.creatorCreditsService.getCreditsForSeries(seriesId),
        this.creatorCreditsService.getLegacyAuthorMap([seriesId]),
      ]);

      const analytics = analyticsMap.get(seriesId) || {
        episodeCount: episodes.length,
        latestEpisodeId: String(row.latestEpisodeId || ""),
        latestEpisodeNumber: null,
        followers: 0,
        views: 0,
      };

      const summary = this.buildSeriesSummary(row, analytics, credits, authorMap.get(seriesId));
      cached = {
        series: summary,
        episodes,
        ttfIntervalHours: Math.max(1, Number(row.ttfIntervalHours || 24)),
      };
      await this.cacheService.set(cacheKey, cached, SERIES_DETAIL_TTL_SECONDS);
    }

    const episodes = subscription
      ? cached.episodes.map((episode) =>
          this.applyTtfAcceleration(episode, { ttfIntervalHours: cached!.ttfIntervalHours }, subscription),
        )
      : cached.episodes;

    return {
      series: cached.series,
      episodes: episodes.map((episode) => ({
        ...mapEpisodeListItem(episode),
        pricePts: episode.pricePts,
        ttfEligible: episode.ttfEligible,
        ttfReadyAt: episode.ttfReadyAt,
      })),
    };
  }
}
