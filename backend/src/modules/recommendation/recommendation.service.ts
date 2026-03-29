import { Injectable } from "@nestjs/common";
import { CacheService } from "../../common/cache/cache.service";
import { CreatorCreditsService } from "../../common/creators/creator-credits.service";
import {
  mapStorefrontSeriesSummary,
  sanitizeStorefrontSeriesSummary,
} from "../../common/mappers/storefront-series.mapper";
import { PrismaService } from "../../common/prisma/prisma.service";
import { loadSeriesAnalytics } from "../../common/queries/series-analytics";

const STOREFRONT_SLOT_IDS = [
  "home-hero",
  "home-free-start",
  "home-binge-ready",
  "home-breakout",
  "library-return",
] as const;

export interface HomepageRecommendationSlot {
  id: string;
  slot: string;
  seriesIds: string[];
}

type RecommendationSeriesRow = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  coverTone: string | null;
  coverUrl: string | null;
  genres: string[];
  status: string;
  adult: boolean;
  isPublished: boolean;
  latestEpisodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StorefrontSeriesSummary = ReturnType<typeof mapStorefrontSeriesSummary>;

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly creatorCreditsService: CreatorCreditsService,
  ) {}

  private async hydrateSeries(rows: RecommendationSeriesRow[]) {
    const seriesIds = rows.map((row) => row.id);
    const [analyticsMap, creditsMap] = await Promise.all([
      loadSeriesAnalytics(this.prisma, seriesIds),
      this.creatorCreditsService.getCreditsMap(seriesIds),
    ]);

    return rows.map((row) => {
      const credits = creditsMap.get(row.id) || [];
      const identity = this.creatorCreditsService.buildIdentity(credits);
      return mapStorefrontSeriesSummary(
        row,
        analyticsMap.get(row.id) || {
          episodeCount: 0,
          latestEpisodeId: String(row.latestEpisodeId || ""),
          latestEpisodeNumber: null,
          followers: 0,
          views: 0,
        },
        identity,
        credits,
      );
    });
  }

  async getContentBasedRecommendations(seriesId: string, limit = 10, userId?: string) {
    const currentSeries = await this.prisma.series.findUnique({
      where: { id: seriesId },
      select: {
        id: true,
        type: true,
        genres: true,
        adult: true,
        isPublished: true,
      },
    });

    if (!currentSeries || currentSeries.isPublished === false) {
      return [];
    }

    let readSeriesIds: string[] = [];
    if (userId) {
      const readSeries = await this.prisma.progress.findMany({
        where: { userId },
        select: { seriesId: true },
        distinct: ["seriesId"],
      });
      readSeriesIds = readSeries.map((item) => item.seriesId);
    }

    const candidates = await this.prisma.series.findMany({
      where: {
        id: {
          notIn: [seriesId, ...readSeriesIds],
        },
        type: currentSeries.type,
        adult: currentSeries.adult,
        isPublished: true,
        status: { not: "draft" },
        ...(currentSeries.genres.length > 0 ? { genres: { hasSome: currentSeries.genres } } : {}),
      },
      take: Math.max(limit * 4, limit),
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        coverTone: true,
        coverUrl: true,
        genres: true,
        status: true,
        adult: true,
        isPublished: true,
        latestEpisodeId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const analyticsMap = await loadSeriesAnalytics(
      this.prisma,
      candidates.map((row) => row.id),
    );
    const hydrated = await this.hydrateSeries(candidates);

    return hydrated
      .map((series) => {
        const analytics = analyticsMap.get(series.id) || {
          episodeCount: 0,
          latestEpisodeId: "",
          latestEpisodeNumber: null,
          followers: 0,
          views: 0,
        };
        const genreMatches = (series.genres || []).filter((genre) => currentSeries.genres.includes(genre)).length;
        const recencyScore = Math.max(0, Date.parse(String(series.updatedAt || 0)) / 1_000_000_000);
        const followers = Number(analytics.followers || 0);
        const views = Number(analytics.views || 0);
        const score =
          genreMatches * 10 +
          Math.log10(followers + 1) * 4 +
          Math.log10(views + 1) * 2 +
          (String(series.status || "").toLowerCase() === "completed" ? 2 : 0) +
          recencyScore;

        return {
          ...series,
          similarityScore: Number(score.toFixed(3)),
        };
      })
      .sort((left, right) => right.similarityScore - left.similarityScore)
      .slice(0, limit);
  }

  async getPersonalizedRecommendations(userId: string, limit = 10) {
    const recentProgress = await this.prisma.progress.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { seriesId: true },
    });

    if (recentProgress.length === 0) {
      return this.getPopularSeries(limit);
    }

    const followedSeries = await this.prisma.follow.findMany({
      where: { userId },
      select: { seriesId: true },
    });

    const userInterestSeriesIds = [
      ...new Set([
        ...recentProgress.map((item) => item.seriesId),
        ...followedSeries.map((item) => item.seriesId),
      ]),
    ];

    const allRecommendations = [];
    for (const currentSeriesId of userInterestSeriesIds.slice(0, 3)) {
      const recommendations = await this.getContentBasedRecommendations(currentSeriesId, 5, userId);
      allRecommendations.push(...recommendations);
    }

    const deduped = new Map<string, any>();
    for (const item of allRecommendations) {
      const current = deduped.get(item.id);
      if (!current || item.similarityScore > current.similarityScore) {
        deduped.set(item.id, item);
      }
    }

    return Array.from(deduped.values())
      .sort((left, right) => right.similarityScore - left.similarityScore)
      .slice(0, limit);
  }

  async getPopularSeries(limit = 10) {
    const cacheKey = `recommendations:popular:${limit}`;
    const cached = await this.cacheService.get<StorefrontSeriesSummary[]>(cacheKey);
    if (cached) {
      return cached.map((item) => sanitizeStorefrontSeriesSummary(item));
    }

    const rows = await this.prisma.series.findMany({
      where: {
        status: { not: "draft" },
        isPublished: true,
      },
      orderBy: [{ follows: { _count: "desc" } }, { updatedAt: "desc" }],
      take: Math.max(1, limit),
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        coverTone: true,
        coverUrl: true,
        genres: true,
        status: true,
        adult: true,
        isPublished: true,
        latestEpisodeId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const series = await this.hydrateSeries(rows);
    await this.cacheService.set(cacheKey, series, 180);
    return series;
  }

  async getHomepageSlots(): Promise<HomepageRecommendationSlot[]> {
    const cacheKey = "recommendations:homepage-slots";
    const cached = await this.cacheService.get<HomepageRecommendationSlot[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const orderMap = new Map<string, number>(STOREFRONT_SLOT_IDS.map((slot, index) => [slot, index]));
    const slots = await this.prisma.recommendationSlot.findMany({
      where: {
        slot: {
          in: [...STOREFRONT_SLOT_IDS],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        slot: true,
        seriesIds: true,
      },
    });

    const normalized = slots
      .map((slot) => ({
        id: slot.id,
        slot: slot.slot,
        seriesIds: Array.isArray(slot.seriesIds)
          ? slot.seriesIds.map((item) => String(item || "").trim()).filter(Boolean)
          : [],
      }))
      .sort(
        (left, right) =>
          (orderMap.get(left.slot) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(right.slot) ?? Number.MAX_SAFE_INTEGER),
      );

    await this.cacheService.set(cacheKey, normalized, 120);
    return normalized;
  }
}
