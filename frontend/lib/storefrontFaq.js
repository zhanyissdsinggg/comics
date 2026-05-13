import { siteConfig } from "./siteConfig";
import {
  CREATOR_FALLBACK_DETAIL,
  resolveSeriesCreatorIdentity,
} from "./creatorIdentity";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getEpisodeCount(series, episodes) {
  if (Array.isArray(episodes) && episodes.length > 0) {
    return episodes.length;
  }

  const seriesEpisodeCount = toNumber(series?.episodeCount);
  return seriesEpisodeCount > 0 ? seriesEpisodeCount : 0;
}

function getMaxPreviewPages(episodes) {
  return (Array.isArray(episodes) ? episodes : []).reduce(
    (maxValue, episode) => {
      const nextValue = toNumber(episode?.previewFreePages);
      return nextValue > maxValue ? nextValue : maxValue;
    },
    0,
  );
}

function getStatusAnswer(seriesTitle, statusLabel) {
  if (String(statusLabel).toLowerCase() === "completed") {
    return `${seriesTitle} is completed, so the full run is available now.`;
  }

  return `${seriesTitle} is ${statusLabel.toLowerCase()}, so new episodes may still arrive.`;
}

function getFreeAccessAnswer(seriesTitle, freeEpisodeCount, maxPreviewPages) {
  if (freeEpisodeCount > 0 && maxPreviewPages > 0) {
    return `${seriesTitle} currently has ${freeEpisodeCount} free chapter${freeEpisodeCount === 1 ? "" : "s"} and previews up to ${maxPreviewPages} pages on select chapters.`;
  }

  if (freeEpisodeCount > 0) {
    return `${seriesTitle} currently has ${freeEpisodeCount} free chapter${freeEpisodeCount === 1 ? "" : "s"}.`;
  }

  if (maxPreviewPages > 0) {
    return `${seriesTitle} currently has previews up to ${maxPreviewPages} pages on select chapters.`;
  }

  return `${seriesTitle} does not have a free start right now. Check the chapter list before you buy.`;
}

export function getSiteFaqItems() {
  return [
    {
      id: "unlock-episodes",
      question: "How do I unlock chapters?",
      answer: "Use points to unlock a chapter. Some series also start free.",
    },
    {
      id: "cancel-membership",
      question: "How do I cancel my plan?",
      answer: "Go to Account, find your plan, and cancel it there.",
    },
    {
      id: "view-orders",
      question: "Where do I see what I bought?",
      answer: "Go to Orders to see recent purchases and any order ID you need.",
    },
    {
      id: "adult-access",
      question: "Why is 18+ locked for me?",
      answer:
        "Turn on mature content and complete the age check for your region.",
    },
    {
      id: "contact-support",
      question: "How do I reach a real person?",
      answer: `Use the contact page or email ${siteConfig.supportEmail}.`,
    },
  ];
}

export function getSeriesFaqItems({ series, episodes }) {
  if (!series?.id || !series?.title) {
    return [];
  }

  const seriesTitle = normalizeText(series.title);
  const statusLabel = normalizeText(series.status) || "Ongoing";
  const creatorIdentity = resolveSeriesCreatorIdentity(series);
  const episodeCount = getEpisodeCount(series, episodes);
  const freeEpisodeCount = toNumber(series?.freeEpisodeCount);
  const maxPreviewPages = getMaxPreviewPages(episodes);
  const leadGenre =
    Array.isArray(series?.genres) && series.genres.length > 0
      ? normalizeText(series.genres[0])
      : "";

  return [
    {
      id: "series-status",
      question: `Is ${seriesTitle} completed or still updating?`,
      answer: getStatusAnswer(seriesTitle, statusLabel),
    },
    {
      id: "series-free-access",
      question: `Can I try ${seriesTitle} before paying?`,
      answer: getFreeAccessAnswer(
        seriesTitle,
        freeEpisodeCount,
        maxPreviewPages,
      ),
    },
    {
      id: "series-creator",
      question: `Who created ${seriesTitle}?`,
      answer: creatorIdentity.hasPublicCredit
        ? `${seriesTitle} is credited to ${creatorIdentity.displayName}.`
        : `${CREATOR_FALLBACK_DETAIL} Public creator names will appear here once they are attached upstream.`,
    },
    {
      id: "series-episodes",
      question: `How much is out for ${seriesTitle}?`,
      answer:
        episodeCount > 0
          ? `${seriesTitle} currently has ${episodeCount} chapter${episodeCount === 1 ? "" : "s"}${leadGenre ? `, with ${leadGenre} up front` : ""}.`
          : `${seriesTitle} is live now, and the chapter list shows what is available.`,
    },
    {
      id: "series-support",
      question: `What if I hit a billing or access issue with ${seriesTitle}?`,
      answer: `Check Orders for the details, then use Contact or email ${siteConfig.supportEmail}.`,
    },
  ];
}
