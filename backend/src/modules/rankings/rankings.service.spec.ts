import { CacheService } from "../../common/cache/cache.service";
import { CreatorCreditsService } from "../../common/creators/creator-credits.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RankingsService } from "./rankings.service";
import { loadSeriesAnalytics } from "../../common/queries/series-analytics";

jest.mock("../../common/queries/series-analytics", () => ({
  loadSeriesAnalytics: jest.fn(),
}));

describe("RankingsService", () => {
  let service: RankingsService;
  const prisma = {
    series: {
      findMany: jest.fn(),
    },
  };
  const cacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };
  const creatorCreditsService = {
    getCreditsMap: jest.fn(),
    getLegacyAuthorMap: jest.fn(),
    buildIdentity: jest.fn(),
  };

  beforeEach(() => {
    prisma.series.findMany.mockReset();
    cacheService.get.mockReset().mockResolvedValue(null);
    cacheService.set.mockReset().mockResolvedValue(undefined);
    creatorCreditsService.getCreditsMap.mockReset().mockResolvedValue(new Map());
    creatorCreditsService.getLegacyAuthorMap.mockReset().mockResolvedValue(new Map());
    creatorCreditsService.buildIdentity.mockReset().mockReturnValue({
      label: "Creator details coming soon",
      type: "fallback",
      isFallback: true,
    });
    (loadSeriesAnalytics as jest.Mock).mockReset().mockResolvedValue(
      new Map([
        [
          "series-1",
          {
            episodeCount: 12,
            latestEpisodeId: "series-1e12",
            latestEpisodeNumber: 12,
            followers: 20,
            views: 50,
          },
        ],
      ]),
    );

    service = new RankingsService(
      prisma as unknown as PrismaService,
      cacheService as unknown as CacheService,
      creatorCreditsService as unknown as CreatorCreditsService,
    );
  });

  it("filters unpublished titles from ranking responses and caches the payload", async () => {
    prisma.series.findMany.mockResolvedValue([
      {
        id: "series-1",
        title: "Visible",
        author: "",
        type: "comic",
        description: "Visible",
        coverTone: "warm",
        coverUrl: "",
        genres: ["Action"],
        status: "Ongoing",
        adult: false,
        latestEpisodeId: "series-1e12",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    const result = await service.list("top", false);

    expect(prisma.series.findMany).toHaveBeenCalledWith({
      where: { adult: false, isPublished: true },
      orderBy: [{ follows: { _count: "desc" } }, { updatedAt: "desc" }],
      take: 50,
      select: expect.any(Object),
    });
    expect(result.map((item) => item.id)).toEqual(["series-1"]);
    expect(cacheService.set).toHaveBeenCalledWith("rankings:popular:standard", expect.any(Array), 180);
  });

  it("returns cached rankings without hitting Prisma", async () => {
    cacheService.get.mockResolvedValue([
      {
        id: "cached-series",
        title: "Cached",
      },
    ]);

    await expect(service.list("new", true)).resolves.toEqual([
      {
        id: "cached-series",
        title: "Cached",
      },
    ]);
    expect(prisma.series.findMany).not.toHaveBeenCalled();
  });
});
