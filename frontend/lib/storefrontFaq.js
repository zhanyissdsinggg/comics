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
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getEpisodeCount(series, episodes) {
  if (Array.isArray(episodes) && episodes.length > 0) {
    return episodes.length;
  }

  const seriesEpisodeCount = toNumber(series?.episodeCount);
  return seriesEpisodeCount > 0 ? seriesEpisodeCount : 0;
}

function getMaxPreviewPages(episodes) {
  return (Array.isArray(episodes) ? episodes : []).reduce((maxValue, episode) => {
    const nextValue = toNumber(episode?.previewFreePages);
    return nextValue > maxValue ? nextValue : maxValue;
  }, 0);
}

function getStatusAnswer(seriesTitle, statusLabel) {
  if (String(statusLabel).toLowerCase() === "completed") {
    return `${seriesTitle} is completed, so the full run is available now.`;
  }

  return `${seriesTitle} is ${statusLabel.toLowerCase()}, so new episodes may still arrive.`;
}

function getFreeAccessAnswer(seriesTitle, freeEpisodeCount, maxPreviewPages) {
  if (freeEpisodeCount > 0 && maxPreviewPages > 0) {
    return `${seriesTitle} currently offers ${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"} and previews up to ${maxPreviewPages} pages on eligible chapters.`;
  }

  if (freeEpisodeCount > 0) {
    return `${seriesTitle} currently offers ${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"}.`;
  }

  if (maxPreviewPages > 0) {
    return `${seriesTitle} currently offers previews up to ${maxPreviewPages} pages on eligible chapters.`;
  }

  return `${seriesTitle} does not currently offer a free start. Check the episode list and current unlock options before you buy.`;
}

export function getSiteFaqItems() {
  return [
    {
      id: "unlock-episodes",
      question: "How do I unlock episodes?",
      answer:
        "Use points to unlock an episode. Some series also offer free access.",
    },
    {
      id: "cancel-membership",
      question: "How do I cancel my membership?",
      answer:
        "Open Account, find your membership, and cancel it there.",
    },
    {
      id: "view-orders",
      question: "Where do I see what I bought?",
      answer:
        "Open Purchases to see recent packs, memberships, and any order ID you might need.",
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
  const leadGenre = Array.isArray(series?.genres) && series.genres.length > 0 ? normalizeText(series.genres[0]) : "";

  return [
    {
      id: "series-status",
      question: `Is ${seriesTitle} completed or still updating?`,
      answer: getStatusAnswer(seriesTitle, statusLabel),
    },
    {
      id: "series-free-access",
      question: `Can I try ${seriesTitle} before paying?`,
      answer: getFreeAccessAnswer(seriesTitle, freeEpisodeCount, maxPreviewPages),
    },
    {
      id: "series-creator",
      question: `Who created ${seriesTitle}?`,
      answer:
        creatorIdentity.hasPublicCredit
          ? `${seriesTitle} is credited to ${creatorIdentity.displayName}.`
          : `${CREATOR_FALLBACK_DETAIL} Public creator names will appear here once they are attached upstream.`,
    },
    {
      id: "series-episodes",
      question: `How much content is already available for ${seriesTitle}?`,
      answer:
        episodeCount > 0
          ? `${seriesTitle} currently shows ${episodeCount} episode${episodeCount === 1 ? "" : "s"}${leadGenre ? `, with ${leadGenre} as the lead genre` : ""}.`
          : `${seriesTitle} is live on the site, and the episode list shows what is currently available.`,
    },
    {
      id: "series-support",
      question: `Where do I go if I hit a billing or access issue with ${seriesTitle}?`,
      answer: `Check Purchases for the order details, then use Contact or email ${siteConfig.supportEmail}.`,
    },
  ];
}
