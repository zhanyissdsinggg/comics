"use client";

export const EMPTY_AUDIT = {
  creators: [],
  missingAuthorSeries: [],
  legacyAuthorOnlySeries: [],
  namingRiskCreators: [],
  stats: {
    totalSeries: 0,
    creatorCount: 0,
    attributedSeriesCount: 0,
    structuredCreatorSeriesCount: 0,
    legacyAuthorOnlySeriesCount: 0,
    missingAuthorSeriesCount: 0,
    namingRiskCreatorCount: 0,
    unpublishedSeriesCount: 0,
  },
};

export function formatPercent(value) {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed)
    ? Math.max(0, Math.round(parsed))
    : 0;
  return `${safeValue}%`;
}

export function formatDateLabel(value) {
  if (!value) {
    return "暂无更新时间";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "暂无更新时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

export function getErrorMessage(data, response) {
  return (
    data?.message || data?.error || `请求失败，状态码 ${response.status}。`
  );
}

export function formatSeriesStatusLabel(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "completed") return "已完结";
  if (normalized === "ongoing") return "连载中";
  if (normalized === "hiatus") return "休更中";
  if (normalized === "cancelled") return "已下线";

  return String(value || "状态待补充").trim() || "状态待补充";
}

export function getSeriesMetadataSummary(series) {
  const genreCount = (Array.isArray(series?.genres) ? series.genres : [])
    .map((genre) => String(genre || "").trim())
    .filter(Boolean).length;

  return [
    series?.coverUrl ? "封面已就绪" : "封面待补",
    String(series?.description || "").trim() ? "简介已填写" : "简介待补",
    genreCount > 0 ? `${genreCount} 个标签` : "标签待补",
  ].join(" | ");
}
