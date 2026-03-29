import { CacheService } from "../../common/cache/cache.service";
import { CreatorCreditsService } from "../../common/creators/creator-credits.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { loadSeriesAnalytics } from "../../common/queries/series-analytics";
import { RecommendationService } from "./recommendation.service";

jest.mock("../../common/queries/series-analytics", () => ({
  loadSeriesAnalytics: jest.fn(),
}));

describe("RecommendationService", () => {
  let service: RecommendationService;
  const prisma = {
    series: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    recommendationSlot: {
      findMany: jest.fn(),
    },
    progress: {
      findMany: jest.fn(),
    },
    follow: {
      findMany: jest.fn(),
    },
  };
  const cacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };
  const creatorCreditsService = {
    getCreditsMap: jest.fn(),
    buildIdentity: jest.fn(),
  };

  beforeEach(() => {
    Object.values(prisma).forEach((group) => {
      Object.values(group).forEach((mockFn) => mockFn.mockReset());
    });
    cacheService.get.mockReset().mockResolvedValue(null);
    cacheService.set.mockReset().mockResolvedValue(undefined);
    creatorCreditsService.getCreditsMap.mockReset().mockResolvedValue(new Map());
    creatorCreditsService.buildIdentity.mockReset().mockReturnValue({
      label: "Creator details coming soon",
      type: "fallback",
      isFallback: true,
    });
    (loadSeriesAnalytics as jest.Mock).mockReset().mockImplementation(
      async (_prisma: PrismaService, ids: string[]) =>
        new Map(
          ids.map((id, index) => [
            id,
            {
              episodeCount: 10 + index,
              latestEpisodeId: `${id}e${10 + index}`,
              latestEpisodeNumber: 10 + index,
              followers: 20 + index,
              views: 50 + index,
            },
          ]),
        ),
    );

    service = new RecommendationService(
      prisma as unknown as PrismaService,
      cacheService as unknown as CacheService,
      creatorCreditsService as unknown as CreatorCreditsService,
    );
  });

  it("returns no recommendations for an unpublished source title", async () => {
    prisma.series.findUnique.mockResolvedValue({
      id: "series-1",
      type: "comic",
      genres: ["Romance"],
      adult: false,
      isPublished: false,
    });

    await expect(service.getContentBasedRecommendations("series-1", 5, "user-1")).resolves.toEqual([]);
    expect(prisma.series.findMany).not.toHaveBeenCalled();
  });

  it("requests only published recommendation candidates", async () => {
    prisma.series.findUnique.mockResolvedValue({
      id: "series-1",
      type: "comic",
      genres: ["Romance"],
      adult: false,
      isPublished: true,
    });
    prisma.progress.findMany.mockResolvedValue([]);
    prisma.series.findMany.mockResolvedValue([
      {
        id: "series-2",
        title: "Published Match",
        author: "",
        description: "Visible",
        coverTone: "warm",
        coverUrl: "",
        type: "comic",
        genres: ["Romance"],
        status: "Ongoing",
        adult: false,
        isPublished: true,
        latestEpisodeId: "series-2e12",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    const result = await service.getContentBasedRecommendations("series-1", 5);

    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adult: false,
          isPublished: true,
          type: "comic",
        }),
      }),
    );
    expect(result.map((item) => item.id)).toEqual(["series-2"]);
  });

  it("only returns published titles from the popular fallback and caches them", async () => {
    prisma.series.findMany.mockResolvedValue([
      {
        id: "series-1",
        title: "Visible",
        author: "",
        description: "Visible",
        coverTone: "warm",
        coverUrl: "",
        type: "comic",
        genres: ["Action"],
        status: "Completed",
        adult: false,
        isPublished: true,
        latestEpisodeId: "series-1e10",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-04T00:00:00.000Z"),
      },
    ]);

    const result = await service.getPopularSeries(5);

    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { not: "draft" },
          isPublished: true,
        },
      }),
    );
    expect(result.map((item) => item.id)).toEqual(["series-1"]);
    expect(cacheService.set).toHaveBeenCalledWith("recommendations:popular:5", expect.any(Array), 180);
  });

  it("returns storefront slots in curated order, including the library return lane", async () => {
    prisma.recommendationSlot.findMany.mockResolvedValue([
      {
        id: "slot-library-return",
        slot: "library-return",
        seriesIds: ["series-9", "series-8"],
      },
      {
        id: "slot-home-hero",
        slot: "home-hero",
        seriesIds: ["series-1", "series-2"],
      },
      {
        id: "slot-home-breakout",
        slot: "home-breakout",
        seriesIds: ["series-7"],
      },
    ]);

    await expect(service.getHomepageSlots()).resolves.toEqual([
      {
        id: "slot-home-hero",
        slot: "home-hero",
        seriesIds: ["series-1", "series-2"],
      },
      {
        id: "slot-home-breakout",
        slot: "home-breakout",
        seriesIds: ["series-7"],
      },
      {
        id: "slot-library-return",
        slot: "library-return",
        seriesIds: ["series-9", "series-8"],
      },
    ]);
  });
});
