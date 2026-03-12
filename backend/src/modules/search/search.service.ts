import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { isSeriesVisibilitySchemaDrift, querySeriesVisibilityCompat } from "../../common/utils/series-visibility";

type SearchSeries = {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  coverUrl?: string | null;
  coverTone?: string | null;
  badge?: string | null;
  badges?: string[];
  adult: boolean;
  isPublished?: boolean;
  genres: string[];
  status: string;
  rating: number;
  ratingCount: number;
  updatedAt: Date;
  createdAt: Date;
};

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

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 48;

function parsePositiveInt(value: number | string | undefined, fallback: number, max?: number): number {
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
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value: string): string {
  const normalized = normalizeText(value);
  if (normalized === "completed") {
    return "Completed";
  }
  if (normalized === "ongoing") {
    return "Ongoing";
  }
  if (normalized === "hiatus") {
    return "Hiatus";
  }
  return value.trim();
}

function getSearchText(series: SearchSeries): string {
  return [
    series.title,
    series.description || "",
    series.type,
    series.status,
    ...(series.genres || []),
  ]
    .join(" ")
    .toLowerCase();
}

function computeRelevanceScore(series: SearchSeries, query: string): number {
  if (!query) {
    return 0;
  }

  const title = String(series.title || "").toLowerCase();
  const description = String(series.description || "").toLowerCase();
  const genres = (series.genres || []).map((genre) => String(genre).toLowerCase());
  const tokens = query.split(/\s+/).filter(Boolean);

  let score = 0;
  if (title === query) {
    score += 200;
  } else if (title.startsWith(query)) {
    score += 120;
  } else if (title.includes(query)) {
    score += 80;
  }

  if (genres.some((genre) => genre === query)) {
    score += 60;
  }
  if (genres.some((genre) => genre.includes(query))) {
    score += 30;
  }
  if (description.includes(query)) {
    score += 20;
  }

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 16;
    }
    if (genres.some((genre) => genre.includes(token))) {
      score += 10;
    }
    if (description.includes(token)) {
      score += 4;
    }
  }

  return score;
}

function compareByDateDesc(left: SearchSeries, right: SearchSeries): number {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

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

  private buildSuggestions(query: string, list: SearchSeries[], limit = 8) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) {
      return [];
    }
    const hits: string[] = [];
    (list || []).forEach((series) => {
      if (series.title && String(series.title).toLowerCase().includes(q)) {
        hits.push(series.title);
      }
      (series.genres || []).forEach((genre: string) => {
        if (String(genre).toLowerCase().includes(q)) {
          hits.push(genre);
        }
      });
    });
    const unique = Array.from(new Set(hits));
    return unique.slice(0, limit);
  }

  private async loadSearchableSeries(adult: boolean): Promise<SearchSeries[]> {
    try {
      return await this.prisma.series.findMany({
        where: adult ? { isPublished: true } : { adult: false, isPublished: true },
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          coverUrl: true,
          coverTone: true,
          badge: true,
          badges: true,
          adult: true,
          isPublished: true,
          genres: true,
          status: true,
          rating: true,
          ratingCount: true,
          updatedAt: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (!isSeriesVisibilitySchemaDrift(error)) {
        throw error;
      }
      const fallbackRows = await querySeriesVisibilityCompat(this.prisma, {
        adult: adult ? null : false,
        onlyPublished: true,
        select: [
          "id",
          "title",
          "type",
          "description",
          "coverUrl",
          "coverTone",
          "badge",
          "badges",
          "adult",
          "isPublished",
          "genres",
          "status",
          "rating",
          "ratingCount",
          "updatedAt",
          "createdAt",
        ],
      });
      return fallbackRows.map((row) => ({
        ...row,
        createdAt: row.createdAt || new Date(0),
        updatedAt: row.updatedAt || row.createdAt || new Date(0),
      }));
    }
  }

  async search(options: SearchOptions) {
    const adult = options.adult === true;
    const query = normalizeText(options.q);
    const requestedTypes = splitCsv(options.type).map((item) => normalizeText(item));
    const requestedStatuses = splitCsv(options.status).map(normalizeStatus);
    const requestedGenres = splitCsv(options.genre).map((item) => normalizeText(item));
    const sort = normalizeText(options.sort) || "relevance";
    const page = parsePositiveInt(options.page, DEFAULT_PAGE);
    const pageSize = parsePositiveInt(options.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const list = await this.loadSearchableSeries(adult);
    const filtered = list.filter((series) => {
      if (!adult && series.adult) {
        return false;
      }
      if (series.isPublished === false) {
        return false;
      }
      if (requestedTypes.length > 0 && !requestedTypes.includes(normalizeText(series.type))) {
        return false;
      }
      if (requestedStatuses.length > 0 && !requestedStatuses.includes(normalizeStatus(series.status))) {
        return false;
      }
      if (requestedGenres.length > 0) {
        const normalizedGenres = (series.genres || []).map((genre) => normalizeText(genre));
        const hasGenre = requestedGenres.some((genre) => normalizedGenres.some((item) => item.includes(genre)));
        if (!hasGenre) {
          return false;
        }
      }
      if (!query) {
        return true;
      }
      return getSearchText(series).includes(query);
    });

    const sorted = [...filtered].sort((left, right) => {
      if (sort === "latest") {
        return compareByDateDesc(left, right);
      }
      if (sort === "rating") {
        return right.rating - left.rating || right.ratingCount - left.ratingCount || compareByDateDesc(left, right);
      }
      if (sort === "popular" || sort === "views") {
        return right.ratingCount - left.ratingCount || right.rating - left.rating || compareByDateDesc(left, right);
      }
      if (sort === "alphabetical") {
        return String(left.title || "").localeCompare(String(right.title || ""), "en", {
          sensitivity: "base",
        });
      }
      if (sort === "completed") {
        const leftCompleted = normalizeStatus(left.status) === "Completed" ? 1 : 0;
        const rightCompleted = normalizeStatus(right.status) === "Completed" ? 1 : 0;
        return rightCompleted - leftCompleted || compareByDateDesc(left, right);
      }

      const leftScore = computeRelevanceScore(left, query);
      const rightScore = computeRelevanceScore(right, query);
      return rightScore - leftScore || right.ratingCount - left.ratingCount || compareByDateDesc(left, right);
    });

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const results = sorted.slice(start, start + pageSize);

    return {
      results,
      total,
      page,
      pageSize,
    };
  }

  async keywords(adult: boolean) {
    const list = await this.loadSearchableSeries(adult);
    const genres = new Map<string, number>();
    list.filter((series) => series.isPublished !== false).forEach((series) => {
      (series.genres || []).forEach((genre: string) => {
        genres.set(genre, (genres.get(genre) || 0) + 1);
      });
    });
    const topGenres = Array.from(genres.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([genre]) => genre);
    const topTitles = [...list].filter((series) => series.isPublished !== false)
      .sort((a, b) => b.ratingCount - a.ratingCount || compareByDateDesc(a, b))
      .slice(0, 4)
      .map((series) => series.title);
    return Array.from(new Set([...topGenres, ...topTitles]));
  }

  async suggest(query: string, adult: boolean) {
    const list = await this.loadSearchableSeries(adult);
    return this.buildSuggestions(query, list.filter((series) => series.isPublished !== false), 8);
  }

  async hot(adult: boolean, windowParam?: string) {
    const windowKey = ["week", "month"].includes(windowParam || "")
      ? windowParam
      : "day";
    const days = windowKey === "month" ? 30 : windowKey === "week" ? 7 : 1;
    const dateKeys = this.buildDateRange(days);
    const rows = await this.prisma.searchLog.findMany({
      where: { dateKey: { in: dateKeys } },
      orderBy: { count: "desc" },
      take: 50,
    });
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      counts.set(row.keyword, (counts.get(row.keyword) || 0) + row.count);
    });
    const hot = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword]) => keyword);
    const list = await this.loadSearchableSeries(adult);
    const fallback = [...list].filter((series) => series.isPublished !== false)
      .sort((a, b) => b.ratingCount - a.ratingCount || compareByDateDesc(a, b))
      .slice(0, 4)
      .map((series) => series.title);
    return Array.from(new Set([...hot, ...fallback])).slice(0, 10);
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
  }
}