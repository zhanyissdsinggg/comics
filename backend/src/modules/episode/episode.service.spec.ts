import { CacheService } from "../../common/cache/cache.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EpisodeService } from "./episode.service";

describe("EpisodeService", () => {
  let service: EpisodeService;
  let prisma: {
    episode: { findFirst: jest.Mock };
  };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      episode: {
        findFirst: jest.fn(),
      },
    };
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    service = new EpisodeService(prisma as unknown as PrismaService, cacheService as unknown as CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when the episode record does not exist", async () => {
    prisma.episode.findFirst.mockResolvedValue(null);

    await expect(service.getEpisode("series-001", "series-001e1")).resolves.toBeNull();
    expect(prisma.episode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "series-001e1",
          seriesId: "series-001",
          isDeleted: false,
          series: { isPublished: true },
        }),
      }),
    );
  });

  it("returns stored comic payload without generating placeholder pages", async () => {
    prisma.episode.findFirst.mockResolvedValue({
      id: "series-001e1",
      seriesId: "series-001",
      number: 1,
      title: "Episode 1",
      pages: [{ url: "page-1" }],
      paragraphs: null,
      text: null,
      previewFreePages: 2,
      series: {
        type: "comic",
      },
    });

    await expect(service.getEpisode("series-001", "series-001e1")).resolves.toEqual({
      episode: {
        id: "series-001e1",
        seriesId: "series-001",
        number: 1,
        title: "Episode 1",
        type: "comic",
        pages: [{ url: "page-1" }],
        previewFreePages: 2,
      },
    });
    expect(cacheService.set).toHaveBeenCalledWith(
      "episode:detail:series-001:series-001e1",
      expect.any(Object),
      180,
    );
  });

  it("returns normalized novel payloads from stored paragraphs", async () => {
    prisma.episode.findFirst.mockResolvedValue({
      id: "series-002e4",
      seriesId: "series-002",
      number: 4,
      title: "Chapter 4",
      pages: [],
      paragraphs: ["First paragraph", "Second paragraph"],
      text: null,
      previewFreePages: 0,
      series: {
        type: "novel",
      },
    });

    await expect(service.getEpisode("series-002", "series-002e4")).resolves.toEqual({
      episode: {
        id: "series-002e4",
        seriesId: "series-002",
        number: 4,
        title: "Chapter 4",
        type: "novel",
        paragraphs: ["First paragraph", "Second paragraph"],
        previewParagraphs: 3,
      },
    });
  });

  it("returns cached payloads without hitting Prisma again", async () => {
    cacheService.get.mockResolvedValue({
      episode: {
        id: "series-003e2",
        seriesId: "series-003",
        number: 2,
        title: "Episode 2",
        type: "comic",
        pages: [],
        previewFreePages: 0,
      },
    });

    await expect(service.getEpisode("series-003", "series-003e2")).resolves.toEqual({
      episode: {
        id: "series-003e2",
        seriesId: "series-003",
        number: 2,
        title: "Episode 2",
        type: "comic",
        pages: [],
        previewFreePages: 0,
      },
    });
    expect(prisma.episode.findFirst).not.toHaveBeenCalled();
  });
});
