import { SeriesController } from "./series.controller";
import { SeriesService } from "./series.service";
import { PrismaService } from "../../common/prisma/prisma.service";

describe("SeriesController", () => {
  let controller: SeriesController;
  let seriesService: { detail: jest.Mock };
  let prisma: { subscription: { findUnique: jest.Mock } };

  beforeEach(() => {
    seriesService = {
      detail: jest.fn(),
    };
    prisma = {
      subscription: {
        findUnique: jest.fn(),
      },
    };

    controller = new SeriesController(
      seriesService as unknown as SeriesService,
      prisma as unknown as PrismaService
    );
  });

  it("should skip subscription lookup for guest request", async () => {
    const expected = { series: { adult: false }, episodes: [] };
    seriesService.detail.mockResolvedValue(expected);

    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    const result = await controller.detail("series-001", "0", req, res);

    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
    expect(seriesService.detail).toHaveBeenCalledWith("series-001", null);
    expect(result).toEqual(expected);
  });
});

