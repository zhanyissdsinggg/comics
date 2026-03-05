import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class EpisodeService {
  private readonly logger = new Logger(EpisodeService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isSchemaDriftError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === "P2021" || error.code === "P2022";
    }

    const message = String((error as { message?: string }).message || "");
    return message.includes("does not exist") || message.includes("Unknown column");
  }

  private async findSeriesType(seriesId: string): Promise<{ id: string; type: string } | null> {
    try {
      const row = await this.prisma.series.findUnique({
        where: { id: seriesId },
        select: { id: true, type: true },
      });
      if (!row) {
        return null;
      }
      return {
        id: String(row.id || ""),
        type: String(row.type || "comic"),
      };
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Series type query failed for ${seriesId}, switching to compatibility mode.`,
      );
    }

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT "id", "type" FROM "series" WHERE "id" = $1 LIMIT 1`,
        seriesId,
      );
      if (!rows.length) {
        return null;
      }
      return {
        id: String(rows[0].id || ""),
        type: String(rows[0].type || "comic"),
      };
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(`Series compatibility query failed for ${seriesId}.`);
      return null;
    }
  }

  private async findStoredEpisode(episodeId: string): Promise<any> {
    try {
      return await this.prisma.episode.findUnique({
        where: { id: episodeId },
        select: {
          id: true,
          seriesId: true,
          number: true,
          title: true,
          pages: true,
          paragraphs: true,
          text: true,
        },
      });
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(`Episode full query failed for ${episodeId}, switching to compatibility mode.`);
    }

    try {
      return await this.prisma.episode.findUnique({
        where: { id: episodeId },
        select: {
          id: true,
          seriesId: true,
          number: true,
          title: true,
          text: true,
        },
      });
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(`Episode compatibility query failed for ${episodeId}, using generated fallback.`);
      return null;
    }
  }

  async getEpisode(seriesId: string, episodeId: string) {
    const series = await this.findSeriesType(seriesId);
    if (!series) {
      return null;
    }
    const stored = await this.findStoredEpisode(episodeId);
    const hasPages = Array.isArray(stored?.pages) && stored.pages.length > 0;
    const hasParagraphs = Array.isArray(stored?.paragraphs) && stored.paragraphs.length > 0;
    if (hasPages || hasParagraphs || stored?.text) {
      if (series.type === "novel") {
        const paragraphs =
          (Array.isArray(stored.paragraphs) ? stored.paragraphs : stored.paragraphs || []) ||
          String(stored.text || "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        return {
          episode: {
            id: stored.id,
            seriesId,
            number: stored.number,
            title: stored.title,
            type: "novel",
            paragraphs,
            previewParagraphs: 3,
          },
        };
      }
      return {
        episode: {
          id: stored.id,
          seriesId,
          number: stored.number,
          title: stored.title,
          type: "comic",
          pages: Array.isArray(stored.pages) ? stored.pages : stored.pages || [],
        },
      };
    }
    const number = Number(episodeId.replace(`${seriesId}e`, "")) || 1;
    if (series.type === "novel") {
      return {
        episode: {
          id: episodeId,
          seriesId,
          number,
          title: `Episode ${number}`,
          type: "novel",
          paragraphs: Array.from({ length: 16 }, (_, idx) =>
            `(${seriesId}-${episodeId}) Paragraph ${idx + 1}. Lorem ipsum dolor sit amet.`
          ),
          previewParagraphs: 3,
        },
      };
    }
    return {
      episode: {
        id: episodeId,
        seriesId,
        number,
        title: `Episode ${number}`,
        type: "comic",
        pages: Array.from({ length: 18 }, (_, idx) => ({
          url: `https://placehold.co/800x1200?text=${seriesId}-${episodeId}-P${idx + 1}`,
          w: 800,
          h: 1200,
        })),
      },
    };
  }
}
