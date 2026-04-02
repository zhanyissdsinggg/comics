import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { CreatorCreditsService } from "../../../common/creators/creator-credits.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminCreatorsService } from "../admin-content/services/admin-creators.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminSeriesController } from "./admin-series.controller";

describe("AdminSeriesController", () => {
  let controller: AdminSeriesController;
  let prisma: PrismaService;
  let adminCreatorsService: AdminCreatorsService;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [AdminSeriesController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRawUnsafe: jest.fn().mockResolvedValue([]),
            series: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            episode: {
              findMany: jest.fn().mockResolvedValue([]),
              deleteMany: jest.fn(),
            },
            follow: {
              groupBy: jest.fn().mockResolvedValue([]),
            },
            seriesViewStat: {
              groupBy: jest.fn().mockResolvedValue([]),
            },
          },
        },
        {
          provide: ContentCacheInvalidationService,
          useValue: {
            invalidateSeriesContent: jest.fn().mockResolvedValue(undefined),
            invalidateDiscoveryConfiguration: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: CreatorCreditsService,
          useValue: {
            getCreditsMap: jest.fn().mockResolvedValue(new Map()),
            buildIdentity: jest.fn().mockReturnValue({
              label: "Creator details coming soon",
              type: "fallback",
              isFallback: true,
            }),
            syncPrimaryCreditFromAuthorField: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: AdminCreatorsService,
          useValue: {
            getSeriesCredits: jest.fn(),
            updateSeriesCredits: jest.fn(),
          },
        },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get<AdminSeriesController>(AdminSeriesController);
    prisma = module.get<PrismaService>(PrismaService);
    adminCreatorsService = module.get<AdminCreatorsService>(AdminCreatorsService);
  });

  it("is defined", () => {
    expect(controller).toBeDefined();
  });

  it("lists series in ascending title order", async () => {
    const mockSeries = [
      { id: "series-1", title: "A Title", _count: { episodes: 3 } },
      { id: "series-2", title: "B Title", _count: { episodes: 0 } },
    ];

    jest
      .spyOn(prisma.series, "findMany")
      .mockResolvedValue(mockSeries as never);

    await expect(controller.list()).resolves.toEqual({
      series: [
        expect.objectContaining({
          id: "series-1",
          title: "A Title",
          _count: { episodes: 3 },
          episodeCount: 3,
        }),
        expect.objectContaining({
          id: "series-2",
          title: "B Title",
          _count: { episodes: 0 },
          episodeCount: 0,
        }),
      ],
    });
    expect(prisma.series.findMany).toHaveBeenCalledWith({
      orderBy: { title: "asc" },
      where: {},
      select: {
        _count: {
          select: {
            episodes: true,
          },
        },
        adult: true,
        author: true,
        badge: true,
        badges: true,
        coverTone: true,
        coverUrl: true,
        createdAt: true,
        description: true,
        episodePrice: true,
        genres: true,
        id: true,
        isPublished: true,
        latestEpisodeId: true,
        rating: true,
        ratingCount: true,
        status: true,
        title: true,
        ttfEnabled: true,
        ttfIntervalHours: true,
        type: true,
        updatedAt: true,
      },
    });
  });

  it("supports paginated list requests without loading the full catalog", async () => {
    jest.spyOn(prisma.series, "findMany").mockResolvedValue([
      { id: "series-1", title: "Paged Title", _count: { episodes: 2 } },
    ] as never);
    jest.spyOn(prisma.series, "count").mockResolvedValue(25 as never);

    const result = await controller.list({
      query: {
        page: "2",
        pageSize: "10",
      },
    } as never);

    expect(result).toEqual({
      series: [
        expect.objectContaining({
          id: "series-1",
          title: "Paged Title",
          episodeCount: 2,
        }),
      ],
      pagination: expect.objectContaining({
        page: 2,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      }),
    });
    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 10,
      }),
    );
    expect(prisma.series.count).toHaveBeenCalledWith({ where: {} });
  });

  it("creates a series and persists publish state", async () => {
    const createdSeries = {
      id: "test-series",
      title: "Test Series",
      type: "comic",
      isPublished: false,
    };

    jest
      .spyOn(prisma.series, "create")
      .mockResolvedValue(createdSeries as never);

    const result = await controller.create({
      series: {
        id: "test-series",
        title: "Test Series",
        isPublished: false,
      },
    });

    expect(result).toEqual({ series: expect.objectContaining(createdSeries) });
    expect(prisma.series.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "test-series",
        title: "Test Series",
        isPublished: false,
      }),
    });
    expect(prisma.series.findUnique).toHaveBeenCalled();
  });

  it("throws when series id is missing during create", async () => {
    await expect(
      controller.create({ series: { title: "Missing ID" } }),
    ).rejects.toThrow();
  });

  it("throws conflict when series id already exists", async () => {
    jest.spyOn(prisma.series, "create").mockRejectedValue({ code: "P2002" });

    await expect(
      controller.create({
        series: { id: "duplicate-series", title: "Duplicate Series" },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("supports publish status filtering in advanced search", async () => {
    const mockSeries = [
      {
        id: "series-1",
        title: "Published",
        isPublished: true,
        _count: { episodes: 5 },
      },
    ];
    jest
      .spyOn(prisma.series, "findMany")
      .mockResolvedValue(mockSeries as never);
    jest.spyOn(prisma.series, "count").mockResolvedValue(1 as never);

    const result = await controller.advancedSearch({
      publishStatus: "published",
      page: "1",
      limit: "20",
      sortBy: "createdAt_desc",
    });

    expect(result.series).toEqual([
      expect.objectContaining({
        id: "series-1",
        title: "Published",
        isPublished: true,
        _count: { episodes: 5 },
        episodeCount: 5,
      }),
    ]);
    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true }),
        select: {
          _count: {
            select: {
              episodes: true,
            },
          },
          adult: true,
          author: true,
          badge: true,
          badges: true,
          coverTone: true,
          coverUrl: true,
          createdAt: true,
          description: true,
          episodePrice: true,
          genres: true,
          id: true,
          isPublished: true,
          latestEpisodeId: true,
          rating: true,
          ratingCount: true,
          status: true,
          title: true,
          ttfEnabled: true,
          ttfIntervalHours: true,
          type: true,
          updatedAt: true,
        },
      }),
    );
    expect(prisma.series.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ isPublished: true }),
    });
  });

  it("updates an existing series and keeps publish state mutable", async () => {
    const existingSeries = {
      id: "series-1",
      title: "Old Title",
      type: "comic",
      adult: false,
      isPublished: true,
      genres: ["Action"],
      badge: "HOT",
      badges: ["HOT"],
      status: "Ongoing",
      rating: 4.5,
      ratingCount: 100,
      description: "Old description",
      episodePrice: 3,
      ttfEnabled: true,
      ttfIntervalHours: 24,
      latestEpisodeId: "ep-1",
    };
    const updatedSeries = {
      ...existingSeries,
      title: "New Title",
      isPublished: false,
    };

    jest
      .spyOn(prisma.series, "findUnique")
      .mockResolvedValueOnce(existingSeries as never)
      .mockResolvedValueOnce({
        ...updatedSeries,
        _count: { episodes: 0 },
      } as never);
    jest
      .spyOn(prisma.series, "update")
      .mockResolvedValue(updatedSeries as never);

    const result = await controller.update(
      { series: { title: "New Title", isPublished: false } },
      { params: { id: "series-1" } } as never,
    );

    expect(result).toEqual({ series: expect.objectContaining(updatedSeries) });
    expect(prisma.series.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "series-1" },
        data: expect.objectContaining({
          id: "series-1",
          title: "New Title",
          isPublished: false,
          genres: ["Action"],
        }),
      }),
    );
  });

  it("throws not found when updating a missing series", async () => {
    jest.spyOn(prisma.series, "findUnique").mockResolvedValue(null as never);

    await expect(
      controller.update({ series: { title: "Missing" } }, {
        params: { id: "missing" },
      } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it("deletes episodes before deleting the series", async () => {
    jest
      .spyOn(prisma.series, "findUnique")
      .mockResolvedValue({ id: "series-1" } as never);
    jest
      .spyOn(prisma.episode, "deleteMany")
      .mockResolvedValue({ count: 3 } as never);
    jest
      .spyOn(prisma.series, "delete")
      .mockResolvedValue({ id: "series-1" } as never);

    const result = await controller.remove({
      params: { id: "series-1" },
    } as never);

    expect(result).toEqual({ ok: true });
    expect(prisma.series.findUnique).toHaveBeenCalledWith({
      where: { id: "series-1" },
    });
    expect(prisma.episode.deleteMany).toHaveBeenCalledWith({
      where: { seriesId: "series-1" },
    });
    expect(prisma.series.delete).toHaveBeenCalledWith({
      where: { id: "series-1" },
    });
  });

  it("throws not found when deleting a missing series", async () => {
    jest.spyOn(prisma.series, "findUnique").mockResolvedValue(null as never);

    await expect(
      controller.remove({ params: { id: "missing" } } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns series credits from the dedicated admin creators service", async () => {
    jest.spyOn(prisma.series, "findUnique").mockResolvedValue({ id: "series-1" } as never);
    jest.spyOn(adminCreatorsService, "getSeriesCredits").mockResolvedValue({
      credits: [
        {
          id: "credit-1",
          creatorId: "creator-1",
          slug: "studio-north",
          name: "Studio North",
          normalizedName: "studio north",
          type: "studio",
          role: "studio",
          source: "admin_credit_editor",
          sortOrder: 0,
          isPrimary: true,
          isPublic: true,
        },
      ],
      creator: {
        label: "Studio North",
        slug: "studio-north",
        type: "studio",
        isFallback: false,
      },
      author: "Studio North",
    } as never);

    await expect(
      controller.detailCredits({ params: { id: "series-1" } } as never),
    ).resolves.toEqual(
      expect.objectContaining({
        credits: [expect.objectContaining({ name: "Studio North" })],
        author: "Studio North",
      }),
    );
    expect(adminCreatorsService.getSeriesCredits).toHaveBeenCalledWith("series-1");
  });

  it("updates series credits through the admin creators service", async () => {
    jest.spyOn(prisma.series, "findUnique").mockResolvedValue({ id: "series-1" } as never);
    jest.spyOn(adminCreatorsService, "updateSeriesCredits").mockResolvedValue({
      credits: [],
      publicCredits: [],
      creator: {
        label: "Creator details coming soon",
        type: "fallback",
        isFallback: true,
      },
      author: "",
    } as never);

    await expect(
      controller.updateCredits(
        {
          credits: [
            {
              name: "Studio North",
              role: "STUDIO",
              type: "studio",
              sortOrder: 0,
              isPrimary: true,
              isPublic: true,
            },
          ],
        },
        { params: { id: "series-1" } } as never,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        credits: [],
        publicCredits: [],
      }),
    );

    expect(adminCreatorsService.updateSeriesCredits).toHaveBeenCalledWith("series-1", [
      expect.objectContaining({
        name: "Studio North",
        role: "STUDIO",
        type: "studio",
        isPrimary: true,
        isPublic: true,
      }),
    ]);
  });
});
