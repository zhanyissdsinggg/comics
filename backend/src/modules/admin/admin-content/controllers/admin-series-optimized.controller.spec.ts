import { Test, TestingModule } from "@nestjs/testing";
import { AdminSeriesController } from "./admin-series-optimized.controller";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { CrudService } from "../../services/crud.service";
import { FileProcessingService } from "../../services/file-processing.service";
import { SeriesSortBy } from "../dtos/admin-series-query.dto";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminAuditInterceptor } from "../../interceptors/admin-audit.interceptor";

describe("AdminSeriesController - Advanced Search", () => {
  let controller: AdminSeriesController;
  let prismaService: {
    series: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      series: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const builder = Test.createTestingModule({
      controllers: [AdminSeriesController],
      providers: [
        { provide: PrismaService, useValue: prismaService },
        { provide: CrudService, useValue: {} },
        { provide: FileProcessingService, useValue: {} },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });
    builder.overrideInterceptor(AdminAuditInterceptor).useValue({
      intercept: (_context: any, next: any) => next.handle(),
    });

    const module: TestingModule = await builder.compile();
    controller = module.get(AdminSeriesController);
  });

  it("returns paginated series list", async () => {
    prismaService.series.findMany.mockResolvedValue([
      {
        id: "series-1",
        title: "Series 1",
        description: "desc",
        type: "comic",
        status: "Ongoing",
        adult: false,
        rating: 4.5,
        ratingCount: 10,
        coverUrl: "https://example.com/1.jpg",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      },
      {
        id: "series-2",
        title: "Series 2",
        description: "desc",
        type: "novel",
        status: "Completed",
        adult: true,
        rating: 4.8,
        ratingCount: 20,
        coverUrl: "https://example.com/2.jpg",
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-04"),
      },
    ]);
    prismaService.series.count.mockResolvedValue(3);

    const result = await controller.advancedSearch({
      page: 1,
      limit: 2,
      sortBy: SeriesSortBy.CREATED_DESC,
    });

    expect(result.series).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.hasMore).toBe(true);
  });

  it("returns stats when includeStats=true", async () => {
    prismaService.series.findMany.mockResolvedValue([]);
    prismaService.series.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(8);

    const result = await controller.advancedSearch({
      page: 1,
      limit: 20,
      sortBy: SeriesSortBy.CREATED_DESC,
      includeStats: true,
    });

    expect(result.stats).toEqual({
      totalSeries: 12,
      adultCount: 4,
      generalCount: 8,
    });
  });
});
