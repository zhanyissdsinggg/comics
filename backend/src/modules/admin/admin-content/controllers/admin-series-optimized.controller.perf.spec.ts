import { Test, TestingModule } from "@nestjs/testing";
import { AdminSeriesController } from "./admin-series-optimized.controller";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { CrudService } from "../../services/crud.service";
import { FileProcessingService } from "../../services/file-processing.service";
import { SeriesSortBy } from "../dtos/admin-series-query.dto";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminAuditInterceptor } from "../../interceptors/admin-audit.interceptor";

describe("AdminSeriesController - Perf", () => {
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

  it("handles concurrent advancedSearch calls", async () => {
    const rows = Array.from({ length: 20 }).map((_, index) => ({
      id: `series-${index}`,
      title: `Series ${index}`,
      description: "desc",
      type: index % 2 === 0 ? "comic" : "novel",
      status: "Ongoing",
      adult: false,
      rating: 4.2,
      ratingCount: 10,
      coverUrl: "https://example.com/cover.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    prismaService.series.findMany.mockResolvedValue(rows);
    prismaService.series.count.mockResolvedValue(200);

    const start = Date.now();
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((page) =>
        controller.advancedSearch({
          page,
          limit: 20,
          sortBy: SeriesSortBy.CREATED_DESC,
        })
      )
    );
    const elapsed = Date.now() - start;

    expect(results).toHaveLength(5);
    results.forEach((result) => {
      expect(result.series).toHaveLength(20);
      expect(result.total).toBe(200);
    });
    expect(elapsed).toBeLessThan(1000);
  });

  it("supports rating sort branch", async () => {
    prismaService.series.findMany.mockResolvedValue([]);
    prismaService.series.count.mockResolvedValue(0);

    const result = await controller.advancedSearch({
      page: 1,
      limit: 50,
      sortBy: SeriesSortBy.RATING_DESC,
    });

    expect(result.total).toBe(0);
    expect(result.series).toEqual([]);
  });
});
