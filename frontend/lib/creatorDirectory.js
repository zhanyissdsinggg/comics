import {
  buildCreatorPathFromSlug,
  getCreatorDisplayName,
  normalizeCreatorName,
  slugifyCreatorName,
} from "./creators";

const STUDIO_TOKENS = ["studio", "team", "works", "lab", "collective", "house", "project"];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPopularityScore(series) {
  return Math.max(
    toNumber(series?.followers),
    toNumber(series?.views),
    toNumber(series?.ratingCount),
    Math.round(toNumber(series?.rating) * 100),
  );
}

function normalizeSeriesList(items) {
  return (Array.isArray(items) ? items : []).filter((item) => item?.id && normalizeCreatorName(item?.author));
}

function normalizeIsoDate(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

function getCreatorCreditType(name) {
  const normalized = normalizeCreatorName(name).toLowerCase();
  if (!normalized) {
    return "creator";
  }

  return STUDIO_TOKENS.some((token) => normalized.includes(token)) ? "studio" : "creator";
}

function buildCreatorBucket(name, slug) {
  return {
    slug,
    name: getCreatorDisplayName(name),
    path: buildCreatorPathFromSlug(slug),
    creditType: getCreatorCreditType(name),
    titleCount: 0,
    completedCount: 0,
    ongoingCount: 0,
    freeStartCount: 0,
    readerProof: 0,
    latestUpdatedAt: null,
    topGenres: [],
    spotlightSeries: null,
    series: [],
  };
}

function sortCreatorSeries(items) {
  return [...items].sort((left, right) => {
    const popularityDelta = getPopularityScore(right) - getPopularityScore(left);
    if (popularityDelta !== 0) {
      return popularityDelta;
    }

    const updatedDelta = new Date(right?.updatedAt || 0) - new Date(left?.updatedAt || 0);
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return String(left?.title || "").localeCompare(String(right?.title || ""));
  });
}

export function buildCreatorDirectory(seriesList) {
  const safeSeries = normalizeSeriesList(seriesList);
  const creatorMap = new Map();

  safeSeries.forEach((series) => {
    const author = normalizeCreatorName(series?.author);
    if (!author) {
      return;
    }

    const slug = slugifyCreatorName(author);
    const current = creatorMap.get(slug) || buildCreatorBucket(author, slug);
    current.series.push(series);
    current.titleCount += 1;
    current.readerProof += getPopularityScore(series);

    if (String(series?.status || "").toLowerCase() === "completed") {
      current.completedCount += 1;
    } else {
      current.ongoingCount += 1;
    }

    if (Number(series?.freeEpisodeCount || 0) > 0 || series?.hasFreeEpisodes) {
      current.freeStartCount += 1;
    }

    const updatedAt = normalizeIsoDate(series?.updatedAt);
    if (updatedAt && (!current.latestUpdatedAt || Date.parse(updatedAt) > Date.parse(current.latestUpdatedAt))) {
      current.latestUpdatedAt = updatedAt;
    }

    creatorMap.set(slug, current);
  });

  return Array.from(creatorMap.values())
    .map((creator) => {
      const sortedSeries = sortCreatorSeries(creator.series);
      const genreCounts = new Map();

      sortedSeries.forEach((series) => {
        (Array.isArray(series?.genres) ? series.genres : []).forEach((genre) => {
          const key = String(genre || "").trim();
          if (!key) {
            return;
          }
          genreCounts.set(key, (genreCounts.get(key) || 0) + 1);
        });
      });

      const topGenres = Array.from(genreCounts.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([genre]) => genre)
        .slice(0, 3);

      return {
        ...creator,
        topGenres,
        spotlightSeries: sortedSeries[0] || null,
        series: sortedSeries,
        leadSummary:
          sortedSeries[0]?.description ||
          `Start with ${sortedSeries[0]?.title || "the lead title"}${
            topGenres[0] ? ` if you want a strong ${topGenres[0].toLowerCase()} entry.` : "."
          }`,
      };
    })
    .sort((left, right) => {
      if (right.readerProof !== left.readerProof) {
        return right.readerProof - left.readerProof;
      }

      if (right.titleCount !== left.titleCount) {
        return right.titleCount - left.titleCount;
      }

      const updatedDelta = Date.parse(right.latestUpdatedAt || 0) - Date.parse(left.latestUpdatedAt || 0);
      if (updatedDelta !== 0) {
        return updatedDelta;
      }

      return left.name.localeCompare(right.name);
    });
}

export function getCreatorDirectoryStats(creators) {
  const safeCreators = Array.isArray(creators) ? creators : [];
  const totals = safeCreators.reduce(
    (summary, creator) => {
      summary.titles += Number(creator?.titleCount || 0);
      summary.completedTitles += Number(creator?.completedCount || 0);
      summary.freeStarts += Number(creator?.freeStartCount || 0);
      summary.readerProof += Number(creator?.readerProof || 0);
      if (creator?.creditType === "studio") {
        summary.studios += 1;
      }
      return summary;
    },
    {
      titles: 0,
      completedTitles: 0,
      freeStarts: 0,
      readerProof: 0,
      studios: 0,
    },
  );

  return {
    creators: safeCreators.length,
    studios: totals.studios,
    titles: totals.titles,
    completedTitles: totals.completedTitles,
    freeStarts: totals.freeStarts,
    readerProof: totals.readerProof,
  };
}
