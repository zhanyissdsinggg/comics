import { Test, TestingModule } from "@nestjs/testing";
import { CacheService } from "../../../../common/cache/cache.service";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminRecommendationService } from "./admin-recommendation.service";

describe("AdminRecommendationService", () => {
  let service: AdminRecommendationService;
  let prisma: {
    recommendationSlot: Record<string, jest.Mock>;
    rankingConfig: Record<string, jest.Mock>;
    recommendationAnalytics: Record<string, jest.Mock>;
    series: Record<string, jest.Mock>;
  };
  let cacheService: {
    deletePatterns: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      recommendationSlot: {
        findMany: jest.fn().mockResolvedValue([
          { id: "slot-1", slot: "homepage-banner", seriesIds: ["series-1"], createdAt: new Date() },
        ]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({
          id: "slot-2",
          slot: "homepage-hero",
          seriesIds: ["series-1", "series-2"],
          createdAt: new Date(),
        }),
        update: jest.fn().mockResolvedValue({
          id: "slot-1",
          slot: "updated-slot",
          seriesIds: ["series-1", "series-2"],
          createdAt: new Date(),
        }),
        delete: jest.fn().mockResolvedValue({ id: "slot-1" }),
      },
      rankingConfig: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "ranking-1",
            ranking: "daily-ranking",
            config: JSON.stringify({
              rankingType: "views",
              timeRange: "day",
              seriesType: "all",
              adult: false,
              maxItems: 20,
              active: true,
            }),
            createdAt: new Date(),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({
          id: "ranking-1",
          ranking: "daily-ranking",
          config: JSON.stringify({
            rankingType: "views",
            timeRange: "day",
            seriesType: "all",
            adult: false,
            maxItems: 20,
            active: true,
          }),
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: "ranking-1",
          ranking: "daily-ranking",
          config: JSON.stringify({
            rankingType: "views",
            timeRange: "month",
            seriesType: "comic",
            adult: true,
            maxItems: 50,
            active: true,
          }),
        }),
        update: jest.fn().mockResolvedValue({
          id: "ranking-1",
          ranking: "daily-ranking",
          config: JSON.stringify({
            rankingType: "views",
            timeRange: "month",
            seriesType: "comic",
            adult: true,
            maxItems: 50,
            active: false,
          }),
        }),
        delete: jest.fn().mockResolvedValue({ id: "ranking-1" }),
      },
      recommendationAnalytics: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "analytics-1",
            slot: "homepage-banner",
            seriesId: "series-1",
            date: new Date(),
            clicks: 100,
            views: 1000,
            impressions: 5000,
            conversions: 10,
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({
          id: "analytics-1",
          slot: "homepage-banner",
          seriesId: "series-1",
          date: new Date(),
          clicks: 100,
          views: 1000,
          impressions: 5000,
          conversions: 10,
        }),
      },
      series: {
        findMany: jest.fn().mockResolvedValue([
          { id: "series-1", title: "Series 1", adult: false, type: "novel" },
          { id: "series-2", title: "Series 2", adult: false, type: "comic" },
        ]),
      },
    };

    cacheService = {
      deletePatterns: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRecommendationService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get(AdminRecommendationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("lists recommendation slots with mapped admin metadata", async () => {
    const result = await service.getRecommendationSlots({ limit: 20, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.slots[0]).toEqual(
      expect.objectContaining({
        id: "slot-1",
        slot: "homepage-banner",
        name: "homepage-banner",
        slotType: "manual",
        algorithm: "manual",
        active: true,
      }),
    );
  });

  it("creates a recommendation slot and invalidates storefront caches", async () => {
    const slot = await service.createRecommendationSlot({
      slot: "homepage-hero",
      seriesIds: ["series-1", "series-2"],
    });

    expect(slot.slot).toBe("homepage-hero");
    expect(prisma.recommendationSlot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slot: "homepage-hero",
          seriesIds: ["series-1", "series-2"],
        }),
      }),
    );
    expect(cacheService.deletePatterns).toHaveBeenCalledWith([
      "recommendations:*",
      "rankings:*",
      "search:keywords:*",
    ]);
  });

  it("preserves existing ranking config fields during partial updates", async () => {
    const result = await service.updateRankingConfig("ranking-1", { active: false });

    expect(prisma.rankingConfig.findUnique).toHaveBeenCalledWith({
      where: { id: "ranking-1" },
    });
    expect(prisma.rankingConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ranking-1" },
        data: expect.objectContaining({
          config: JSON.stringify({
            rankingType: "views",
            timeRange: "month",
            seriesType: "comic",
            adult: true,
            maxItems: 50,
            active: false,
          }),
        }),
      }),
    );
    expect(result.active).toBe(false);
    expect(cacheService.deletePatterns).toHaveBeenCalled();
  });

  it("filters analytics queries by slot and series", async () => {
    await service.getRecommendationAnalytics({
      slot: "homepage-banner",
      seriesId: "series-1",
      limit: 50,
      offset: 0,
    });

    expect(prisma.recommendationAnalytics.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slot: "homepage-banner",
          seriesId: "series-1",
        }),
      }),
    );
  });

  it("uses truthful series ordering for deprecated rating requests and trending requests", async () => {
    await service.getPopularSeries({ rankingType: "rating" });
    expect(prisma.series.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orderBy: [{ follows: { _count: "desc" } }, { updatedAt: "desc" }],
      }),
    );

    await service.getPopularSeries({ rankingType: "trending" });
    expect(prisma.series.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
    );
  });
});
