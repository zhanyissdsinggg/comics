import { CacheService } from "../../common/cache/cache.service";
import { ContentCacheInvalidationService } from "../../common/cache/content-cache-invalidation.service";
import { CreatorCreditsService } from "../../common/creators/creator-credits.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { loadSeriesAnalytics } from "../../common/queries/series-analytics";
import { SearchService } from "./search.service";

jest.mock("../../common/queries/series-analytics", () => ({
  loadSeriesAnalytics: jest.fn(),
}));

describe("SearchService", () => {
  let service: SearchService;
  let prisma: {
    $queryRaw: jest.Mock;
    series: { findMany: jest.Mock };
    searchLog: { groupBy: jest.Mock; upsert: jest.Mock };
  };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let contentCacheInvalidation: {
    invalidateSearchTelemetry: jest.Mock;
  };
  let creatorCreditsService: {
    getCreditsMap: jest.Mock;
    buildIdentity: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
      series: {
        findMany: jest.fn(),
      },
      searchLog: {
        groupBy: jest.fn(),
        upsert: jest.fn().mockResolvedValue(undefined),
      },
    };
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    contentCacheInvalidation = {
      invalidateSearchTelemetry: jest.fn().mockResolvedValue(undefined),
    };
    creatorCreditsService = {
      getCreditsMap: jest.fn().mockResolvedValue(new Map()),
      buildIdentity: jest.fn().mockReturnValue({
        label: "Creator details coming soon",
        type: "fallback",
        isFallback: true,
      }),
    };
    (loadSeriesAnalytics as jest.Mock).mockResolvedValue(
      new Map([
        [
          "series-1",
          {
            episodeCount: 12,
            latestEpisodeId: "series-1e12",
            latestEpisodeNumber: 12,
            followers: 10,
            views: 50,
          },
        ],
      ]),
    );

    service = new SearchService(
      prisma as unknown as PrismaService,
      cacheService as unknown as CacheService,
      contentCacheInvalidation as unknown as ContentCacheInvalidationService,
      creatorCreditsService as unknown as CreatorCreditsService,
    );
  });

  it("hydrates database search results and caches the payload", async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: "series-1",
          title: "Romance Comic",
          author: "",
          type: "comic",
          description: "A sweeping romance story",
          coverUrl: null,
          coverTone: null,
          adult: false,
          genres: ["Romance", "Drama"],
          status: "Ongoing",
          createdAt: new Date("2026-01-05T00:00:00.000Z"),
          updatedAt: new Date("2026-03-05T00:00:00.000Z"),
          latestEpisodeId: "series-1e12",
        },
      ])
      .mockResolvedValueOnce([{ total: BigInt(1) }]);

    const result = await service.search({
      q: "romance",
      type: "comic",
      status: "ongoing",
      genre: "romance",
      adult: false,
      sort: "relevance",
      page: 1,
      pageSize: 12,
    });

    expect(result.total).toBe(1);
    expect(result.results.map((item) => item.id)).toEqual(["series-1"]);
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining("search:results:v2:standard:romance"),
      expect.objectContaining({
        total: 1,
      }),
      120,
    );
  });

  it("returns cached search payloads without executing raw queries", async () => {
    cacheService.get.mockResolvedValue({
      results: [{ id: "cached-series" }],
      total: 1,
      page: 1,
      pageSize: 12,
      appliedSort: "latest",
    });

    await expect(
      service.search({
        q: "cached",
        adult: false,
        sort: "latest",
        page: 1,
        pageSize: 12,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        results: [
          expect.objectContaining({
            id: "cached-series",
            creator: expect.objectContaining({
              label: "Creator details coming soon",
            }),
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 12,
        appliedSort: "latest",
      }),
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("aggregates hot keywords in the database", async () => {
    prisma.searchLog.groupBy.mockResolvedValue([
      { keyword: "romance", _sum: { count: 12 } },
      { keyword: "action", _sum: { count: 9 } },
    ]);

    await expect(service.hot(false, "week")).resolves.toEqual([
      "romance",
      "action",
    ]);
    expect(prisma.searchLog.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["keyword"],
        take: 10,
      }),
    );
  });

  it("invalidates hot and search result caches when a query is logged", async () => {
    await service.log("user-1", "romance");

    expect(prisma.searchLog.upsert).toHaveBeenCalled();
    expect(
      contentCacheInvalidation.invalidateSearchTelemetry,
    ).toHaveBeenCalledWith("search-log-upsert");
  });
});
