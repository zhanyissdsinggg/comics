import { SeriesController } from "./series.controller";
import { SeriesService } from "./series.service";
import { PrismaService } from "../../common/prisma/prisma.service";

describe("SeriesController", () => {
  let controller: SeriesController;
  let seriesService: { detail: jest.Mock; detailCommerce: jest.Mock; list: jest.Mock };
  let prisma: Record<string, unknown>;

  beforeEach(() => {
    seriesService = {
      detail: jest.fn(),
      detailCommerce: jest.fn(),
      list: jest.fn(),
    };
    prisma = {};

    controller = new SeriesController(
      seriesService as unknown as SeriesService,
      prisma as unknown as PrismaService,
    );
  });

  it("loads public detail without subscription context", async () => {
    const expected = { series: { adult: false }, episodes: [] };
    seriesService.detail.mockResolvedValue(expected);

    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    await expect(controller.detail("series-001", "0", req, res)).resolves.toEqual(expected);
    expect(seriesService.detail).toHaveBeenCalledWith("series-001");
  });

  it("returns not found when the service returns null", async () => {
    seriesService.detail.mockResolvedValue(null);

    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    await expect(controller.detail("missing-series", "0", req, res)).resolves.toEqual(
      expect.objectContaining({
        error: "NOT_FOUND",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns internal error payload when detail loading throws", async () => {
    seriesService.detail.mockRejectedValue(new Error("db error"));

    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    await expect(controller.detail("series-001", "0", req, res)).resolves.toEqual(
      expect.objectContaining({
        error: "INTERNAL",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
