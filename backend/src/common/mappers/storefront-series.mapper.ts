import {
  CREATOR_FALLBACK_LABEL,
  type PublicCreatorCredit,
  type PublicCreatorIdentity,
} from "../creators/creator-identity";

export type SeriesAnalyticsSnapshot = {
  episodeCount: number;
  latestEpisodeId: string;
  latestEpisodeNumber?: number | null;
  followers?: number;
  views?: number;
};

export type StorefrontEpisodeListItem = {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  releasedAt: Date | null;
  previewFreePages: number;
};

export type StorefrontSeriesSummary = {
  id: string;
  title: string;
  type: string;
  adult: boolean;
  coverTone: string;
  coverUrl: string;
  latest: string;
  latestEpisodeId: string;
  episodeCount: number;
  genres: string[];
  status: string;
  description: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  creator: PublicCreatorIdentity;
  creatorCredits: PublicCreatorCredit[];
};

function extractEpisodeNumber(value: unknown): number {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }
  const match = String(value || "")
    .trim()
    .match(/(\d+)$/);
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
}): StorefrontEpisodeListItem {
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
): StorefrontSeriesSummary {
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
    creator: identity,
    creatorCredits: credits,
  };
}

function sanitizeCreatorIdentity(value: unknown): PublicCreatorIdentity {
  if (!value || typeof value !== "object") {
    return {
      label: CREATOR_FALLBACK_LABEL,
      type: "fallback",
      isFallback: true,
    };
  }

  const candidate = value as Partial<PublicCreatorIdentity>;
  const label = String(candidate.label || "").trim() || CREATOR_FALLBACK_LABEL;
  const type =
    candidate.type === "person" ||
    candidate.type === "team" ||
    candidate.type === "studio" ||
    candidate.type === "fallback"
      ? candidate.type
      : "fallback";

  return {
    label,
    type,
    slug: String(candidate.slug || "").trim() || undefined,
    creatorId: String(candidate.creatorId || "").trim() || undefined,
    isFallback: candidate.isFallback !== false ? type === "fallback" : false,
  };
}

function sanitizeCreatorCredits(value: unknown): PublicCreatorCredit[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<PublicCreatorCredit>;
      const name = String(candidate.name || "").trim();
      if (!name) {
        return null;
      }

      const type =
        candidate.type === "person" ||
        candidate.type === "team" ||
        candidate.type === "studio"
          ? candidate.type
          : "person";

      return {
        creatorId: String(candidate.creatorId || "").trim(),
        slug: String(candidate.slug || "").trim(),
        name,
        type,
        role: String(candidate.role || "creator").trim() || "creator",
        isPrimary: Boolean(candidate.isPrimary),
        sortOrder: Number(candidate.sortOrder || 0),
      } satisfies PublicCreatorCredit;
    })
    .filter((item): item is PublicCreatorCredit => Boolean(item));
}

export function sanitizeStorefrontSeriesSummary(
  value: unknown,
): StorefrontSeriesSummary {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<StorefrontSeriesSummary>)
      : {};

  return {
    id: String(candidate.id || "").trim(),
    title: String(candidate.title || "").trim(),
    type: String(candidate.type || "comic"),
    adult: Boolean(candidate.adult),
    coverTone: String(candidate.coverTone || ""),
    coverUrl: String(candidate.coverUrl || ""),
    latest: String(candidate.latest || "").trim(),
    latestEpisodeId: String(candidate.latestEpisodeId || "").trim(),
    episodeCount: Math.max(0, Number(candidate.episodeCount || 0)),
    genres: Array.isArray(candidate.genres)
      ? candidate.genres.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
    status: String(candidate.status || "Ongoing"),
    description: String(candidate.description || ""),
    createdAt: candidate.createdAt ? new Date(candidate.createdAt) : null,
    updatedAt: candidate.updatedAt ? new Date(candidate.updatedAt) : null,
    creator: sanitizeCreatorIdentity(candidate.creator),
    creatorCredits: sanitizeCreatorCredits(candidate.creatorCredits),
  };
}
