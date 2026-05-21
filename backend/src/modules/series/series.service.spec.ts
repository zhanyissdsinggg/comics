import { CreatorCreditsService } from "../../common/creators/creator-credits.service";
import { CacheService } from "../../common/cache/cache.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { loadSeriesAnalytics } from "../../common/queries/series-analytics";
import { SeriesService } from "./series.service";

jest.mock("../../common/queries/series-analytics", () => ({
  loadSeriesAnalytics: jest.fn(),
}));

describe("SeriesService", () => {
  let service: SeriesService;
  let prisma: {
    series: { findMany: jest.Mock };
  };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let creatorCreditsService: {
    getCreditsMap: jest.Mock;
    buildIdentity: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      series: {
        findMany: jest.fn(),
      },
    };
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };
    creatorCreditsService = {
      getCreditsMap: jest.fn(),
      buildIdentity: jest.fn(),
    };

    service = new SeriesService(
      prisma as unknown as PrismaService,
      cacheService as unknown as CacheService,
      creatorCreditsService as unknown as CreatorCreditsService,
    );
  });

  it("rebuilds the public series list when cache contains an empty payload", async () => {
    const row = {
      id: "series-001",
      title: "Crimson Tide",
      type: "comic",
      description: "A public catalog title.",
      coverUrl: "/covers/crimson-tide.jpg",
      coverTone: "noir",
      adult: false,
      isPublished: true,
      genres: ["Drama"],
      status: "Ongoing",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    };
    const credits = [
      {
        creatorId: "creator-1",
        slug: "hana-seo",
        name: "Hana Seo",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ];

    cacheService.get.mockResolvedValue([]);
    prisma.series.findMany.mockResolvedValue([row]);
    (loadSeriesAnalytics as jest.Mock).mockResolvedValue(
      new Map([
        [
          "series-001",
          {
            episodeCount: 12,
            latestEpisodeId: "series-001e12",
            latestEpisodeNumber: 12,
          },
        ],
      ]),
    );
    creatorCreditsService.getCreditsMap.mockResolvedValue(new Map([["series-001", credits]]));
    creatorCreditsService.buildIdentity.mockReturnValue({
      label: "Hana Seo",
      type: "person",
      slug: "hana-seo",
      creatorId: "creator-1",
      isFallback: false,
    });

    const result = await service.list(false);

    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ isPublished: true, adult: false }),
            expect.objectContaining({
              NOT: expect.arrayContaining([
                expect.objectContaining({
                  id: expect.objectContaining({
                    in: expect.arrayContaining(["demo-series", "fixture-series"]),
                  }),
                }),
              ]),
            }),
          ]),
        }),
      }),
    );
    expect(cacheService.set).toHaveBeenCalledWith(
      "series:list:standard:v2",
      expect.any(Array),
      expect.any(Number),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "series-001",
        title: "Crimson Tide",
        latest: "Ep 12",
        creator: expect.objectContaining({
          label: "Hana Seo",
          isFallback: false,
        }),
        creatorCredits: credits,
      }),
    ]);
  });
});
