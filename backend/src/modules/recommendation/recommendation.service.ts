import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { findSeriesVisibilityCompat, isSeriesVisibilitySchemaDrift, querySeriesVisibilityCompat } from "../../common/utils/series-visibility";

@Injectable()
export class RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  async getContentBasedRecommendations(seriesId: string, limit = 10, userId?: string) {
    let currentSeries;
    try {
      currentSeries = await this.prisma.series.findUnique({
        where: { id: seriesId },
        select: {
          id: true,
          type: true,
          genres: true,
          adult: true,
          isPublished: true,
        },
      });
    } catch (error) {
      if (!isSeriesVisibilitySchemaDrift(error)) {
        throw error;
      }
      currentSeries = await findSeriesVisibilityCompat(this.prisma, seriesId, [
        "id",
        "type",
        "genres",
        "adult",
        "isPublished",
      ]);
    }

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

    let similarSeries;
    try {
      similarSeries = await this.prisma.series.findMany({
        where: {
          AND: [
            { id: { not: seriesId } },
            { type: currentSeries.type },
            { adult: currentSeries.adult },
            { isPublished: true },
            { status: { not: "draft" } },
            ...(readSeriesIds.length > 0 ? [{ id: { notIn: readSeriesIds } }] : []),
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          coverTone: true,
          type: true,
          genres: true,
          rating: true,
          ratingCount: true,
          status: true,
          badges: true,
          adult: true,
          isPublished: true,
          episodePrice: true,
          ttfEnabled: true,
          _count: {
            select: {
              follows: true,
              episodes: true,
            },
          },
        } as const,
        take: limit * 3,
      });
    } catch (error) {
      if (!isSeriesVisibilitySchemaDrift(error)) {
        throw error;
      }
      similarSeries = await querySeriesVisibilityCompat(this.prisma, {
        adult: currentSeries.adult,
        excludeIds: [seriesId, ...readSeriesIds],
        limit: limit * 3,
        onlyPublished: true,
        orderBy: [
          { field: "rating", direction: "desc" },
          { field: "ratingCount", direction: "desc" },
        ],
        select: [
          "id",
          "title",
          "description",
          "coverTone",
          "type",
          "genres",
          "rating",
          "ratingCount",
          "status",
          "badges",
          "adult",
          "isPublished",
          "episodePrice",
          "ttfEnabled",
        ],
        statusNot: "draft",
        type: currentSeries.type,
      });
    }

    return similarSeries
      .filter((series) => series.isPublished !== false)
      .map((series) => {
        let score = 10;
        const genreMatches = this.countMatches(currentSeries.genres || [], series.genres || []);
        score += genreMatches * 5;

        if (typeof series.rating === "number") {
          score += series.rating * 2;
        }

        const followCount = "_count" in (series as any) ? ((series as any)._count?.follows || 0) : 0;
        score += Math.log10(followCount + 1) * 2;

        return {
          ...series,
          similarityScore: score,
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

    const uniqueRecommendations = this.deduplicateSeries(allRecommendations);
    return uniqueRecommendations.slice(0, limit);
  }

  async getPopularSeries(limit = 10) {
    try {
      const rows = await this.prisma.series.findMany({
        where: {
          status: { not: "draft" },
          isPublished: true,
        },
        orderBy: [{ rating: "desc" }, { ratingCount: "desc" }],
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          coverTone: true,
          type: true,
          genres: true,
          rating: true,
          ratingCount: true,
          status: true,
          badges: true,
          adult: true,
          isPublished: true,
          episodePrice: true,
          ttfEnabled: true,
          _count: {
            select: {
              follows: true,
              episodes: true,
            },
          },
        } as const,
      });

      return rows.filter((series) => series.isPublished !== false);
    } catch (error) {
      if (!isSeriesVisibilitySchemaDrift(error)) {
        throw error;
      }
      return querySeriesVisibilityCompat(this.prisma, {
        limit,
        onlyPublished: true,
        orderBy: [
          { field: "rating", direction: "desc" },
          { field: "ratingCount", direction: "desc" },
        ],
        select: [
          "id",
          "title",
          "description",
          "coverTone",
          "type",
          "genres",
          "rating",
          "ratingCount",
          "status",
          "badges",
          "adult",
          "isPublished",
          "episodePrice",
          "ttfEnabled",
        ],
        statusNot: "draft",
      });
    }
  }

  private countMatches(left: string[], right: string[]): number {
    return left.filter((item) => right.includes(item)).length;
  }

  private deduplicateSeries(series: any[]): any[] {
    const seen = new Map<string, any>();
    for (const item of series) {
      if (!seen.has(item.id) || item.similarityScore > seen.get(item.id).similarityScore) {
        seen.set(item.id, item);
      }
    }
    return Array.from(seen.values()).sort((left, right) => right.similarityScore - left.similarityScore);
  }
}
