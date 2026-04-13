"use client";

import { getAdminSeriesReadiness } from "../../../lib/adminSeriesReadiness";

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeSeries(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    id: String(source.id || `series-${index + 1}`),
    title: String(source.title || "未命名作品"),
    author: String(source.author || ""),
    creatorCredits: Array.isArray(source.creatorCredits) ? source.creatorCredits.filter(Boolean) : [],
    type: source.type === "novel" ? "novel" : "comic",
    status: String(source.status || "Ongoing"),
    adult: Boolean(source.adult),
    description: String(source.description || ""),
    coverUrl: String(source.coverUrl || source.coverImage || ""),
    coverTone: String(source.coverTone || "default"),
    bannerUrl: String(source.bannerUrl || ""),
    genres: Array.isArray(source.genres) ? source.genres.filter(Boolean) : [],
    episodeCount: toNumber(source.episodeCount ?? source?._count?.episodes ?? source.totalEpisodes),
    latestEpisodeId: String(source.latestEpisodeId || ""),
    freeEpisodeCount: toNumber(source.freeEpisodeCount),
    hasFreeEpisodes: Boolean(source.hasFreeEpisodes || toNumber(source.freeEpisodeCount) > 0),
    isPublished: source.isPublished !== undefined ? Boolean(source.isPublished) : true,
    updatedAt: source.updatedAt || source.createdAt || null,
  };
}

export function normalizeSlot(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    id: String(source.id || `slot-${index + 1}`),
    slot: String(source.slot || source.name || source.id || `slot-${index + 1}`),
    name: String(source.name || source.slot || source.id || `slot-${index + 1}`),
    seriesIds: Array.isArray(source.seriesIds)
      ? source.seriesIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
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

export function formatCompactNumber(value) {
  return new Intl.NumberFormat("zh-CN", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Math.max(0, toNumber(value)));
}

export function formatPercentValue(value) {
  return `${toNumber(value).toFixed(2)}%`;
}

export function formatSeriesStatusLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "completed") return "已完结";
  if (normalized === "ongoing") return "连载中";
  if (normalized === "hiatus") return "暂停中";
  if (normalized === "cancelled") return "已停更";
  return String(value || "状态未设置").trim() || "状态未设置";
}

export function normalizePerformance(entry) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    totalImpressions: toNumber(source.totalImpressions),
    totalClicks: toNumber(source.totalClicks),
    totalConversions: toNumber(source.totalConversions),
    avgCtr: toNumber(source.avgCtr),
    avgConversionRate: toNumber(source.avgConversionRate),
  };
}

export function buildPerformanceQuery(windowKey) {
  if (windowKey === "all") {
    return "";
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setHours(0, 0, 0, 0);

  if (windowKey === "7d") {
    startDate.setDate(startDate.getDate() - 6);
  } else {
    startDate.setDate(startDate.getDate() - 29);
  }

  const params = new URLSearchParams();
  params.set("startDate", startDate.toISOString());
  params.set("endDate", endDate.toISOString());
  return params.toString();
}

export function getPerformanceState(performance) {
  if (performance.totalImpressions <= 0) {
    return { tone: "rose", label: "暂无反馈" };
  }
  if (performance.totalConversions > 0 || performance.avgCtr >= 2) {
    return { tone: "emerald", label: "状态稳定" };
  }
  if (performance.totalClicks > 0) {
    return { tone: "amber", label: "需要跟进" };
  }
  return { tone: "rose", label: "反馈偏弱" };
}

export const PERFORMANCE_WINDOWS = [
  { id: "7d", label: "近 7 天" },
  { id: "30d", label: "近 30 天" },
  { id: "all", label: "全部时间" },
];

export function dedupeSeriesPool(seriesPool) {
  const seen = new Set();
  return (Array.isArray(seriesPool) ? seriesPool : []).filter((series) => {
    const seriesId = String(series?.id || "").trim();
    if (!seriesId || seen.has(seriesId)) {
      return false;
    }
    seen.add(seriesId);
    return true;
  });
}

export function getSlotReplacementCandidates(slot, heroCandidates) {
  const currentIds = new Set(Array.isArray(slot?.currentIds) ? slot.currentIds : []);
  const heroSeriesPool = (Array.isArray(heroCandidates) ? heroCandidates : [])
    .map((entry) => entry.series)
    .filter(Boolean);
  const slotRecommended = Array.isArray(slot?.recommendedSeries) ? slot.recommendedSeries : [];

  let specializedPool = [];
  if (slot?.id === "home-free-start") {
    specializedPool = heroSeriesPool.filter(
      (series) => Boolean(series?.hasFreeEpisodes) || toNumber(series?.freeEpisodeCount) > 0,
    );
  } else if (slot?.id === "home-binge-ready") {
    specializedPool = heroSeriesPool.filter(
      (series) => String(series?.status || "").toLowerCase() === "completed",
    );
  } else if (slot?.id === "home-breakout") {
    specializedPool = heroSeriesPool.filter((series) => {
      const updatedAt = Date.parse(series?.updatedAt || "");
      const isRecent = !Number.isNaN(updatedAt) && updatedAt >= Date.now() - 21 * 24 * 60 * 60 * 1000;
      const episodeCount = toNumber(series?.episodeCount);
      return isRecent || (episodeCount > 0 && episodeCount <= 24);
    });
  } else {
    specializedPool = heroSeriesPool;
  }

  return dedupeSeriesPool([...slotRecommended, ...specializedPool])
    .filter((series) => !currentIds.has(series.id))
    .slice(0, 3);
}

export function buildSlotOptimizationPlan(slot, replacementCandidates) {
  const replacementIds = replacementCandidates.map((series) => series.id).filter(Boolean);
  const readinessEntries = (Array.isArray(slot?.currentSeries) ? slot.currentSeries : []).map((series) => ({
    series,
    readiness: getAdminSeriesReadiness(series),
  }));
  const weakestEntry =
    [...readinessEntries].sort((left, right) => left.readiness.score - right.readiness.score)[0] || null;
  const hasReplacementCandidates = replacementCandidates.length > 0;
  const performanceLoaded = !slot?.current?.id || Boolean(slot?.performanceLoaded);
  const impressions = toNumber(slot?.performance?.totalImpressions);
  const ctr = toNumber(slot?.performance?.avgCtr);
  const conversionRate = toNumber(slot?.performance?.avgConversionRate);

  if (!slot?.current) {
    return {
      priority: 100,
      tone: "rose",
      title: "推荐位仍未配置",
      detail: "先把关键首页入口补上，别让真正承接发现流量的位置继续空着。",
      actionType: "apply",
      actionLabel: "应用当前建议",
      actionIds: Array.isArray(slot?.recommendedIds) ? slot.recommendedIds : [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (!slot?.aligned) {
    return {
      priority: 90,
      tone: "amber",
      title: "当前配置和方案不一致",
      detail: "先把推荐位对齐到当前编排方案，再判断问题出在内容本身还是入口位置。",
      actionType: "apply",
      actionLabel: "同步当前建议",
      actionIds: Array.isArray(slot?.recommendedIds) ? slot.recommendedIds : [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (weakestEntry && !weakestEntry.readiness.isReady) {
    return {
      priority: 80,
      tone: "amber",
      title: "当前作品资料还没补稳",
      detail: `${weakestEntry.series.title} 仍缺 ${weakestEntry.readiness.topIssues.join("、")}。先把作品页补稳，再期待推荐位替它扛表现。`,
      actionType: "edit",
      actionLabel: "去补作品资料",
      actionSeriesId: weakestEntry.series.id,
      replacementCandidates,
      replacementIds,
    };
  }

  if (!performanceLoaded) {
    return {
      priority: 40,
      tone: "cyan",
      title: "表现数据还在回传",
      detail: "推荐位已经上线，但归因还没稳定，先不要急着动，等数据回齐再看。",
      actionType: "review",
      actionLabel: "等待数据",
      actionIds: [],
      replacementCandidates,
      replacementIds,
    };
  }

  if (impressions <= 0) {
    return {
      priority: 70,
      tone: "amber",
      title: "当前没有拿到曝光",
      detail: "先确认这个推荐位是否真的在前台生效，以及埋点是否正常回传。",
      actionType: hasReplacementCandidates ? "copy" : "review",
      actionLabel: hasReplacementCandidates ? "复制备选作品编号" : "检查推荐位状态",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  if (ctr < 2 && hasReplacementCandidates) {
    return {
      priority: 60,
      tone: "amber",
      title: "点击承接偏弱",
      detail: `点击率只有 ${formatPercentValue(ctr)}，下一轮编排前应该先准备更强的备选作品。`,
      actionType: "copy",
      actionLabel: "复制备选作品编号",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  if (conversionRate > 0 && conversionRate < 10 && hasReplacementCandidates) {
    return {
      priority: 50,
      tone: "amber",
      title: "点进去了，但后续承接偏弱",
      detail: `转化率只有 ${formatPercentValue(conversionRate)}，要换更符合推荐位承诺的作品来试。`,
      actionType: "copy",
      actionLabel: "复制备选作品编号",
      actionIds: replacementIds,
      replacementCandidates,
      replacementIds,
    };
  }

  return {
    priority: 10,
    tone: "emerald",
    title: "当前推荐位状态稳定",
    detail: "内容与入口已经基本匹配，可以继续观察，不必急着调整。",
    actionType: "review",
    actionLabel: "继续观察",
    actionIds: [],
    replacementCandidates,
    replacementIds,
  };
}
