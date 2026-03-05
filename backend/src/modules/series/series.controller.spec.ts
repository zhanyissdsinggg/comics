import { SeriesController } from "./series.controller";
import { SeriesService } from "./series.service";
import { PrismaService } from "../../common/prisma/prisma.service";

describe("SeriesController", () => {
  let controller: SeriesController;
  let seriesService: { detail: jest.Mock; list: jest.Mock };
  let prisma: { subscription: { findUnique: jest.Mock } };

  beforeEach(() => {
    seriesService = {
      detail: jest.fn(),
      list: jest.fn(),
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

  it("should degrade to fallback payload when detail query throws", async () => {
    seriesService.detail.mockRejectedValue(new Error("db error"));
    seriesService.list.mockResolvedValue([
      {
        id: "series-001",
        title: "Fallback Series",
        type: "comic",
        adult: false,
        latestEpisodeId: "series-001e3",
        pricing: {
          currency: "POINTS",
          episodePrice: 35,
          discount: 0,
        },
        ttf: {
          enabled: false,
          intervalHours: 24,
        },
      },
    ]);

    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    const result = await controller.detail("series-001", "0", req, res);
    const payload = result as any;

    expect(payload.series.id).toBe("series-001");
    expect(payload.series.title).toBe("Fallback Series");
    expect(Array.isArray(payload.episodes)).toBe(true);
    expect(payload.episodes).toHaveLength(3);
    expect(payload.episodes[0].id).toBe("series-001e1");
  });
});
