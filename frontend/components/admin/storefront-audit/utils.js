"use client";

import { getAdminSeriesReadiness } from "../../../lib/adminSeriesReadiness";
import { resolveSeriesCreatorName } from "../../../lib/creatorIdentity";

export const QUICK_FILTERS = [
  { id: "all", label: "全部作品" },
  { id: "publishedRisk", label: "已上线但有缺口" },
  { id: "launchReady", label: "接近可发布" },
  { id: "creatorGap", label: "署名待补" },
  { id: "thinPage", label: "页面内容偏薄" },
];

export const RECOMMENDED_SEQUENCE = [
  "先修已经上线作品的明显缺口。它们已经在接流量，问题会直接被读者看到。",
  "署名优先级要靠前，因为它会同时影响可信度、创作者页和作品页的信息完整度。",
  "接近可发布的草稿可以紧接着推进，这样扩目录时不会拉低整体前台质感。",
  "封面、简介和题材标签最好一轮补齐，再推进到专题位。",
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function getDateValue(value) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isRecentlyUpdated(value, days = 30) {
  const updatedAt = getDateValue(value);
  if (!updatedAt) {
    return false;
  }

  return updatedAt >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function normalizeSeries(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};

  return {
    id: String(source.id || `series-${index + 1}`),
    title: normalizeText(source.title) || "未命名作品",
    author: normalizeText(source.author),
    creatorCredits: Array.isArray(source.creatorCredits) ? source.creatorCredits.filter(Boolean) : [],
    type: source.type === "novel" ? "novel" : "comic",
    status: normalizeText(source.status) || "Ongoing",
    adult: Boolean(source.adult),
    description: normalizeText(source.description),
    coverUrl: normalizeText(source.coverUrl || source.coverImage),
    genres: Array.isArray(source.genres) ? source.genres.filter(Boolean) : [],
    episodeCount: toNumber(source.episodeCount ?? source?._count?.episodes ?? source.totalEpisodes),
    isPublished: source.isPublished !== undefined ? Boolean(source.isPublished) : true,
    updatedAt: source.updatedAt || source.createdAt || null,
  };
}

export function formatDateLabel(value) {
  if (!value) {
    return "暂无更新";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "暂无更新";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

export function formatSeriesTypeLabel(value) {
  return value === "novel" ? "小说" : "漫画";
}

export function formatLifecycleLabel(series) {
  return series.isPublished ? "前台已上线" : "草稿未发布";
}

export function getCreatorLabel(series) {
  return resolveSeriesCreatorName(series);
}

export function getContentFootprint(series) {
  const episodeCount = toNumber(series?.episodeCount);
  const genreCount = Array.isArray(series?.genres) ? series.genres.length : 0;
  const creatorLabel = getCreatorLabel(series);

  let score = 0;

  if (episodeCount >= 40) {
    score += 40;
  } else if (episodeCount >= 20) {
    score += 30;
  } else if (episodeCount >= 10) {
    score += 22;
  } else if (episodeCount > 0) {
    score += 12;
  }

  if (series?.coverUrl) {
    score += 16;
  }

  if (series?.description) {
    score += 14;
  }

  if (creatorLabel) {
    score += 14;
  }

  score += Math.min(10, genreCount * 3);

  if (series?.isPublished) {
    score += 4;
  }

  if (isRecentlyUpdated(series?.updatedAt, 21)) {
    score += 6;
  }

  return Math.min(100, score);
}

export function getPriorityScore(series, readiness, contentFootprint) {
  let score = Math.max(0, 100 - readiness.score);

  if (series.isPublished && readiness.missingCount > 0) {
    score += 90;
  }

  if (!getCreatorLabel(series)) {
    score += 28;
  }

  if (series.episodeCount <= 0) {
    score += 24;
  }

  if (!series.coverUrl) {
    score += 20;
  }

  if (!series.description) {
    score += 14;
  }

  if (!Array.isArray(series.genres) || series.genres.length === 0) {
    score += 12;
  }

  if (!series.isPublished && readiness.missingCount === 1 && readiness.missingItems[0]?.id === "published") {
    score += 18;
  }

  if (series.isPublished) {
    score += Math.round(contentFootprint / 6);
  }

  return score;
}

export function isDraftLaunchReady(series, readiness) {
  if (series.isPublished) {
    return false;
  }

  return readiness.missingItems.every((item) => item.id === "published");
}

export function getRecommendedAction(series, readiness) {
  if (!getCreatorLabel(series)) {
    return "先补公开署名。没有署名，作品页可信度和创作者发现页都会一起打折。";
  }

  if (series.episodeCount <= 0) {
    return "先补阅读入口。没有章节时，前台再好看也承接不住流量。";
  }

  if (!series.coverUrl) {
    return "先补封面。列表页、推荐位和作品页头图都要靠它撑住第一眼。";
  }

  if (!series.description) {
    return "把简介补到能读的程度，让作品页更完整。";
  }

  if (!Array.isArray(series.genres) || series.genres.length === 0) {
    return "补齐题材和标签，让搜索、筛选和专题编排能正常工作。";
  }

  if (!series.isPublished) {
    return "这部作品已经接近可上线状态，确认发布条件后就可以推进到前台。";
  }

  if (readiness.score >= 85) {
    return "基础资料已经完整，可以稳定进入前台推荐、搜索和创作者发现路径。";
  }

  return "剩余缺口已经不多，按当前顺序收尾就能把前台体验拉齐。";
}

export function createAuditedSeries(seriesList) {
  return seriesList
    .map((series) => {
      const readiness = getAdminSeriesReadiness(series);
      const contentFootprint = getContentFootprint(series);
      const priority = getPriorityScore(series, readiness, contentFootprint);

      return {
        ...series,
        creatorLabel: getCreatorLabel(series),
        readiness,
        contentFootprint,
        priority,
        launchReady: isDraftLaunchReady(series, readiness),
        recommendation: getRecommendedAction(series, readiness),
      };
    })
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      const updatedDelta = getDateValue(right.updatedAt) - getDateValue(left.updatedAt);
      if (updatedDelta !== 0) {
        return updatedDelta;
      }

      return left.title.localeCompare(right.title, "zh-CN");
    });
}

export function getAuditOverview(auditedSeries) {
  const total = auditedSeries.length;
  const readyCount = auditedSeries.filter((item) => item.readiness.isReady).length;
  const publishedRiskCount = auditedSeries.filter(
    (item) => item.isPublished && item.readiness.missingCount > 0,
  ).length;
  const launchReadyDraftCount = auditedSeries.filter((item) => item.launchReady).length;
  const creatorGapCount = auditedSeries.filter((item) => !item.creatorLabel).length;
  const avgScore = total
    ? Math.round(auditedSeries.reduce((sum, item) => sum + item.readiness.score, 0) / total)
    : 0;

  const missingSummary = auditedSeries.reduce((summary, item) => {
    item.readiness.missingItems.forEach((missingItem) => {
      summary[missingItem.id] = (summary[missingItem.id] || 0) + 1;
    });
    return summary;
  }, {});

  return {
    total,
    readyCount,
    publishedRiskCount,
    launchReadyDraftCount,
    creatorGapCount,
    avgScore,
    missingSummary,
  };
}

export function filterAuditedSeries(auditedSeries, query, quickFilter) {
  const normalizedQuery = normalizeText(query).toLowerCase();

  return auditedSeries.filter((series) => {
    const matchesFilter =
      quickFilter === "all" ||
      (quickFilter === "publishedRisk" && series.isPublished && series.readiness.missingCount > 0) ||
      (quickFilter === "launchReady" && series.launchReady) ||
      (quickFilter === "creatorGap" && !series.creatorLabel) ||
      (quickFilter === "thinPage" && (series.episodeCount <= 0 || !series.coverUrl));

    if (!matchesFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      series.title,
      series.id,
      series.creatorLabel,
      ...series.genres,
      series.recommendation,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function getTopGaps(missingSummary) {
  const labels = {
    creator: "创作者署名缺失",
    cover: "封面素材缺失",
    description: "简介内容过短",
    genres: "题材标签缺失",
    episodes: "没有章节",
    published: "仍未发布",
  };

  return Object.entries(missingSummary)
    .map(([key, value]) => ({
      key,
      label: labels[key] || key,
      value: Number(value || 0),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}
