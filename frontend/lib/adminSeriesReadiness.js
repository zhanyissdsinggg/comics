import { resolveSeriesCreatorIdentity } from "./creatorIdentity";

function normalizeText(value) {
  return String(value || "").trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGenres(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getAdminSeriesReadiness(series) {
  const creatorIdentity = resolveSeriesCreatorIdentity(series);
  const fallbackAuthor = normalizeText(series?.author);
  const hasCreatorCredit = creatorIdentity.hasPublicCredit || Boolean(fallbackAuthor);
  const creatorLabel = creatorIdentity.hasPublicCredit
    ? creatorIdentity.displayName
    : fallbackAuthor;
  const coverUrl = normalizeText(series?.coverUrl || series?.coverImage);
  const description = normalizeText(series?.description);
  const genres = normalizeGenres(series?.genres);
  const episodeCount = toNumber(
    series?.episodeCount ?? series?._count?.episodes ?? series?.totalEpisodes,
  );
  const isPublished = Boolean(series?.isPublished);

  const checks = [
    {
      id: "creator",
      label: "Creator credit",
      ok: hasCreatorCredit,
      weight: 20,
      hint: hasCreatorCredit
        ? `${creatorLabel} can flow into creator pages, series credits, and discovery surfaces.`
        : "Missing creator credit weakens trust and breaks creator-led discovery.",
    },
    {
      id: "cover",
      label: "Cover art",
      ok: Boolean(coverUrl),
      weight: 20,
      hint: coverUrl
        ? "The title already has art for lists, detail headers, and editorial placements."
        : "A missing cover makes list pages, search, and featured placements feel unfinished.",
    },
    {
      id: "description",
      label: "Summary",
      ok: description.length >= 40,
      weight: 15,
      hint:
        description.length >= 40
          ? "The summary is long enough for series detail, SEO snippets, and social previews."
          : "A short summary makes the title page feel thin and harder to browse with confidence.",
    },
    {
      id: "genres",
      label: "Genres and tags",
      ok: genres.length > 0,
      weight: 15,
      hint:
        genres.length > 0
          ? "Tags can support search, browse filters, related reading, and editorial grouping."
          : "Missing tags weakens filtering, recommendations, and collection curation.",
    },
    {
      id: "episodes",
      label: "Episodes ready",
      ok: episodeCount > 0,
      weight: 20,
      hint:
        episodeCount > 0
          ? "Readers can move from the series page into a real reading path."
          : "No episodes means the live series page cannot carry discovery traffic well.",
    },
    {
      id: "published",
      label: "Live visibility",
      ok: isPublished,
      weight: 10,
      hint: isPublished
        ? "The title is available to normal storefront routes."
        : "Draft titles stay out of public discovery until they are published.",
    },
  ];

  const score = checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
  const missingItems = checks.filter((item) => !item.ok);
  const topIssues = missingItems.slice(0, 3).map((item) => item.label);

  let tone = "rose";
  let statusLabel = "Needs core setup";

  if (missingItems.length === 0) {
    tone = "emerald";
    statusLabel = "Ready for storefront";
  } else if (score >= 70) {
    tone = "cyan";
    statusLabel = "Close to ready";
  } else if (score >= 45) {
    tone = "amber";
    statusLabel = "Needs a focused pass";
  }

  return {
    score,
    tone,
    statusLabel,
    checks,
    missingItems,
    missingCount: missingItems.length,
    topIssues,
    isReady: missingItems.length === 0,
    summary:
      missingItems.length === 0
        ? "This title is ready for normal discovery, series detail, and creator-led browse paths."
        : `Focus on ${topIssues.join(", ")} first to improve live discovery and reader trust faster.`,
  };
}
