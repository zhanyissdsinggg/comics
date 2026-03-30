import {
  buildCreatorPathFromSlug,
  getCreatorDisplayName,
  normalizeCreatorName,
  slugifyCreatorName,
} from "./creators";
import { resolveSeriesCreatorIdentity } from "./creatorIdentity";

function hasText(value) {
  return String(value || "").trim().length > 0;
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

function getGenreCount(series) {
  return (Array.isArray(series?.genres) ? series.genres : [])
    .map((genre) => String(genre || "").trim())
    .filter(Boolean).length;
}

function getEpisodeCount(series) {
  const parsed = Number(series?.episodeCount || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getSeriesMetadataScore(series) {
  let score = 0;

  if (series?.isPublished) {
    score += 6;
  }

  if (hasText(series?.coverUrl)) {
    score += 4;
  }

  if (hasText(series?.description)) {
    score += 3;
  }

  if (getGenreCount(series) > 0) {
    score += 2;
  }

  score += Math.min(getEpisodeCount(series), 5);

  return score;
}

function getSeriesMetadataReadiness(series) {
  return {
    hasCover: hasText(series?.coverUrl),
    hasDescription: hasText(series?.description),
    hasGenres: getGenreCount(series) > 0,
    hasEpisodes: getEpisodeCount(series) > 0,
  };
}

function sortSeriesByPriority(items) {
  return [...items].sort((left, right) => {
    if (Boolean(left?.isPublished) !== Boolean(right?.isPublished)) {
      return left?.isPublished ? -1 : 1;
    }

    const metadataDelta = getSeriesMetadataScore(right) - getSeriesMetadataScore(left);
    if (metadataDelta !== 0) {
      return metadataDelta;
    }

    const updatedDelta = Date.parse(right?.updatedAt || 0) - Date.parse(left?.updatedAt || 0);
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return String(left?.title || "").localeCompare(String(right?.title || ""));
  });
}

function getPublicCreatorIdentity(series) {
  const creatorIdentity = resolveSeriesCreatorIdentity(series);
  if (creatorIdentity.hasPublicCredit) {
    return creatorIdentity;
  }

  const rawAuthor = normalizeCreatorName(series?.author);
  if (!rawAuthor) {
    return null;
  }

  const slug = slugifyCreatorName(rawAuthor);
  return {
    hasPublicCredit: true,
    displayName: rawAuthor,
    slug,
    href: buildCreatorPathFromSlug(slug),
  };
}

export function buildAdminCreatorAudit(seriesList) {
  const creatorsMap = new Map();
  const missingCreatorSeries = [];
  const safeSeries = Array.isArray(seriesList) ? seriesList.filter(Boolean) : [];

  safeSeries.forEach((series) => {
    const creatorIdentity = getPublicCreatorIdentity(series);
    if (!creatorIdentity?.displayName) {
      missingCreatorSeries.push(series);
      return;
    }

    const canonicalName = normalizeCreatorName(creatorIdentity.displayName);
    const slug = creatorIdentity.slug || slugifyCreatorName(canonicalName);
    const current = creatorsMap.get(slug) || {
      slug,
      name: getCreatorDisplayName(canonicalName),
      path: creatorIdentity.href || buildCreatorPathFromSlug(slug),
      titleCount: 0,
      publishedCount: 0,
      unpublishedCount: 0,
      completedCount: 0,
      adultCount: 0,
      coverReadyCount: 0,
      descriptionReadyCount: 0,
      genreReadyCount: 0,
      episodicCount: 0,
      latestUpdatedAt: null,
      spotlightSeries: null,
      topGenres: [],
      variants: new Set(),
      series: [],
    };

    current.titleCount += 1;
    current.series.push(series);

    if (series?.isPublished) {
      current.publishedCount += 1;
    } else {
      current.unpublishedCount += 1;
    }

    if (String(series?.status || "").toLowerCase() === "completed") {
      current.completedCount += 1;
    }

    if (series?.adult) {
      current.adultCount += 1;
    }

    const metadataReadiness = getSeriesMetadataReadiness(series);
    if (metadataReadiness.hasCover) {
      current.coverReadyCount += 1;
    }
    if (metadataReadiness.hasDescription) {
      current.descriptionReadyCount += 1;
    }
    if (metadataReadiness.hasGenres) {
      current.genreReadyCount += 1;
    }
    if (metadataReadiness.hasEpisodes) {
      current.episodicCount += 1;
    }

    const updatedAt = normalizeIsoDate(series?.updatedAt);
    if (
      updatedAt &&
      (!current.latestUpdatedAt || Date.parse(updatedAt) > Date.parse(current.latestUpdatedAt))
    ) {
      current.latestUpdatedAt = updatedAt;
    }

    const aliasCandidates = [
      creatorIdentity.displayName,
      typeof series?.author === "string" ? series.author.trim() : "",
    ]
      .map((value) => normalizeCreatorName(value))
      .filter(Boolean);

    aliasCandidates.forEach((value) => current.variants.add(value));
    creatorsMap.set(slug, current);
  });

  const creators = Array.from(creatorsMap.values())
    .map((creator) => {
      const sortedSeries = sortSeriesByPriority(creator.series);
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

      return {
        ...creator,
        spotlightSeries: sortedSeries[0] || null,
        metadataCoverageScore:
          creator.titleCount > 0
            ? Math.round(
                ((creator.publishedCount +
                  creator.coverReadyCount +
                  creator.descriptionReadyCount +
                  creator.genreReadyCount) /
                  (creator.titleCount * 4)) *
                  100,
              )
            : 0,
        readySeriesCount: sortedSeries.filter((series) => {
          const metadataReadiness = getSeriesMetadataReadiness(series);
          return (
            Boolean(series?.isPublished) &&
            metadataReadiness.hasCover &&
            metadataReadiness.hasDescription &&
            metadataReadiness.hasGenres
          );
        }).length,
        topGenres: Array.from(genreCounts.entries())
          .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
          .map(([genre]) => genre)
          .slice(0, 3),
        variants: Array.from(creator.variants).sort((left, right) =>
          left.localeCompare(right),
        ),
        hasNamingRisk: creator.variants.size > 1,
        series: sortedSeries,
      };
    })
    .sort((left, right) => {
      if (right.hasNamingRisk !== left.hasNamingRisk) {
        return right.hasNamingRisk ? 1 : -1;
      }

      if (right.titleCount !== left.titleCount) {
        return right.titleCount - left.titleCount;
      }

      if (right.metadataCoverageScore !== left.metadataCoverageScore) {
        return right.metadataCoverageScore - left.metadataCoverageScore;
      }

      const updatedDelta =
        Date.parse(right.latestUpdatedAt || 0) - Date.parse(left.latestUpdatedAt || 0);
      if (updatedDelta !== 0) {
        return updatedDelta;
      }

      return left.name.localeCompare(right.name);
    });

  const sortedMissingCreators = sortSeriesByPriority(missingCreatorSeries);
  const stats = {
    totalSeries: safeSeries.length,
    creatorCount: creators.length,
    attributedSeriesCount: creators.reduce((sum, creator) => sum + creator.titleCount, 0),
    missingAuthorSeriesCount: sortedMissingCreators.length,
    namingRiskCreatorCount: creators.filter((creator) => creator.hasNamingRisk).length,
    unpublishedSeriesCount: safeSeries.filter((series) => !series?.isPublished).length,
  };

  return {
    creators,
    missingAuthorSeries: sortedMissingCreators,
    namingRiskCreators: creators.filter((creator) => creator.hasNamingRisk),
    stats,
  };
}
