import { Prisma } from "@prisma/client";
import { EpisodeService } from "./episode.service";
import { PrismaService } from "../../common/prisma/prisma.service";

describe("EpisodeService", () => {
  let service: EpisodeService;
  let prisma: {
    series: { findUnique: jest.Mock };
    episode: { findUnique: jest.Mock };
    $queryRawUnsafe: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      series: { findUnique: jest.fn() },
      episode: { findUnique: jest.fn() },
      $queryRawUnsafe: jest.fn(),
    };

    service = new EpisodeService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns null for unpublished series", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: "series-001", type: "comic", isPublished: false });

    const result = await service.getEpisode("series-001", "series-001e1");

    expect(result).toBeNull();
    expect(prisma.episode.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the episode record does not exist", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: "series-001", type: "comic", isPublished: true });
    prisma.episode.findUnique.mockResolvedValue(null);

    const result = await service.getEpisode("series-001", "series-001e1");

    expect(result).toBeNull();
  });

  it("returns stored comic payload without generating placeholder pages", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: "series-001", type: "comic", isPublished: true });
    prisma.episode.findUnique.mockResolvedValue({
      id: "series-001e1",
      seriesId: "series-001",
      number: 1,
      title: "Episode 1",
      pages: [],
      paragraphs: null,
      text: null,
      previewFreePages: 0,
    });

    const result = await service.getEpisode("series-001", "series-001e1");

    expect(result).toEqual({
      episode: {
        id: "series-001e1",
        seriesId: "series-001",
        number: 1,
        title: "Episode 1",
        type: "comic",
        pages: [],
        previewFreePages: 0,
      },
    });
  });

  it("falls back when raw series visibility query raises a missing-column error", async () => {
    const rawMissingColumn = {
      code: "P2010",
      meta: { code: "42703", message: 'column "isPublished" does not exist' },
    } as unknown as Prisma.PrismaClientKnownRequestError;

    prisma.series.findUnique.mockRejectedValueOnce(rawMissingColumn);
    prisma.$queryRawUnsafe
      .mockRejectedValueOnce(rawMissingColumn)
      .mockResolvedValueOnce([{ id: "series-001", type: "comic" }]);
    prisma.episode.findUnique.mockResolvedValue({
      id: "series-001e1",
      seriesId: "series-001",
      number: 1,
      title: "Episode 1",
      pages: [{ url: "page-1" }],
      paragraphs: [],
      text: null,
      previewFreePages: 2,
    });

    const result = await service.getEpisode("series-001", "series-001e1");

    expect(result).toEqual({
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
  });
});
