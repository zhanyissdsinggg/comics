import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

function normalizeEpisodePages(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  }

  if (typeof value !== "string") {
    return [];
  }

  const raw = value.trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
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
        select: { id: true, type: true, isPublished: true },
      });
      if (!row || row.isPublished === false) {
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
      this.logger.warn(`Series type query failed for ${seriesId}, switching to compatibility mode.`);
    }

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT "id", "type", "isPublished" FROM "series" WHERE "id" = $1 LIMIT 1`,
        seriesId,
      );
      if (!rows.length || rows[0].isPublished === false) {
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
      this.logger.warn(`Series compatibility query failed for ${seriesId}, retrying without publish state.`);
    }

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
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

  private normalizeCompatEpisode(row: Record<string, unknown>) {
    return {
      id: String(row.id || ""),
      seriesId: String(row.seriesId || ""),
      number: Number(row.number || 0),
      title: String(row.title || ""),
      pages: normalizeEpisodePages(row.pages),
      paragraphs: normalizeParagraphs(row.paragraphs),
      text: row.text == null ? null : String(row.text),
      previewFreePages: Number(row.previewFreePages || 0),
    };
  }

  private async findStoredEpisodeCompat(episodeId: string): Promise<any> {
    const columns = await this.prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'episode'`,
    );

    const available = new Set(
      columns
        .map((item) => String(item?.column_name || "").trim())
        .filter(Boolean),
    );

    const requested = [
      "id",
      "seriesId",
      "number",
      "title",
      "pages",
      "paragraphs",
      "text",
      "previewFreePages",
    ].filter((column) => available.has(column));

    if (!requested.includes("id")) {
      requested.unshift("id");
    }

    const selectClause = requested
      .map((column) => `"${column.replace(/"/g, "\"\"")}"`)
      .join(", ");

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${selectClause} FROM "episode" WHERE "id" = $1 LIMIT 1`,
      episodeId,
    );

    if (!rows.length) {
      return null;
    }

    return this.normalizeCompatEpisode(rows[0]);
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
          previewFreePages: true,
        },
      });
    } catch (error) {
      this.logger.warn(`Episode full query failed for ${episodeId}, switching to compatibility mode.`);
      if (error instanceof Error) {
        this.logger.debug(error.message);
      }
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
      this.logger.warn(`Episode compatibility query failed for ${episodeId}, switching to raw fallback.`);
      if (error instanceof Error) {
        this.logger.debug(error.message);
      }
    }

    try {
      return await this.findStoredEpisodeCompat(episodeId);
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(`Episode raw compatibility query failed for ${episodeId}.`);
      return null;
    }
  }

  async getEpisode(seriesId: string, episodeId: string) {
    const series = await this.findSeriesType(seriesId);
    if (!series) {
      return null;
    }

    const stored = await this.findStoredEpisode(episodeId);
    if (!stored) {
      return null;
    }

    const number = Number(stored.number) || Number(episodeId.replace(`${seriesId}e`, "")) || 1;
    const title = String(stored.title || `Episode ${number}`);

    if (series.type === "novel") {
      return {
        episode: {
          id: String(stored.id || episodeId),
          seriesId,
          number,
          title,
          type: "novel",
          paragraphs: normalizeParagraphs(stored.paragraphs ?? stored.text),
          previewParagraphs: 3,
        },
      };
    }

    const previewFreePages = Number(stored.previewFreePages);
    return {
      episode: {
        id: String(stored.id || episodeId),
        seriesId,
        number,
        title,
        type: "comic",
        pages: Array.isArray(stored.pages) ? stored.pages : [],
        previewFreePages: Number.isFinite(previewFreePages) ? previewFreePages : undefined,
      },
    };
  }
}
