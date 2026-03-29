import { PrismaService } from "../prisma/prisma.service";

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

function extractEpisodeNumber(value: unknown) {
  const match = String(value || "").trim().match(/(\d+)$/);
  return normalizeCount(match?.[1] || 0);
}

function formatLatestEpisodeLabel(value: unknown) {
  const episodeNumber = extractEpisodeNumber(value);
  return episodeNumber > 0 ? `Ep ${episodeNumber}` : "";
}

type EpisodeStats = {
  episodeCount: number;
  latestEpisodeId: string;
  latest: string;
};

async function fetchAuthorMap(prisma: PrismaService, ids: string[]) {
  const authorMap = new Map<string, string>();
  if (!ids.length) {
    return authorMap;
  }

  try {
    const rows = await prisma.series.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        author: true,
      },
    });

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

async function fetchEpisodeStatsRows(prisma: PrismaService, ids: string[]) {
  const buildWhere = (includeSoftDelete = true) => ({
    seriesId: { in: ids },
    ...(includeSoftDelete ? { isDeleted: false } : {}),
  });

  try {
    return await prisma.episode.findMany({
      where: buildWhere(true),
      select: {
        seriesId: true,
        id: true,
        number: true,
      },
      orderBy: [{ seriesId: "asc" }, { number: "desc" }],
    });
  } catch {
    try {
      return await prisma.episode.findMany({
        where: buildWhere(false),
        select: {
          seriesId: true,
          id: true,
          number: true,
        },
        orderBy: [{ seriesId: "asc" }, { number: "desc" }],
      });
    } catch {
      return [];
    }
  }
}

async function fetchEpisodeStatsMap(prisma: PrismaService, ids: string[]) {
  const episodeStatsMap = new Map<string, EpisodeStats>();
  if (!ids.length) {
    return episodeStatsMap;
  }

  const rows = await fetchEpisodeStatsRows(prisma, ids);
  rows.forEach((row) => {
    const seriesId = String(row?.seriesId || "").trim();
    if (!seriesId) {
      return;
    }

    const latestEpisodeId = String(row?.id || "").trim();
    const existing = episodeStatsMap.get(seriesId);
    if (!existing) {
      episodeStatsMap.set(seriesId, {
        episodeCount: 1,
        latestEpisodeId,
        latest: formatLatestEpisodeLabel(row?.number || latestEpisodeId),
      });
      return;
    }

    existing.episodeCount += 1;
  });

  return episodeStatsMap;
}

export async function enrichSeriesWithStorefrontFields<
  T extends {
    id?: string | null;
    author?: unknown;
    followers?: unknown;
    views?: unknown;
    latestEpisodeId?: unknown;
    latest?: unknown;
    episodeCount?: unknown;
  },
>(
  prisma: PrismaService,
  items: T[],
): Promise<
  Array<
    T & {
      author: string;
      followers: number;
      views: number;
      latestEpisodeId: string;
      latest: string;
      episodeCount: number;
    }
  >
> {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const ids = normalizeSeriesIdList(items.map((item) => item?.id));
  const [authorMap, followersMap, viewsMap, episodeStatsMap] = await Promise.all([
    fetchAuthorMap(prisma, ids),
    fetchFollowersMap(prisma, ids),
    fetchViewsMap(prisma, ids),
    fetchEpisodeStatsMap(prisma, ids),
  ]);

  return items.map((item) => {
    const seriesId = String(item?.id || "");
    const derivedEpisodeStats = episodeStatsMap.get(seriesId);
    const fallbackLatestEpisodeId = String(item?.latestEpisodeId || "").trim();
    const fallbackLatest = String(item?.latest || "").trim() || formatLatestEpisodeLabel(fallbackLatestEpisodeId);
    const fallbackEpisodeCount = normalizeCount(item?.episodeCount || extractEpisodeNumber(fallbackLatestEpisodeId));

    return {
      ...item,
      author: authorMap.get(seriesId) || normalizeAuthor(item?.author),
      followers: followersMap.has(seriesId)
        ? followersMap.get(seriesId) || 0
        : normalizeCount(item?.followers),
      views: viewsMap.has(seriesId)
        ? viewsMap.get(seriesId) || 0
        : normalizeCount(item?.views),
      latestEpisodeId: derivedEpisodeStats?.latestEpisodeId || fallbackLatestEpisodeId,
      latest: derivedEpisodeStats?.latest || fallbackLatest,
      episodeCount: derivedEpisodeStats?.episodeCount ?? fallbackEpisodeCount,
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
    await prisma.series.update({
      where: { id: normalizedSeriesId },
      data: {
        author: normalizeAuthor(author),
      },
    });
    return true;
  } catch {
    return false;
  }
}
