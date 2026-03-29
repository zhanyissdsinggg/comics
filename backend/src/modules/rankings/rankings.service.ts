import { Injectable } from "@nestjs/common";
import { CacheService } from "../../common/cache/cache.service";
import { CreatorCreditsService } from "../../common/creators/creator-credits.service";
import { mapStorefrontSeriesSummary } from "../../common/mappers/storefront-series.mapper";
import { PrismaService } from "../../common/prisma/prisma.service";
import { loadSeriesAnalytics } from "../../common/queries/series-analytics";

type StorefrontSeriesSummary = ReturnType<typeof mapStorefrontSeriesSummary>;

@Injectable()
export class RankingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly creatorCreditsService: CreatorCreditsService,
  ) {}

  async list(type: string, adult: boolean) {
    const normalizedType = String(type || "").toLowerCase() === "new" ? "new" : "popular";
    const cacheKey = `rankings:${normalizedType}:${adult ? "adult" : "standard"}`;
    const cached = await this.cacheService.get<StorefrontSeriesSummary[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await this.prisma.series.findMany({
      where: adult ? { isPublished: true } : { isPublished: true, adult: false },
      orderBy:
        normalizedType === "new"
          ? [{ updatedAt: "desc" }, { createdAt: "desc" }]
          : [{ follows: { _count: "desc" } }, { updatedAt: "desc" }],
      take: 50,
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
        latestEpisodeId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const analyticsMap = await loadSeriesAnalytics(
      this.prisma,
      rows.map((row) => row.id),
    );
    const [creditsMap, authorMap] = await Promise.all([
      this.creatorCreditsService.getCreditsMap(rows.map((row) => row.id)),
      this.creatorCreditsService.getLegacyAuthorMap(rows.map((row) => row.id)),
    ]);

    const payload = rows.map((row) => {
      const credits = creditsMap.get(row.id) || [];
      const identity = this.creatorCreditsService.buildIdentity(credits, authorMap.get(row.id));
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
    await this.cacheService.set(cacheKey, payload, 180);
    return payload;
  }
}
