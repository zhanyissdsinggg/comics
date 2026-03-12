import { PrismaService } from "../../common/prisma/prisma.service";
import { StatsService } from "../../common/services/stats.service";
import { ERROR_CODES } from "../../common/utils/errors";
import { EpisodeController } from "./episode.controller";
import { EpisodeService } from "./episode.service";

describe("EpisodeController", () => {
  let controller: EpisodeController;
  let episodeService: { getEpisode: jest.Mock };
  let prisma: {
    series: { findUnique: jest.Mock };
    entitlement: { findUnique: jest.Mock };
  };
  let statsService: {
    recordSeriesView: jest.Mock;
    recordComicView: jest.Mock;
  };

  beforeEach(() => {
    episodeService = {
      getEpisode: jest.fn(),
    };
    prisma = {
      series: {
        findUnique: jest.fn(),
      },
      entitlement: {
        findUnique: jest.fn(),
      },
    };
    statsService = {
      recordSeriesView: jest.fn(),
      recordComicView: jest.fn(),
    };

    controller = new EpisodeController(
      episodeService as unknown as EpisodeService,
      prisma as unknown as PrismaService,
      statsService as unknown as StatsService,
    );
  });

  it("returns 400 when episodeId is missing", async () => {
    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    const result = await controller.getEpisode("series-001", "", req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(result).toEqual({
      error: ERROR_CODES.INVALID_REQUEST,
      message: "episodeId is required",
    });
  });

  it("returns 404 for unpublished series", async () => {
    prisma.series.findUnique.mockResolvedValue({
      id: "series-001",
      adult: false,
      type: "comic",
      isPublished: false,
    });

    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    const result = await controller.getEpisode("series-001", "series-001e1", req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(result).toEqual({ error: ERROR_CODES.NOT_FOUND });
    expect(episodeService.getEpisode).not.toHaveBeenCalled();
  });

  it("ignores stats failure and still returns episode payload", async () => {
    prisma.series.findUnique.mockResolvedValue({
      id: "series-001",
      adult: false,
      type: "comic",
      isPublished: true,
    });
    prisma.entitlement.findUnique.mockResolvedValue(null);
    episodeService.getEpisode.mockResolvedValue({
      episode: {
        id: "series-001e1",
        pages: [{ p: 1 }, { p: 2 }, { p: 3 }, { p: 4 }],
        previewFreePages: 2,
      },
    });
    statsService.recordSeriesView.mockRejectedValue(new Error("stats unavailable"));

    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    const result = await controller.getEpisode("series-001", "series-001e1", req, res);
    const payload = result as any;

    expect(payload.episode.pages).toHaveLength(2);
    expect(payload.episode.isPreview).toBe(true);
    expect(payload.episode.previewCount).toBe(2);
    expect(statsService.recordComicView).not.toHaveBeenCalled();
  });

  it("preserves zero preview pages instead of forcing a default preview", async () => {
    prisma.series.findUnique.mockResolvedValue({
      id: "series-001",
      adult: false,
      type: "comic",
      isPublished: true,
    });
    prisma.entitlement.findUnique.mockResolvedValue(null);
    episodeService.getEpisode.mockResolvedValue({
      episode: {
        id: "series-001e1",
        pages: [{ p: 1 }, { p: 2 }],
        previewFreePages: 0,
      },
    });

    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    const result = await controller.getEpisode("series-001", "series-001e1", req, res);
    const payload = result as any;

    expect(payload.episode.pages).toEqual([]);
    expect(payload.episode.previewCount).toBe(0);
    expect(payload.episode.isPreview).toBe(true);
  });

  it("returns an internal error instead of fake content when the episode service crashes", async () => {
    prisma.series.findUnique.mockResolvedValue({
      id: "series-001",
      adult: false,
      type: "comic",
      isPublished: true,
    });
    prisma.entitlement.findUnique.mockResolvedValue(null);
    episodeService.getEpisode.mockRejectedValue(new Error("unexpected db failure"));

    const req = { cookies: {} } as any;
    const res = { status: jest.fn() } as any;

    const result = await controller.getEpisode("series-001", "series-001e9", req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(result).toEqual({
      error: ERROR_CODES.INTERNAL,
      message: "Failed to load episode.",
    });
  });
});