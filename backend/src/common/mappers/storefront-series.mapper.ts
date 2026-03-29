import type { PublicCreatorCredit, PublicCreatorIdentity } from "../creators/creator-identity";

export type SeriesAnalyticsSnapshot = {
  episodeCount: number;
  latestEpisodeId: string;
  latestEpisodeNumber?: number | null;
  followers: number;
  views: number;
};

function extractEpisodeNumber(value: unknown): number {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }
  const match = String(value || "").trim().match(/(\d+)$/);
  const parsed = Number(match?.[1] || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function formatLatestEpisodeLabel(value: unknown): string {
  const episodeNumber = extractEpisodeNumber(value);
  return episodeNumber > 0 ? `Ep ${episodeNumber}` : "";
}

export function mapEpisodeListItem(episode: {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  releasedAt?: Date | null;
  previewFreePages?: number | null;
}) {
  return {
    id: String(episode.id || "").trim(),
    seriesId: String(episode.seriesId || "").trim(),
    number: Number(episode.number || 0),
    title: String(episode.title || "").trim(),
    releasedAt: episode.releasedAt || null,
    previewFreePages: Math.max(0, Number(episode.previewFreePages || 0)),
  };
}

export function mapStorefrontSeriesSummary(
  series: {
    id: string;
    title: string;
    type?: string | null;
    adult?: boolean | null;
    coverTone?: string | null;
    coverUrl?: string | null;
    genres?: string[] | null;
    status?: string | null;
    description?: string | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    author?: string | null;
  },
  analytics: SeriesAnalyticsSnapshot,
  identity: PublicCreatorIdentity,
  credits: PublicCreatorCredit[],
) {
  const latestEpisodeId = String(analytics.latestEpisodeId || "").trim();
  const latestEpisodeLabel = analytics.latestEpisodeNumber
    ? formatLatestEpisodeLabel(analytics.latestEpisodeNumber)
    : formatLatestEpisodeLabel(latestEpisodeId);

  return {
    id: series.id,
    title: series.title,
    type: String(series.type || "comic"),
    adult: Boolean(series.adult),
    coverTone: String(series.coverTone || ""),
    coverUrl: String(series.coverUrl || ""),
    latest: latestEpisodeLabel,
    latestEpisodeId,
    episodeCount: Math.max(0, Number(analytics.episodeCount || 0)),
    genres: Array.isArray(series.genres) ? series.genres : [],
    status: String(series.status || "Ongoing"),
    description: String(series.description || ""),
    createdAt: series.createdAt || null,
    updatedAt: series.updatedAt || null,
    author: identity.label,
    creator: identity,
    creatorCredits: credits,
    followers: Math.max(0, Number(analytics.followers || 0)),
    views: Math.max(0, Number(analytics.views || 0)),
  };
}
