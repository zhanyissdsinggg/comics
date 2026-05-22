import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CacheService } from "../../common/cache/cache.service";
import { ContentCacheInvalidationService } from "../../common/cache/content-cache-invalidation.service";
import { CreatorCreditsService } from "../../common/creators/creator-credits.service";
import {
  mapStorefrontSeriesSummary,
  sanitizeStorefrontSeriesSummary,
} from "../../common/mappers/storefront-series.mapper";
import { PrismaService } from "../../common/prisma/prisma.service";
import { loadSeriesAnalytics } from "../../common/queries/series-analytics";
import {
  filterBlockedPublicSeries,
  isBlockedPublicSeriesRecord,
} from "../../common/utils/public-catalog-visibility";

type SearchOptions = {
  q?: string;
  type?: string;
  status?: string;
  genre?: string;
  sort?: string;
  page?: number | string;
  pageSize?: number | string;
  adult?: boolean;
};

type SearchSeriesRow = {
  id: string;
  title: string;
  type: string;
  author?: string | null;
  description: string | null;
  coverUrl: string | null;
  coverTone: string | null;
  adult: boolean;
  genres: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  latestEpisodeId: string | null;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 48;
const SEARCH_RESULTS_TTL_SECONDS = 120;
const INTERACTIVE_SEARCH_TYPE = "interactive";

function parsePositiveInt(
  value: number | string | undefined,
  fallback: number,
  max?: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  const rounded = Math.floor(parsed);
  return typeof max === "number" ? Math.min(rounded, max) : rounded;
}

function splitCsv(value: string | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeStatus(value: string): string {
  const normalized = normalizeText(value);
  if (normalized === "completed") {
    return "completed";
  }
  if (normalized === "ongoing") {
    return "ongoing";
  }
  if (normalized === "hiatus") {
    return "hiatus";
  }
  return normalized;
}

function splitRequestedTypes(requestedTypes: string[]) {
  const normalized = requestedTypes.map((item) => normalizeText(item));
  const wantsInteractive = normalized.includes(INTERACTIVE_SEARCH_TYPE);
  const seriesTypes = normalized.filter((item) => item !== INTERACTIVE_SEARCH_TYPE);

  return {
    wantsInteractive,
    seriesTypes,
  };
}

function buildSearchResultsCacheKey(input: {
  adult: boolean;
  query: string;
  requestedTypes: string[];
  requestedStatuses: string[];
  requestedGenres: string[];
  sort: string;
  page: number;
  pageSize: number;
}): string {
  return [
    "search:results:v2",
    input.adult ? "adult" : "standard",
    input.query || "all",
    input.requestedTypes.join("|") || "all-types",
    input.requestedStatuses.join("|") || "all-statuses",
    input.requestedGenres.join("|") || "all-genres",
    input.sort || "relevance",
    `p${input.page}`,
    `ps${input.pageSize}`,
  ].join(":");
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly contentCacheInvalidation: ContentCacheInvalidationService,
    private readonly creatorCreditsService: CreatorCreditsService,
  ) {}

  private getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  private buildDateRange(days: number) {
    const result: string[] = [];
    const today = new Date();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      result.push(date.toISOString().slice(0, 10));
    }
    return result;
  }

  private async hydrateSeries(rows: SearchSeriesRow[]) {
    const visibleRows = filterBlockedPublicSeries(rows);
    const seriesIds = visibleRows.map((row) => row.id);
    const [analyticsMap, creditsMap] = await Promise.all([
      loadSeriesAnalytics(this.prisma, seriesIds),
      this.creatorCreditsService.getCreditsMap(seriesIds),
    ]);

    return visibleRows.map((row) => {
      const credits = creditsMap.get(row.id) || [];
      const identity = this.creatorCreditsService.buildIdentity(credits);
      return mapStorefrontSeriesSummary(
        row,
        analyticsMap.get(row.id) || {
          episodeCount: 0,
          latestEpisodeId: String(row.latestEpisodeId || ""),
          latestEpisodeNumber: null,
          followers: 0,
          views: 0,
        },
        identity,
        credits,
      );
    });
  }

  private buildSortSql(sort: string, query?: string) {
    const normalizedSort = normalizeText(sort) || "relevance";
    const normalizedQuery = String(query || "").trim();

    if (normalizedSort === "latest") {
      return Prisma.sql`ORDER BY s."updatedAt" DESC, s."createdAt" DESC`;
    }
    if (normalizedSort === "alphabetical") {
      return Prisma.sql`ORDER BY s."title" ASC`;
    }
    if (normalizedSort === "completed") {
      return Prisma.sql`
        ORDER BY
          CASE WHEN LOWER(s."status") = 'completed' THEN 1 ELSE 0 END DESC,
          s."updatedAt" DESC,
          s."title" ASC
      `;
    }
    if (["popular", "views", "rating"].includes(normalizedSort)) {
      return Prisma.sql`
        ORDER BY
          COALESCE(f.followers, 0) DESC,
          COALESCE(v.views, 0) DESC,
          s."updatedAt" DESC,
          s."title" ASC
      `;
    }

    if (!normalizedQuery) {
      return Prisma.sql`ORDER BY s."updatedAt" DESC, s."title" ASC`;
    }

    return Prisma.sql`
      ORDER BY
        ts_rank_cd(
          setweight(to_tsvector('simple', COALESCE(s."title", '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(s."description", '')), 'B') ||
          setweight(to_tsvector('simple', array_to_string(s."genres", ' ')), 'C'),
          websearch_to_tsquery('simple', ${normalizedQuery})
        ) DESC,
        COALESCE(f.followers, 0) DESC,
        s."updatedAt" DESC,
        s."title" ASC
    `;
  }

  private buildFilterSql(input: {
    adult: boolean;
    query: string;
    requestedTypes: string[];
    requestedStatuses: string[];
    requestedGenres: string[];
  }) {
    const clauses: Prisma.Sql[] = [Prisma.sql`s."isPublished" = true`];
    const blockedIds = ["demo-series", "fixture-series"];
    const blockedIdTokens = ["demo", "fixture", "placeholder", "qa"];
    const blockedTextPatterns = [
      "demo series",
      "gush demo studio",
      "smoke test",
      "reader qa",
      "demo action",
      "demo genre",
      "platform smoke tests",
      "fixture",
      "placeholder",
    ];

    clauses.push(Prisma.sql`s."id" NOT IN (${Prisma.join(blockedIds)})`);
    clauses.push(
      Prisma.sql`NOT (${Prisma.join(
        blockedIdTokens.map(
          (pattern) => Prisma.sql`LOWER(s."id") LIKE ${`%${pattern}%`}`,
        ),
        " OR ",
      )})`,
    );
    clauses.push(
      Prisma.sql`NOT (${Prisma.join(
        blockedTextPatterns.flatMap((pattern) => [
          Prisma.sql`LOWER(COALESCE(s."title", '')) LIKE ${`%${pattern}%`}`,
          Prisma.sql`LOWER(COALESCE(s."description", '')) LIKE ${`%${pattern}%`}`,
          Prisma.sql`LOWER(COALESCE(s."author", '')) LIKE ${`%${pattern}%`}`,
          Prisma.sql`EXISTS (
            SELECT 1
            FROM unnest(s."genres") AS genre
            WHERE LOWER(genre) LIKE ${`%${pattern}%`}
          )`,
        ]),
        " OR ",
      )})`,
    );

    if (!input.adult) {
      clauses.push(Prisma.sql`s."adult" = false`);
    }
    const { wantsInteractive, seriesTypes } = splitRequestedTypes(
      input.requestedTypes,
    );

    if (input.requestedTypes.length > 0) {
      const typeClauses: Prisma.Sql[] = [];
      if (seriesTypes.length > 0) {
        typeClauses.push(
          Prisma.sql`LOWER(s."type") IN (${Prisma.join(seriesTypes)})`,
        );
      }
      if (wantsInteractive) {
        typeClauses.push(
          Prisma.sql`EXISTS (
            SELECT 1
            FROM "interactive_stories" story
            WHERE story."seriesId" = s."id"
              AND story."isPublished" = true
          )`,
        );
      }

      if (typeClauses.length > 0) {
        clauses.push(Prisma.sql`(${Prisma.join(typeClauses, " OR ")})`);
      }
    }
    if (input.requestedStatuses.length > 0) {
      clauses.push(
        Prisma.sql`LOWER(s."status") IN (${Prisma.join(input.requestedStatuses)})`,
      );
    }
    if (input.requestedGenres.length > 0) {
      const genreMatchers = input.requestedGenres.map((genre) => `%${genre}%`);
      clauses.push(
        Prisma.sql`
          EXISTS (
            SELECT 1
            FROM unnest(s."genres") AS genre
            WHERE LOWER(genre) LIKE ANY (ARRAY[${Prisma.join(genreMatchers)}])
          )
        `,
      );
    }
    if (input.query) {
      const likePattern = `%${input.query}%`;
      clauses.push(
        Prisma.sql`
          (
            setweight(to_tsvector('simple', COALESCE(s."title", '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(s."description", '')), 'B') ||
            setweight(to_tsvector('simple', array_to_string(s."genres", ' ')), 'C')
          ) @@ websearch_to_tsquery('simple', ${input.query})
          OR LOWER(s."title") LIKE ${likePattern}
          OR LOWER(COALESCE(s."description", '')) LIKE ${likePattern}
          OR EXISTS (
            SELECT 1
            FROM unnest(s."genres") AS genre
            WHERE LOWER(genre) LIKE ${likePattern}
          )
        `,
      );
    }

    return clauses.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`
      : Prisma.empty;
  }

  private async runSearchQuery(input: {
    adult: boolean;
    query: string;
    requestedTypes: string[];
    requestedStatuses: string[];
    requestedGenres: string[];
    sort: string;
    page: number;
    pageSize: number;
  }) {
    const whereSql = this.buildFilterSql(input);
    const orderSql = this.buildSortSql(input.sort, input.query);
    const offset = (input.page - 1) * input.pageSize;
    const { wantsInteractive, seriesTypes } = splitRequestedTypes(
      input.requestedTypes,
    );
    const interactiveTypeSql = wantsInteractive
      ? Prisma.sql`
          CASE
            WHEN story."id" IS NOT NULL
              AND ${seriesTypes.length === 0 ? Prisma.sql`true` : Prisma.sql`LOWER(s."type") NOT IN (${Prisma.join(seriesTypes)})`}
            THEN ${INTERACTIVE_SEARCH_TYPE}
            ELSE s."type"
          END AS "type"
        `
      : Prisma.sql`s."type" AS "type"`;

    const [rows, totals] = await Promise.all([
      this.prisma.$queryRaw<SearchSeriesRow[]>(
        Prisma.sql`
          SELECT
            s."id",
            s."title",
            ${interactiveTypeSql},
            s."author",
            s."description",
            s."coverUrl",
            s."coverTone",
            s."adult",
            s."genres",
            s."status",
            s."createdAt",
            s."updatedAt",
            s."latestEpisodeId"
          FROM "series" s
          LEFT JOIN "interactive_stories" story
            ON story."seriesId" = s."id"
            AND story."isPublished" = true
          LEFT JOIN (
            SELECT "seriesId", COUNT(*)::int AS followers
            FROM "follows"
            GROUP BY "seriesId"
          ) f ON f."seriesId" = s."id"
          LEFT JOIN (
            SELECT "seriesId", COALESCE(SUM("views"), 0)::int AS views
            FROM "series_view_stats"
            GROUP BY "seriesId"
          ) v ON v."seriesId" = s."id"
          ${whereSql}
          ${orderSql}
          LIMIT ${input.pageSize}
          OFFSET ${offset}
        `,
      ),
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS total
          FROM "series" s
          LEFT JOIN "interactive_stories" story
            ON story."seriesId" = s."id"
            AND story."isPublished" = true
          ${whereSql}
        `,
      ),
    ]);

    return {
      rows,
      total: Number(totals[0]?.total || 0),
    };
  }

  async search(options: SearchOptions) {
    const adult = options.adult === true;
    const query = normalizeText(options.q);
    const requestedTypes = splitCsv(options.type).map((item) =>
      normalizeText(item),
    );
    const requestedStatuses = splitCsv(options.status).map(normalizeStatus);
    const requestedGenres = splitCsv(options.genre).map((item) =>
      normalizeText(item),
    );
    const sort = normalizeText(options.sort) || "relevance";
    const page = parsePositiveInt(options.page, DEFAULT_PAGE);
    const pageSize = parsePositiveInt(
      options.pageSize,
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const cacheKey = buildSearchResultsCacheKey({
      adult,
      query,
      requestedTypes,
      requestedStatuses,
      requestedGenres,
      sort,
      page,
      pageSize,
    });

    const cached = await this.cacheService.get<{
      results: Awaited<ReturnType<SearchService["hydrateSeries"]>>;
      total: number;
      page: number;
      pageSize: number;
      appliedSort: string;
    }>(cacheKey);
    if (cached) {
      return {
        ...cached,
        results: (Array.isArray(cached.results) ? cached.results : []).map((item) =>
          sanitizeStorefrontSeriesSummary(item),
        ),
      };
    }

    const { rows, total } = await this.runSearchQuery({
      adult,
      query,
      requestedTypes,
      requestedStatuses,
      requestedGenres,
      sort,
      page,
      pageSize,
    });

    const visibleRows = filterBlockedPublicSeries(rows);
    const payload = {
      results: await this.hydrateSeries(visibleRows),
      total,
      page,
      pageSize,
      appliedSort: sort,
    };
    await this.cacheService.set(cacheKey, payload, SEARCH_RESULTS_TTL_SECONDS);
    return payload;
  }

  async keywords(adult: boolean) {
    const cacheKey = `search:keywords:${adult ? "adult" : "standard"}:v2`;
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const [genres, titles] = await Promise.all([
      this.prisma.$queryRaw<Array<{ genre: string; count: number }>>(
        Prisma.sql`
          SELECT genre, COUNT(*)::int AS count
          FROM (
            SELECT unnest("genres") AS genre
            FROM "series"
            WHERE "isPublished" = true
              ${adult ? Prisma.empty : Prisma.sql`AND "adult" = false`}
          ) expanded
          WHERE genre IS NOT NULL AND TRIM(genre) <> ''
          GROUP BY genre
          ORDER BY count DESC, genre ASC
          LIMIT 6
        `,
      ),
      this.prisma.series.findMany({
        where: adult
          ? { isPublished: true }
          : { isPublished: true, adult: false },
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        take: 4,
        select: {
          id: true,
          title: true,
          description: true,
          genres: true,
          author: true,
        },
      }),
    ]);

    const keywords = Array.from(
      new Set([
        ...genres.map((item) => item.genre),
        ...titles
          .filter((item) => !isBlockedPublicSeriesRecord(item))
          .map((item) => item.title),
      ]),
    ).slice(0, 10);

    await this.cacheService.set(cacheKey, keywords, 300);
    return keywords;
  }

  async suggest(query: string, adult: boolean) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return [];
    }

    const cacheKey = `search:suggest:${adult ? "adult" : "standard"}:${normalizedQuery}:v2`;
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const likePattern = `%${normalizedQuery}%`;
    const [titles, genres] = await Promise.all([
      this.prisma.$queryRaw<Array<{ value: string }>>(
        Prisma.sql`
          SELECT DISTINCT "title" AS value
          FROM "series"
          WHERE "isPublished" = true
            ${adult ? Prisma.empty : Prisma.sql`AND "adult" = false`}
            AND LOWER("title") LIKE ${likePattern}
          ORDER BY value ASC
          LIMIT 6
        `,
      ),
      this.prisma.$queryRaw<Array<{ value: string }>>(
        Prisma.sql`
          SELECT DISTINCT genre AS value
          FROM (
            SELECT unnest("genres") AS genre
            FROM "series"
            WHERE "isPublished" = true
              ${adult ? Prisma.empty : Prisma.sql`AND "adult" = false`}
          ) expanded
          WHERE LOWER(genre) LIKE ${likePattern}
          ORDER BY value ASC
          LIMIT 6
        `,
      ),
    ]);

    const suggestions = Array.from(
      new Set(
        [...titles, ...genres]
          .filter((item) => !isBlockedPublicSeriesRecord({ title: item.value, genres: [item.value] }))
          .map((item) => item.value),
      ),
    ).slice(0, 8);
    await this.cacheService.set(cacheKey, suggestions, 120);
    return suggestions;
  }

  async hot(adult: boolean, windowParam?: string) {
    const windowKey = ["week", "month"].includes(
      String(windowParam || "").trim(),
    )
      ? windowParam
      : "day";
    const cacheKey = `search:hot:${adult ? "adult" : "standard"}:${windowKey}:v2`;
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const days = windowKey === "month" ? 30 : windowKey === "week" ? 7 : 1;
    const dateKeys = this.buildDateRange(days);
    const rows = await this.prisma.searchLog.groupBy({
      by: ["keyword"],
      where: { dateKey: { in: dateKeys } },
      _sum: { count: true },
      orderBy: [{ _sum: { count: "desc" } }, { keyword: "asc" }],
      take: 10,
    });
    const hotKeywords = rows.map((row) => row.keyword);

    await this.cacheService.set(cacheKey, hotKeywords, 120);
    return hotKeywords;
  }

  async log(_userId: string, query: string) {
    const keyword = String(query || "").trim();
    if (!keyword) {
      return;
    }
    const today = this.getTodayKey();
    await this.prisma.searchLog.upsert({
      where: { dateKey_keyword: { dateKey: today, keyword } },
      update: { count: { increment: 1 } },
      create: { dateKey: today, keyword, count: 1 },
    });
    await this.contentCacheInvalidation.invalidateSearchTelemetry(
      "search-log-upsert",
    );
  }
}
