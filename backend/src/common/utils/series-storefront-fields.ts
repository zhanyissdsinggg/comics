import { PrismaService } from "../prisma/prisma.service";

const SERIES_COLUMN_CACHE_TTL_MS = 5 * 60 * 1000;

let seriesColumnsCache:
  | {
      expiresAt: number;
      columns: Set<string>;
    }
  | null = null;

function normalizeSeriesIdList(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeAuthor(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function normalizeCount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

async function getAvailableSeriesColumns(prisma: PrismaService) {
  if (seriesColumnsCache && seriesColumnsCache.expiresAt > Date.now()) {
    return seriesColumnsCache.columns;
  }

  const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'series'`,
  );

  const nextColumns = new Set(
    columns
      .map((item) => String(item?.column_name || "").trim())
      .filter(Boolean),
  );

  seriesColumnsCache = {
    expiresAt: Date.now() + SERIES_COLUMN_CACHE_TTL_MS,
    columns: nextColumns,
  };

  return nextColumns;
}

async function fetchAuthorMap(prisma: PrismaService, ids: string[]) {
  const authorMap = new Map<string, string>();
  if (!ids.length) {
    return authorMap;
  }

  try {
    const availableColumns = await getAvailableSeriesColumns(prisma);
    if (!availableColumns.has("author")) {
      return authorMap;
    }

    const placeholders = ids.map((_id, index) => `$${index + 1}`).join(", ");
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; author?: string | null }>>(
      `SELECT "id", "author" FROM "series" WHERE "id" IN (${placeholders})`,
      ...ids,
    );

    rows.forEach((row) => {
      authorMap.set(String(row.id || ""), normalizeAuthor(row.author));
    });
  } catch {
    return authorMap;
  }

  return authorMap;
}

async function fetchFollowersMap(prisma: PrismaService, ids: string[]) {
  const followersMap = new Map<string, number>();
  if (!ids.length) {
    return followersMap;
  }

  try {
    const rows = await prisma.follow.groupBy({
      by: ["seriesId"],
      where: { seriesId: { in: ids } },
      _count: { _all: true },
    });

    rows.forEach((row) => {
      followersMap.set(String(row.seriesId || ""), normalizeCount(row?._count?._all));
    });
  } catch {
    return followersMap;
  }

  return followersMap;
}

async function fetchViewsMap(prisma: PrismaService, ids: string[]) {
  const viewsMap = new Map<string, number>();
  if (!ids.length) {
    return viewsMap;
  }

  try {
    const rows = await prisma.seriesViewStat.groupBy({
      by: ["seriesId"],
      where: { seriesId: { in: ids } },
      _sum: { views: true },
    });

    rows.forEach((row) => {
      viewsMap.set(String(row.seriesId || ""), normalizeCount(row?._sum?.views));
    });
  } catch {
    return viewsMap;
  }

  return viewsMap;
}

export async function enrichSeriesWithStorefrontFields<
  T extends { id?: string | null; author?: unknown; followers?: unknown; views?: unknown },
>(prisma: PrismaService, items: T[]): Promise<Array<T & { author: string; followers: number; views: number }>> {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const ids = normalizeSeriesIdList(items.map((item) => item?.id));
  const [authorMap, followersMap, viewsMap] = await Promise.all([
    fetchAuthorMap(prisma, ids),
    fetchFollowersMap(prisma, ids),
    fetchViewsMap(prisma, ids),
  ]);

  return items.map((item) => {
    const seriesId = String(item?.id || "");

    return {
      ...item,
      author: authorMap.get(seriesId) || normalizeAuthor(item?.author),
      followers: followersMap.has(seriesId)
        ? followersMap.get(seriesId) || 0
        : normalizeCount(item?.followers),
      views: viewsMap.has(seriesId)
        ? viewsMap.get(seriesId) || 0
        : normalizeCount(item?.views),
    };
  });
}

export async function syncSeriesAuthorField(
  prisma: PrismaService,
  seriesId: string,
  author: unknown,
) {
  const normalizedSeriesId = String(seriesId || "").trim();
  if (!normalizedSeriesId) {
    return false;
  }

  try {
    const availableColumns = await getAvailableSeriesColumns(prisma);
    if (!availableColumns.has("author")) {
      return false;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "series" SET "author" = $1 WHERE "id" = $2`,
      normalizeAuthor(author),
      normalizedSeriesId,
    );
    return true;
  } catch {
    return false;
  }
}
