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

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("list", () => {
    it("should return an array of series", async () => {
      const mockSeries = [
        { id: "series1", title: "Test Series 1" },
        { id: "series2", title: "Test Series 2" },
      ];

      jest.spyOn(prisma.series, "findMany").mockResolvedValue(mockSeries as never);

      const result = await controller.list();

      expect(result).toEqual({ series: mockSeries });
      expect(prisma.series.findMany).toHaveBeenCalledWith({ orderBy: { title: "asc" } });
    });
  });

  describe("create", () => {
    it("should create a new series", async () => {
      const mockSeries = {
        id: "test-series",
        title: "Test Series",
        type: "comic",
      };

      jest.spyOn(prisma.series, "create").mockResolvedValue(mockSeries as never);

      const result = await controller.create({ series: mockSeries });

      expect(result).toEqual({ series: mockSeries });
      expect(prisma.series.create).toHaveBeenCalled();
    });

    it("should throw error if series.id is missing", async () => {
      await expect(controller.create({ series: { title: "Test" } })).rejects.toThrow();
    });

    it("should throw conflict error when series id already exists", async () => {
      jest.spyOn(prisma.series, "create").mockRejectedValue({ code: "P2002" });

      await expect(
        controller.create({ series: { id: "duplicate-series", title: "Duplicate Series" } }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("update", () => {
    it("should update an existing series", async () => {
      const existingSeries = {
        id: "series-1",
        title: "Old Title",
        type: "comic",
        adult: false,
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
        adult: true,
      };

      jest.spyOn(prisma.series, "findUnique").mockResolvedValue(existingSeries as never);
      jest.spyOn(prisma.series, "update").mockResolvedValue(updatedSeries as never);

      const result = await controller.update(
        { series: { title: "New Title", adult: true } },
        { params: { id: "series-1" } } as never,
      );

      expect(result).toEqual({ series: updatedSeries });
      expect(prisma.series.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "series-1" },
          data: expect.objectContaining({
            id: "series-1",
            title: "New Title",
            adult: true,
            genres: ["Action"],
          }),
        }),
      );
    });

    it("should throw not found when updating a missing series", async () => {
      jest.spyOn(prisma.series, "findUnique").mockResolvedValue(null as never);

      await expect(
        controller.update({ series: { title: "Missing" } }, { params: { id: "missing" } } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete episodes before deleting the series", async () => {
      jest.spyOn(prisma.series, "findUnique").mockResolvedValue({ id: "series-1" } as never);
      jest.spyOn(prisma.episode, "deleteMany").mockResolvedValue({ count: 3 } as never);
      jest.spyOn(prisma.series, "delete").mockResolvedValue({ id: "series-1" } as never);

      const result = await controller.remove({ params: { id: "series-1" } } as never);

      expect(result).toEqual({ ok: true });
      expect(prisma.series.findUnique).toHaveBeenCalledWith({ where: { id: "series-1" } });
      expect(prisma.episode.deleteMany).toHaveBeenCalledWith({ where: { seriesId: "series-1" } });
      expect(prisma.series.delete).toHaveBeenCalledWith({ where: { id: "series-1" } });
    });

    it("should throw not found when deleting a missing series", async () => {
      jest.spyOn(prisma.series, "findUnique").mockResolvedValue(null as never);

      await expect(controller.remove({ params: { id: "missing" } } as never)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});