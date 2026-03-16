import { siteConfig } from "./siteConfig";

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
    return `${seriesTitle} is currently completed. That means you can read the full run now instead of waiting for weekly updates.`;
  }

  return `${seriesTitle} is currently ${statusLabel.toLowerCase()}. New episodes may still arrive, and saving it to your library makes it easier to come back later.`;
}

function getFreeAccessAnswer(seriesTitle, freeEpisodeCount, maxPreviewPages) {
  if (freeEpisodeCount > 0 && maxPreviewPages > 0) {
    return `${seriesTitle} currently offers ${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"} and preview access up to ${maxPreviewPages} pages on eligible chapters, so new readers can sample before committing points.`;
  }

  if (freeEpisodeCount > 0) {
    return `${seriesTitle} currently offers ${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"}, which makes it easier to test the hook before unlocking premium chapters.`;
  }

  if (maxPreviewPages > 0) {
    return `${seriesTitle} currently exposes preview access up to ${maxPreviewPages} pages on eligible chapters, so readers can inspect pacing and art before they spend.`;
  }

  return `${seriesTitle} does not currently offer a clear free start, but you can still review the episode list, pricing, and membership options before checkout.`;
}

export function getSiteFaqItems() {
  return [
    {
      id: "unlock-episodes",
      question: "How do I unlock episodes?",
      answer:
        "Use points to unlock an episode, or wait for a free unlock if the series offers one. Membership benefits may also reduce the cost on selected titles.",
    },
    {
      id: "cancel-membership",
      question: "How do I cancel my subscription?",
      answer:
        "Open Account, review your subscription section, and cancel there. You can re-subscribe later without losing access to the rest of your account.",
    },
    {
      id: "view-orders",
      question: "Where can I see my orders?",
      answer:
        "Visit Orders to review recent purchases, payment status, and refund eligibility from one place.",
    },
    {
      id: "adult-access",
      question: "Why can't I see adult series?",
      answer:
        "Turn on mature content and complete the age gate flow for your current region. The catalog updates as soon as access is confirmed.",
    },
    {
      id: "contact-support",
      question: "How do I contact support?",
      answer: `Use the support form or email ${siteConfig.supportEmail} when billing, account, or reading issues need human follow-up.`,
    },
  ];
}

export function getSeriesFaqItems({ series, episodes }) {
  if (!series?.id || !series?.title) {
    return [];
  }

  const seriesTitle = normalizeText(series.title);
  const statusLabel = normalizeText(series.status) || "Ongoing";
  const creatorLabel = normalizeText(series.author) || "the credited studio";
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
        creatorLabel === "the credited studio"
          ? `${seriesTitle} is grouped under its credited studio on this site, so the creator page is the fastest way to compare related titles.`
          : `${seriesTitle} is credited to ${creatorLabel}. Opening the creator page is the fastest way to compare other titles from the same creator.`,
    },
    {
      id: "series-episodes",
      question: `How much content is already available for ${seriesTitle}?`,
      answer:
        episodeCount > 0
          ? `${seriesTitle} currently shows ${episodeCount} episode${episodeCount === 1 ? "" : "s"}${leadGenre ? `, and the strongest genre fit right now is ${leadGenre}` : ""}.`
          : `${seriesTitle} is live on the site, and the episode list will show the currently available chapters as new ones are published.`,
    },
    {
      id: "series-support",
      question: `Where do I go if I hit a billing or access issue with ${seriesTitle}?`,
      answer: `Open Orders to review receipts and payment state first, then use Support or email ${siteConfig.supportEmail} if the issue needs human review.`,
    },
  ];
}
