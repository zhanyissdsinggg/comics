import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CacheService } from "../../common/cache/cache.service";
import { Cacheable, CacheEvict } from "../../common/cache/cache.decorator";
import { isSeriesVisibilitySchemaDrift, querySeriesVisibilityCompat } from "../../common/utils/series-visibility";
import { enrichSeriesWithStorefrontFields } from "../../common/utils/series-storefront-fields";

type SeriesEpisodeRow = {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  releasedAt: Date | null;
  pricePts: number;
  ttfEligible: boolean;
  ttfReadyAt: Date | null;
  previewFreePages: number;
};

@Injectable()
export class SeriesService {
  private readonly logger = new Logger(SeriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  private toSeriesView(series: any) {
    return {
      id: series.id,
      title: series.title,
      type: series.type,
      adult: series.adult,
      coverTone: series.coverTone || "",
      coverUrl: series.coverUrl || "",
      badge: series.badge || "",
      badges: Array.isArray(series.badges) && series.badges.length
        ? series.badges
        : series.badge
          ? [series.badge]
          : [],
      latest: series.latestEpisodeId ? `Ep ${series.latestEpisodeId}` : "",
      latestEpisodeId: series.latestEpisodeId || "",
      genres: Array.isArray(series.genres) ? series.genres : [],
      status: series.status || "Ongoing",
      rating: series.rating || 0,
      ratingCount: series.ratingCount || 0,
      description: series.description || "",
      createdAt: series.createdAt || null,
      updatedAt: series.updatedAt || null,
      author: typeof series.author === "string" ? series.author : "",
      followers: Number(series.followers || 0),
      views: Number(series.views || 0),
      pricing: {
        currency: "POINTS",
        episodePrice: series.episodePrice || 0,
        discount: 0,
      },
      ttf: {
        enabled: Boolean(series.ttfEnabled),
        intervalHours: series.ttfIntervalHours || 24,
      },
    };
  }

  private applyTtfAcceleration(episode: any, series: any, subscription: any) {
    if (!episode.ttfEligible || !episode.ttfReadyAt) {
      return episode;
    }
    const multiplier = subscription?.perks?.ttfMultiplier;
    if (!multiplier || multiplier >= 1) {
      return episode;
    }
    const releasedAtMs = new Date(episode.releasedAt).getTime();
    if (Number.isNaN(releasedAtMs)) {
      return episode;
    }
    const intervalHours = series?.ttfIntervalHours || 24;
    const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
    const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
    const originalReadyAtMs = new Date(episode.ttfReadyAt).getTime();
    const targetReadyAtMs = Number.isNaN(originalReadyAtMs)
      ? Math.min(baseReadyAtMs, acceleratedReadyAtMs)
      : Math.min(originalReadyAtMs, acceleratedReadyAtMs);
    return {
      ...episode,
      ttfReadyAt: new Date(targetReadyAtMs),
    };
  }

  private isSchemaDriftError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021" || error.code === "P2022") {
        return true;
      }
    }

    const message = String((error as { message?: string }).message || "");
    return (
      message.includes("previewFreePages") ||
      message.includes("does not exist") ||
      message.includes("Unknown column")
    );
  }

  private normalizeEpisode(episode: Partial<SeriesEpisodeRow> & Record<string, any>): SeriesEpisodeRow {
    return {
      id: String(episode.id || ""),
      seriesId: String(episode.seriesId || ""),
      number: Number(episode.number || 0),
      title: String(episode.title || ""),
      releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : null,
      pricePts: Number(episode.pricePts || 0),
      ttfEligible: Boolean(episode.ttfEligible),
      ttfReadyAt: episode.ttfReadyAt ? new Date(episode.ttfReadyAt) : null,
      previewFreePages: Number(episode.previewFreePages || 0),
    };
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }
    if (typeof value !== "string") {
      return [];
    }
    const raw = value.trim();
    if (!raw) {
      return [];
    }
    if (raw.startsWith("[") && raw.endsWith("]")) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item || "").trim()).filter(Boolean);
        }
      } catch {
        return [];
      }
    }
    if (raw.startsWith("{") && raw.endsWith("}")) {
      return raw
        .slice(1, -1)
        .split(",")
        .map((item) => item.replace(/^"+|"+$/g, "").trim())
        .filter(Boolean);
    }
    return [raw];
  }

  private asNumber(value: unknown, fallback = 0): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  private normalizeSeriesRecord(series: Record<string, any>) {
    return {
      id: String(series.id || ""),
      title: String(series.title || ""),
      author: String(series.author || ""),
      type: String(series.type || "comic"),
      adult: Boolean(series.adult),
      isPublished: series.isPublished !== false,
      coverTone: String(series.coverTone || ""),
      coverUrl: String(series.coverUrl || ""),
      badge: String(series.badge || ""),
      badges: this.toStringArray(series.badges),
      latestEpisodeId: String(series.latestEpisodeId || ""),
      genres: this.toStringArray(series.genres),
      status: String(series.status || "Ongoing"),
      rating: this.asNumber(series.rating, 0),
      ratingCount: Math.max(0, Math.floor(this.asNumber(series.ratingCount, 0))),
      description: String(series.description || ""),
      createdAt: series.createdAt ? new Date(series.createdAt) : null,
      updatedAt: series.updatedAt ? new Date(series.updatedAt) : null,
      episodePrice: Math.max(0, Math.floor(this.asNumber(series.episodePrice, 0))),
      ttfEnabled: Boolean(series.ttfEnabled),
      ttfIntervalHours: Math.max(1, Math.floor(this.asNumber(series.ttfIntervalHours, 24))),
    };
  }

  private async fetchSeriesRecordWithFallback(seriesId: string) {
    try {
      return await this.prisma.series.findUnique({ where: { id: seriesId } });
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Series full query failed for ${seriesId}, switching to compatibility mode.`,
      );
    }

    try {
      const columns = await this.prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'series'`,
      );

      const available = new Set(
        columns
          .map((item) => String(item?.column_name || "").trim())
          .filter(Boolean),
      );
      const candidates = [
        "id",
        "title",
        "author",
        "type",
        "adult",
        "isPublished",
        "coverTone",
        "coverUrl",
        "badge",
        "badges",
        "latestEpisodeId",
        "genres",
        "status",
        "rating",
        "ratingCount",
        "description",
        "createdAt",
        "updatedAt",
        "episodePrice",
        "ttfEnabled",
        "ttfIntervalHours",
      ];
      const selected = candidates.filter((name) => available.has(name));
      if (!selected.includes("id")) {
        selected.unshift("id");
      }
      const selectClause = selected
        .map((column) => `"${column.replace(/"/g, "\"\"")}"`)
        .join(", ");
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT ${selectClause} FROM "series" WHERE "id" = $1 LIMIT 1`,
        seriesId,
      );
      if (!rows.length) {
        return null;
      }
      return this.normalizeSeriesRecord(rows[0]);
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Series compatibility query failed for ${seriesId}, falling back to not found.`,
      );
      return null;
    }
  }

  private inferEpisodeCount(series: any): number {
    const latestRaw = String(series?.latestEpisodeId || "");
    const match = latestRaw.match(/(\d+)$/);
    const count = Number(match?.[1] || 0);
    if (!Number.isFinite(count) || count <= 0) {
      return 0;
    }
    return Math.min(count, 300);
  }

  private buildFallbackEpisodes(series: any): SeriesEpisodeRow[] {
    const count = this.inferEpisodeCount(series);
    if (count <= 0) {
      return [];
    }

    return Array.from({ length: count }, (_, idx) => {
      const number = idx + 1;
      return {
        id: `${series.id}e${number}`,
        seriesId: series.id,
        number,
        title: `Episode ${number}`,
        releasedAt: null,
        pricePts: Number(series?.episodePrice || 0),
        ttfEligible: false,
        ttfReadyAt: null,
        previewFreePages: 0,
      };
    });
  }

  private async fetchEpisodesWithFallback(seriesId: string): Promise<SeriesEpisodeRow[] | null> {
    try {
      const rows = await this.prisma.episode.findMany({
        where: { seriesId },
        select: {
          id: true,
          seriesId: true,
          number: true,
          title: true,
          releasedAt: true,
          pricePts: true,
          ttfEligible: true,
          ttfReadyAt: true,
          previewFreePages: true,
        },
        orderBy: { number: "asc" },
      });
      return rows.map((episode) => this.normalizeEpisode(episode));
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Episode full query failed for series ${seriesId}, switching to compatibility mode.`,
      );
    }

    try {
      const rows = await this.prisma.episode.findMany({
        where: { seriesId },
        select: {
          id: true,
          seriesId: true,
          number: true,
          title: true,
        },
        orderBy: { number: "asc" },
      });
      return rows.map((episode) => this.normalizeEpisode(episode));
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Episode compatibility query failed for series ${seriesId}, using synthetic episodes.`,
      );
      return null;
    }
  }

  private async fetchSeriesWithEpisodes(seriesId: string) {
    const series = await this.fetchSeriesRecordWithFallback(seriesId);
    if (!series || series.isPublished === false) {
      return null;
    }

    const episodes = await this.fetchEpisodesWithFallback(seriesId);
    return {
      ...series,
      episodes: episodes && episodes.length > 0 ? episodes : this.buildFallbackEpisodes(series),
    };
  }

  @Cacheable("series:list", 3600)
  async list(adult: boolean | null) {
    const where = adult === null ? { isPublished: true } : { adult, isPublished: true };

    try {
      const list = await this.prisma.series.findMany({
        where,
        orderBy: { title: "asc" },
      });
      return enrichSeriesWithStorefrontFields(
        this.prisma,
        list.map((item) => this.toSeriesView(item)),
      );
    } catch (error) {
      if (!this.isSchemaDriftError(error) && !isSeriesVisibilitySchemaDrift(error)) {
        throw error;
      }
      this.logger.warn("Series list query hit schema drift, switching to compatibility mode.");
      const fallbackList = await querySeriesVisibilityCompat(this.prisma, {
        adult,
        onlyPublished: true,
        orderBy: [{ field: "title", direction: "asc" }],
      });
      return enrichSeriesWithStorefrontFields(
        this.prisma,
        fallbackList.map((item) => this.toSeriesView(item)),
      );
    }
  }

  async detail(seriesId: string, subscription?: any) {
    const data = await this.fetchSeriesWithEpisodes(seriesId);

    if (!data || data.isPublished === false) {
      return null;
    }

    const accelerated = subscription
      ? data.episodes.map((ep) => this.applyTtfAcceleration(ep, data, subscription))
      : data.episodes;

    const [series] = await enrichSeriesWithStorefrontFields(this.prisma, [this.toSeriesView(data)]);

    return { series: series || this.toSeriesView(data), episodes: accelerated };
  }
}
