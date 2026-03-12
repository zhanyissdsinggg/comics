import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminSeriesController } from "./admin-series.controller";

describe("AdminSeriesController", () => {
  let controller: AdminSeriesController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [AdminSeriesController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            series: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            episode: {
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get<AdminSeriesController>(AdminSeriesController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("is defined", () => {
    expect(controller).toBeDefined();
  });

  it("lists series in ascending title order", async () => {
    const mockSeries = [
      { id: "series-1", title: "A Title" },
      { id: "series-2", title: "B Title" },
    ];

    jest.spyOn(prisma.series, "findMany").mockResolvedValue(mockSeries as never);

    await expect(controller.list()).resolves.toEqual({ series: mockSeries });
    expect(prisma.series.findMany).toHaveBeenCalledWith({ orderBy: { title: "asc" } });
  });

  it("creates a series and persists publish state", async () => {
    const createdSeries = {
      id: "test-series",
      title: "Test Series",
      type: "comic",
      isPublished: false,
    };

    jest.spyOn(prisma.series, "create").mockResolvedValue(createdSeries as never);

    const result = await controller.create({
      series: {
        id: "test-series",
        title: "Test Series",
        isPublished: false,
      },
    });

    expect(result).toEqual({ series: createdSeries });
    expect(prisma.series.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "test-series",
        title: "Test Series",
        isPublished: false,
      }),
    });
  });

  it("throws when series id is missing during create", async () => {
    await expect(controller.create({ series: { title: "Missing ID" } })).rejects.toThrow();
  });

  it("throws conflict when series id already exists", async () => {
    jest.spyOn(prisma.series, "create").mockRejectedValue({ code: "P2002" });

    await expect(
      controller.create({ series: { id: "duplicate-series", title: "Duplicate Series" } }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("supports publish status filtering in advanced search", async () => {
    const mockSeries = [{ id: "series-1", title: "Published", isPublished: true }];
    jest.spyOn(prisma.series, "findMany").mockResolvedValue(mockSeries as never);
    jest.spyOn(prisma.series, "count").mockResolvedValue(1 as never);

    const result = await controller.advancedSearch({
      publishStatus: "published",
      page: "1",
      limit: "20",
      sortBy: "createdAt_desc",
    });

    expect(result.series).toEqual(mockSeries);
    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true }),
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

    jest.spyOn(prisma.series, "findUnique").mockResolvedValue(existingSeries as never);
    jest.spyOn(prisma.series, "update").mockResolvedValue(updatedSeries as never);

    const result = await controller.update(
      { series: { title: "New Title", isPublished: false } },
      { params: { id: "series-1" } } as never,
    );

    expect(result).toEqual({ series: updatedSeries });
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
      controller.update({ series: { title: "Missing" } }, { params: { id: "missing" } } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it("deletes episodes before deleting the series", async () => {
    jest.spyOn(prisma.series, "findUnique").mockResolvedValue({ id: "series-1" } as never);
    jest.spyOn(prisma.episode, "deleteMany").mockResolvedValue({ count: 3 } as never);
    jest.spyOn(prisma.series, "delete").mockResolvedValue({ id: "series-1" } as never);

    const result = await controller.remove({ params: { id: "series-1" } } as never);

    expect(result).toEqual({ ok: true });
    expect(prisma.series.findUnique).toHaveBeenCalledWith({ where: { id: "series-1" } });
    expect(prisma.episode.deleteMany).toHaveBeenCalledWith({ where: { seriesId: "series-1" } });
    expect(prisma.series.delete).toHaveBeenCalledWith({ where: { id: "series-1" } });
  });

  it("throws not found when deleting a missing series", async () => {
    jest.spyOn(prisma.series, "findUnique").mockResolvedValue(null as never);

    await expect(controller.remove({ params: { id: "missing" } } as never)).rejects.toThrow(
      NotFoundException,
    );
  });
});
