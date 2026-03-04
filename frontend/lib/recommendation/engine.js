/**
 * Recommendation engine.
 *
 * Exposes three strategies:
 * - content: similarity by metadata
 * - collaborative: user-behavior overlap
 * - hybrid: weighted merge of both
 */

function getIntersectionSize(arr1, arr2) {
  const set1 = new Set(arr1);
  return arr2.filter((item) => set1.has(item)).length;
}

function calculateSeriesSimilarity(series1, series2) {
  let score = 0;

  // Type match: 30%
  if (series1.type === series2.type) {
    score += 0.3;
  }

  // Genre overlap: 40%
  const genres1 = series1.genres || [];
  const genres2 = series2.genres || [];
  const genreMatch = getIntersectionSize(genres1, genres2);
  if (genres1.length > 0 && genres2.length > 0) {
    score += 0.4 * (genreMatch / Math.max(genres1.length, genres2.length));
  }

  // Author match: 20%
  if (series1.author && series2.author && series1.author === series2.author) {
    score += 0.2;
  }

  // Rating proximity: 10%
  if (series1.rating && series2.rating) {
    const ratingDiff = Math.abs(series1.rating - series2.rating);
    score += 0.1 * (1 - ratingDiff / 5);
  }

  return score;
}

export function getContentBasedRecommendations(
  allSeries,
  userSeriesIds,
  limit = 10
) {
  if (!Array.isArray(allSeries) || allSeries.length === 0) {
    return [];
  }

  // Cold start: rank by quality + popularity.
  if (!Array.isArray(userSeriesIds) || userSeriesIds.length === 0) {
    return allSeries
      .filter((s) => s.rating && s.ratingCount)
      .sort((a, b) => {
        const scoreA = (a.rating || 0) * Math.log(a.ratingCount || 1);
        const scoreB = (b.rating || 0) * Math.log(b.ratingCount || 1);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  const userSeries = allSeries.filter((s) => userSeriesIds.includes(s.id));

  return allSeries
    .filter((s) => !userSeriesIds.includes(s.id))
    .map((candidate) => {
      const similarities = userSeries.map((s) =>
        calculateSeriesSimilarity(s, candidate)
      );
      const avgSimilarity =
        similarities.length > 0
          ? similarities.reduce((sum, s) => sum + s, 0) / similarities.length
          : 0;

      const popularity = candidate.rating
        ? (candidate.rating / 5) * Math.log(candidate.ratingCount || 1)
        : 0;
      const score = avgSimilarity * 0.7 + popularity * 0.3;

      return {
        ...candidate,
        recommendationScore: score,
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

export function getCollaborativeRecommendations(
  allSeries,
  userSeriesIds,
  allUsersBehavior = [],
  limit = 10
) {
  if (!Array.isArray(allSeries) || allSeries.length === 0) {
    return [];
  }

  if (
    !Array.isArray(userSeriesIds) ||
    userSeriesIds.length === 0 ||
    !Array.isArray(allUsersBehavior) ||
    allUsersBehavior.length === 0
  ) {
    return [];
  }

  const userSimilarities = allUsersBehavior
    .map((otherUser) => {
      const seriesIds = Array.isArray(otherUser?.seriesIds)
        ? otherUser.seriesIds
        : [];
      if (seriesIds.length === 0) {
        return null;
      }

      const commonSeries = getIntersectionSize(userSeriesIds, seriesIds);
      const denominator = Math.sqrt(userSeriesIds.length * seriesIds.length);
      const similarity = denominator > 0 ? commonSeries / denominator : 0;

      return {
        userId: otherUser?.userId,
        similarity,
        seriesIds,
      };
    })
    .filter((u) => u && u.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20);

  const candidateScores = {};
  userSimilarities.forEach((similarUser) => {
    similarUser.seriesIds.forEach((seriesId) => {
      if (!userSeriesIds.includes(seriesId)) {
        candidateScores[seriesId] =
          (candidateScores[seriesId] || 0) + similarUser.similarity;
      }
    });
  });

  return Object.entries(candidateScores)
    .map(([seriesId, score]) => {
      const series = allSeries.find((s) => s.id === seriesId);
      return series ? { ...series, recommendationScore: score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

export function getHybridRecommendations(
  allSeries,
  userSeriesIds,
  allUsersBehavior = [],
  limit = 10
) {
  const contentBased = getContentBasedRecommendations(
    allSeries,
    userSeriesIds,
    limit * 2
  );

  const collaborative = getCollaborativeRecommendations(
    allSeries,
    userSeriesIds,
    allUsersBehavior,
    limit * 2
  );

  const combined = new Map();

  contentBased.forEach((series) => {
    combined.set(series.id, {
      ...series,
      score: (series.recommendationScore || 0) * 0.6,
    });
  });

  collaborative.forEach((series) => {
    if (combined.has(series.id)) {
      const existing = combined.get(series.id);
      existing.score += (series.recommendationScore || 0) * 0.4;
      return;
    }

    combined.set(series.id, {
      ...series,
      score: (series.recommendationScore || 0) * 0.4,
    });
  });

  return Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getRecommendations({
  allSeries = [],
  historySeriesIds = [],
  followedSeriesIds = [],
  progressSeriesIds = [],
  allUsersBehavior = [],
  limit = 10,
  strategy = "hybrid",
}) {
  const userSeriesIds = Array.from(
    new Set([...historySeriesIds, ...followedSeriesIds, ...progressSeriesIds])
  );

  switch (strategy) {
    case "content":
      return getContentBasedRecommendations(allSeries, userSeriesIds, limit);
    case "collaborative":
      return getCollaborativeRecommendations(
        allSeries,
        userSeriesIds,
        allUsersBehavior,
        limit
      );
    case "hybrid":
    default:
      return getHybridRecommendations(
        allSeries,
        userSeriesIds,
        allUsersBehavior,
        limit
      );
  }
}
