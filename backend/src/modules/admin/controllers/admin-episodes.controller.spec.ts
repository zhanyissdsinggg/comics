import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminEpisodesController } from "./admin-episodes.controller";

describe("AdminEpisodesController", () => {
  let controller: AdminEpisodesController;
  let prisma: {
    episode: Record<string, jest.Mock>;
    series: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let contentCacheInvalidation: {
    invalidateSeriesContent: jest.Mock;
  };

  const existingEpisode = {
    id: "series-1e7",
    seriesId: "series-1",
    number: 7,
    title: "Original Episode",
    releasedAt: new Date("2024-01-01T00:00:00.000Z"),
    pricePts: 25,
    ttfEligible: true,
    ttfReadyAt: new Date("2024-01-02T00:00:00.000Z"),
    previewFreePages: 3,
    pages: [{ src: "page-1.jpg" }],
    paragraphs: ["paragraph-1"],
    text: "original text",
    isDeleted: false,
  };

  beforeEach(async () => {
    const episodeDelegate = {
      findFirst: jest.fn().mockResolvedValue({ id: "series-1e7" }),
      findMany: jest.fn().mockResolvedValue([existingEpisode]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockResolvedValue(existingEpisode),
      upsert: jest.fn().mockResolvedValue(existingEpisode),
      update: jest.fn().mockResolvedValue(existingEpisode),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const seriesDelegate = {
      update: jest
        .fn()
        .mockResolvedValue({ id: "series-1", latestEpisodeId: "series-1e7" }),
    };

    prisma = {
      episode: episodeDelegate,
      series: seriesDelegate,
      $transaction: jest.fn(async (callback) =>
        callback({
          episode: {
            update: episodeDelegate.update,
          },
        }),
      ),
    };

    contentCacheInvalidation = {
      invalidateSeriesContent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminEpisodesController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue("token"),
            verify: jest.fn().mockReturnValue({ sub: "admin", role: "admin" }),
          },
        },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ContentCacheInvalidationService,
          useValue: contentCacheInvalidation,
        },
      ],
    }).compile();

    controller = module.get(AdminEpisodesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("accepts flat create payloads from the admin frontend", async () => {
    prisma.episode.findUnique.mockResolvedValueOnce(null);
    prisma.episode.findMany
      .mockResolvedValueOnce([{ id: "series-1e1", number: 1 }])
      .mockResolvedValueOnce([]);

    await controller.createEpisode(
      {
        number: 2,
        title: "Flat Payload Episode",
        pricePts: 10,
        previewFreePages: 1,
        ttfEligible: true,
        pages: [{ src: "page-1.jpg" }],
        paragraphs: ["line-1"],
        text: "body",
      },
      { params: { id: "series-1" } } as never,
    );

    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "series-1e2" },
        create: expect.objectContaining({
          id: "series-1e2",
          seriesId: "series-1",
          number: 2,
          title: "Flat Payload Episode",
        }),
      }),
    );
    expect(
      contentCacheInvalidation.invalidateSeriesContent,
    ).toHaveBeenCalledWith("series-1", "admin-episode-change");
  });

  it("supports search filters sorting and pagination when listing episodes", async () => {
    prisma.episode.findMany.mockResolvedValueOnce([
      { ...existingEpisode, id: "series-1e9", number: 9 },
    ]);
    prisma.episode.count.mockResolvedValueOnce(5);

    const result = await controller.listEpisodes({
      params: { id: "series-1" },
      query: {
        search: "premium",
        priceType: "paid",
        previewStatus: "enabled",
        ttfEligible: "true",
        sortBy: "pricePts",
        sortOrder: "desc",
        page: "2",
        pageSize: "1",
      },
    } as never);

    expect(prisma.episode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          seriesId: "series-1",
          isDeleted: false,
          pricePts: { gt: 0 },
          previewFreePages: { gt: 0 },
          ttfEligible: true,
        }),
        orderBy: { pricePts: "desc" },
        skip: 1,
        take: 1,
      }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 1,
      total: 5,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });

  it("preserves existing fields during partial updates", async () => {
    prisma.episode.findUnique.mockResolvedValueOnce(existingEpisode);

    await controller.updateEpisode({ title: "Updated Episode" }, {
      params: { id: "series-1", episodeId: "series-1e7" },
    } as never);

    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "series-1e7" },
        data: expect.objectContaining({
          seriesId: "series-1",
          number: 7,
          title: "Updated Episode",
          pricePts: 25,
          previewFreePages: 3,
        }),
      }),
    );
    expect(
      contentCacheInvalidation.invalidateSeriesContent,
    ).toHaveBeenCalledWith("series-1", "admin-episode-change");
  });

  it("reorders selected episodes inside a transaction and syncs latest metadata", async () => {
    prisma.episode.findMany
      .mockResolvedValueOnce([
        { id: "series-1e1", seriesId: "series-1" },
        { id: "series-1e2", seriesId: "series-1" },
      ])
      .mockResolvedValueOnce([
        { ...existingEpisode, id: "series-1e2", number: 1 },
        { ...existingEpisode, id: "series-1e1", number: 2 },
      ]);
    prisma.episode.findFirst.mockResolvedValueOnce({ id: "series-1e1" });

    const result = await controller.reorderEpisodes(
      {
        items: [
          { id: "series-1e1", number: 2 },
          { id: "series-1e2", number: 1 },
        ],
      },
      { params: { id: "series-1" } } as never,
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.series.update).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: { latestEpisodeId: "series-1e1" },
    });
    expect(result.episodes).toHaveLength(2);
  });

  it("clears latestEpisodeId when the final episode is deleted", async () => {
    prisma.episode.deleteMany.mockResolvedValueOnce({ count: 1 });
    prisma.episode.findFirst.mockResolvedValueOnce(null);
    prisma.episode.findMany.mockResolvedValueOnce([]);

    const result = await controller.removeEpisode({
      params: { id: "series-1", episodeId: "series-1e7" },
    } as never);

    expect(prisma.series.update).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: { latestEpisodeId: null },
    });
    expect(result).toEqual({ episodes: [] });
    expect(
      contentCacheInvalidation.invalidateSeriesContent,
    ).toHaveBeenCalledWith("series-1", "admin-episode-change");
  });
});
