/**
 * 老王注释：个性化推荐引擎
 * 功能：基于用户阅读历史、评分、关注计算推荐作品
 * 遵循KISS原则：简单的协同过滤算法
 * 遵循DRY原则：复用数据计算逻辑
 */

/**
 * 老王注释：计算两个数组的交集大小
 */
function getIntersectionSize(arr1, arr2) {
  const set1 = new Set(arr1);
  return arr2.filter((item) => set1.has(item)).length;
}

/**
 * 老王注释：计算作品相似度
 * 基于类型、标签、作者等属性
 */
function calculateSeriesSimilarity(series1, series2) {
  let score = 0;

  // 类型匹配（权重：30%）
  if (series1.type === series2.type) {
    score += 0.3;
  }

  // 标签匹配（权重：40%）
  const genres1 = series1.genres || [];
  const genres2 = series2.genres || [];
  const genreMatch = getIntersectionSize(genres1, genres2);
  if (genres1.length > 0 && genres2.length > 0) {
    score += 0.4 * (genreMatch / Math.max(genres1.length, genres2.length));
  }

  // 作者匹配（权重：20%）
  if (series1.author && series2.author && series1.author === series2.author) {
    score += 0.2;
  }

  // 评分相近（权重：10%）
  if (series1.rating && series2.rating) {
    const ratingDiff = Math.abs(series1.rating - series2.rating);
    score += 0.1 * (1 - ratingDiff / 5); // 假设评分范围是0-5
  }

  return score;
}

/**
 * 老王注释：基于内容的推荐
 * 根据用户已阅读/关注的作品，推荐相似作品
 */
export function getContentBasedRecommendations(
  allSeries,
  userSeriesIds,
  limit = 10
) {
  if (!Array.isArray(allSeries) || allSeries.length === 0) {
    return [];
  }

  if (!Array.isArray(userSeriesIds) || userSeriesIds.length === 0) {
    // 如果用户没有历史，返回热门作品
    return allSeries
      .filter((s) => s.rating && s.ratingCount)
      .sort((a, b) => {
        const scoreA = (a.rating || 0) * Math.log(a.ratingCount || 1);
        const scoreB = (b.rating || 0) * Math.log(b.ratingCount || 1);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  // 获取用户已阅读的作品
  const userSeries = allSeries.filter((s) => userSeriesIds.includes(s.id));

  // 计算每个候选作品的推荐分数
  const candidates = allSeries
    .filter((s) => !userSeriesIds.includes(s.id)) // 排除已阅读的
    .map((candidate) => {
      // 计算与用户所有已阅读作品的平均相似度
      const similarities = userSeries.map((userSeries) =>
        calculateSeriesSimilarity(userSeries, candidate)
      );
      const avgSimilarity =
        similarities.reduce((sum, s) => sum + s, 0) / similarities.length;

      // 综合相似度和作品热度
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

  return candidates;
}

/**
 * 老王注释：基于协同过滤的推荐
 * 找到相似用户，推荐他们喜欢的作品
 * 注意：这是简化版本，实际应用需要后端支持
 */
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
    allUsersBehavior.length === 0
  ) {
    return [];
  }

  // 计算与其他用户的相似度
  const userSimilarities = allUsersBehavior
    .map((otherUser) => {
      const commonSeries = getIntersectionSize(
        userSeriesIds,
        otherUser.seriesIds
      );
      const similarity =
        commonSeries /
        Math.sqrt(userSeriesIds.length * otherUser.seriesIds.length);
      return {
        userId: otherUser.userId,
        similarity,
        seriesIds: otherUser.seriesIds,
      };
    })
    .filter((u) => u.similarity > 0.1) // 过滤掉相似度太低的用户
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20); // 取前20个相似用户

  // 统计相似用户喜欢的作品
  const candidateScores = {};
  userSimilarities.forEach((similarUser) => {
    similarUser.seriesIds.forEach((seriesId) => {
      if (!userSeriesIds.includes(seriesId)) {
        candidateScores[seriesId] =
          (candidateScores[seriesId] || 0) + similarUser.similarity;
      }
    });
  });

  // 排序并返回推荐
  const recommendations = Object.entries(candidateScores)
    .map(([seriesId, score]) => {
      const series = allSeries.find((s) => s.id === seriesId);
      return series ? { ...series, recommendationScore: score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);

  return recommendations;
}

/**
 * 老王注释：混合推荐策略
 * 结合基于内容和协同过滤的推荐
 */
export function getHybridRecommendations(
  allSeries,
  userSeriesIds,
  allUsersBehavior = [],
  limit = 10
) {
  // 获取基于内容的推荐
  const contentBased = getContentBasedRecommendations(
    allSeries,
    userSeriesIds,
    limit * 2
  );

  // 获取协同过滤推荐
  const collaborative = getCollaborativeRecommendations(
    allSeries,
    userSeriesIds,
    allUsersBehavior,
    limit * 2
  );

  // 合并并去重
  const combined = new Map();

  contentBased.forEach((series) => {
    combined.set(series.id, {
      ...series,
      score: (series.recommendationScore || 0) * 0.6, // 内容推荐权重60%
    });
  });

  collaborative.forEach((series) => {
    if (combined.has(series.id)) {
      const existing = combined.get(series.id);
      existing.score += (series.recommendationScore || 0) * 0.4; // 协同过滤权重40%
    } else {
      combined.set(series.id, {
        ...series,
        score: (series.recommendationScore || 0) * 0.4,
      });
    }
  });

  // 排序并返回
  return Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * 老王注释：获取推荐作品
 * 主入口函数
 */
export function getRecommendations({
  allSeries = [],
  historySeriesIds = [],
  followedSeriesIds = [],
  progressSeriesIds = [],
  allUsersBehavior = [],
  limit = 10,
  strategy = "hybrid", // 'content', 'collaborative', 'hybrid'
}) {
  // 合并用户所有相关的作品ID
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
