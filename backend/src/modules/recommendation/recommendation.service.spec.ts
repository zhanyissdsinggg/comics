import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RecommendationService } from "./recommendation.service";

describe("RecommendationService", () => {
  let service: RecommendationService;
  const prisma = {
    series: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    progress: {
      findMany: jest.fn(),
    },
    follow: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    Object.values(prisma).forEach((group) => {
      Object.values(group).forEach((mockFn) => mockFn.mockReset());
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
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

  it("filters unpublished recommendation candidates", async () => {
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
        description: "Visible",
        coverTone: "warm",
        type: "comic",
        genres: ["Romance"],
        rating: 4.8,
        ratingCount: 100,
        status: "Ongoing",
        badges: [],
        adult: false,
        isPublished: true,
        episodePrice: 3,
        ttfEnabled: true,
        _count: { follows: 12, episodes: 40 },
      },
      {
        id: "series-3",
        title: "Hidden Match",
        description: "Hidden",
        coverTone: "dark",
        type: "comic",
        genres: ["Romance"],
        rating: 5,
        ratingCount: 999,
        status: "Ongoing",
        badges: [],
        adult: false,
        isPublished: false,
        episodePrice: 4,
        ttfEnabled: true,
        _count: { follows: 120, episodes: 40 },
      },
    ]);

    const result = await service.getContentBasedRecommendations("series-1", 5);

    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ isPublished: true }]),
        }),
      }),
    );
    expect(result.map((item) => item.id)).toEqual(["series-2"]);
  });

  it("only returns published titles from the popular fallback", async () => {
    prisma.series.findMany.mockResolvedValue([
      {
        id: "series-1",
        title: "Visible",
        description: "Visible",
        coverTone: "warm",
        type: "comic",
        genres: ["Action"],
        rating: 4.6,
        ratingCount: 60,
        status: "Completed",
        badges: [],
        adult: false,
        isPublished: true,
        episodePrice: 3,
        ttfEnabled: false,
        _count: { follows: 10, episodes: 30 },
      },
      {
        id: "series-2",
        title: "Hidden",
        description: "Hidden",
        coverTone: "cool",
        type: "comic",
        genres: ["Action"],
        rating: 5,
        ratingCount: 600,
        status: "Completed",
        badges: [],
        adult: false,
        isPublished: false,
        episodePrice: 4,
        ttfEnabled: true,
        _count: { follows: 100, episodes: 80 },
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
  });
});
