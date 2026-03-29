import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { SeriesAnalyticsSnapshot } from "../mappers/storefront-series.mapper";

export async function loadSeriesAnalytics(
  prisma: PrismaService,
  seriesIds: string[],
): Promise<Map<string, SeriesAnalyticsSnapshot>> {
  const normalizedSeriesIds = [...new Set(seriesIds.map((item) => String(item || "").trim()).filter(Boolean))];
  const map = new Map<string, SeriesAnalyticsSnapshot>();
  if (normalizedSeriesIds.length === 0) {
    return map;
  }

  const [episodeCounts, latestEpisodes, followCounts, viewCounts] = await Promise.all([
    prisma.episode.groupBy({
      by: ["seriesId"],
      where: {
        seriesId: { in: normalizedSeriesIds },
        isDeleted: false,
      },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ seriesId: string; id: string; number: number }>>(
      Prisma.sql`
        SELECT DISTINCT ON ("seriesId") "seriesId", "id", "number"
        FROM "episodes"
        WHERE "seriesId" IN (${Prisma.join(normalizedSeriesIds)})
          AND "isDeleted" = false
        ORDER BY "seriesId", "number" DESC
      `,
    ),
    prisma.follow.groupBy({
      by: ["seriesId"],
      where: { seriesId: { in: normalizedSeriesIds } },
      _count: { _all: true },
    }),
    prisma.seriesViewStat.groupBy({
      by: ["seriesId"],
      where: { seriesId: { in: normalizedSeriesIds } },
      _sum: { views: true },
    }),
  ]);

  for (const seriesId of normalizedSeriesIds) {
    map.set(seriesId, {
      episodeCount: 0,
      latestEpisodeId: "",
      latestEpisodeNumber: null,
      followers: 0,
      views: 0,
    });
  }

  episodeCounts.forEach((row) => {
    const current = map.get(row.seriesId);
    if (current) {
      current.episodeCount = Number(row._count?._all || 0);
    }
  });

  latestEpisodes.forEach((row) => {
    const current = map.get(row.seriesId);
    if (current) {
      current.latestEpisodeId = String(row.id || "");
      current.latestEpisodeNumber = Number(row.number || 0);
    }
  });

  followCounts.forEach((row) => {
    const current = map.get(row.seriesId);
    if (current) {
      current.followers = Number(row._count?._all || 0);
    }
  });

  viewCounts.forEach((row) => {
    const current = map.get(row.seriesId);
    if (current) {
      current.views = Number(row._sum?.views || 0);
    }
  });

  return map;
}
