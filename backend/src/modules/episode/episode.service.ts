import { Injectable } from "@nestjs/common";
import { CacheService } from "../../common/cache/cache.service";
import { PrismaService } from "../../common/prisma/prisma.service";

type EpisodePayload =
  | {
      episode: {
        id: string;
        seriesId: string;
        number: number;
        title: string;
        type: "novel";
        paragraphs: string[];
        previewParagraphs: number;
      };
    }
  | {
      episode: {
        id: string;
        seriesId: string;
        number: number;
        title: string;
        type: "comic";
        pages: Array<Record<string, unknown>>;
        previewFreePages: number;
      };
    };

function normalizeEpisodePages(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>
      : [];
  } catch {
    return [];
  }
}

function normalizeParagraphs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

@Injectable()
export class EpisodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getEpisode(seriesId: string, episodeId: string) {
    const cacheKey = `episode:detail:${seriesId}:${episodeId}`;
    const cached = await this.cacheService.get<EpisodePayload>(cacheKey);
    if (cached) {
      return cached;
    }

    const stored = await this.prisma.episode.findFirst({
      where: {
        id: episodeId,
        seriesId,
        isDeleted: false,
        series: {
          isPublished: true,
        },
      },
      select: {
        id: true,
        seriesId: true,
        number: true,
        title: true,
        pages: true,
        paragraphs: true,
        text: true,
        previewFreePages: true,
        series: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!stored) {
      return null;
    }

    const number = Number(stored.number || 0);
    const title = String(stored.title || `Episode ${number || 1}`);
    const seriesType = String(stored.series?.type || "comic").toLowerCase();

    if (seriesType === "novel") {
      const payload = {
        episode: {
          id: stored.id,
          seriesId: stored.seriesId,
          number,
          title,
          type: "novel",
          paragraphs: normalizeParagraphs(stored.paragraphs ?? stored.text),
          previewParagraphs: 3,
        },
      };
      await this.cacheService.set(cacheKey, payload, 180);
      return payload;
    }

    const payload = {
      episode: {
        id: stored.id,
        seriesId: stored.seriesId,
        number,
        title,
        type: "comic",
        pages: normalizeEpisodePages(stored.pages),
        previewFreePages: Math.max(0, Number(stored.previewFreePages || 0)),
      },
    };
    await this.cacheService.set(cacheKey, payload, 180);
    return payload;
  }
}
