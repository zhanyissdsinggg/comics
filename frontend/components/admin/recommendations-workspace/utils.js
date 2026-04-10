"use client";

import { normalizeAdminErrorMessage } from "@/lib/adminApiClient";
import {
  STOREFRONT_SLOT_PRESETS,
  getStorefrontSlotDisplayMeta,
  getStorefrontSlotPreset,
} from "@/lib/storefrontSlots";

export { STOREFRONT_SLOT_PRESETS, getStorefrontSlotDisplayMeta, getStorefrontSlotPreset };

export const VIEW_TABS = [
  { value: "slots", label: "推荐位" },
  { value: "rankings", label: "榜单规则" },
  { value: "analytics", label: "表现分析" },
];

export const RANKING_TYPE_OPTIONS = [
  { value: "trending", label: "趋势排序" },
  { value: "new", label: "新作优先" },
];

export const LEGACY_RANKING_TYPE_LABELS = {
  views: "历史阅读量（旧规则）",
  rating: "历史评分（旧规则）",
  ratingCount: "历史评分人数（旧规则）",
};

export const TIME_RANGE_OPTIONS = [
  { value: "day", label: "日" },
  { value: "week", label: "周" },
  { value: "month", label: "月" },
  { value: "all", label: "全部时间" },
];

export const SERIES_TYPE_OPTIONS = [
  { value: "all", label: "全部作品" },
  { value: "comic", label: "漫画" },
  { value: "novel", label: "小说" },
  { value: "manga", label: "日漫" },
  { value: "manhwa", label: "韩漫" },
];

export const ANALYTICS_SLOT_FILTER_OPTIONS = [
  { value: "all", label: "全部推荐位" },
  ...STOREFRONT_SLOT_PRESETS.filter((item) => item.token !== "custom").map((item) => ({
    value: item.token,
    label: item.label,
  })),
];

export const EMPTY_FEEDBACK = { type: "", message: "" };

export const INITIAL_SLOT_FORM = {
  preset: "library-return",
  slotToken: "library-return",
  seriesIdsText: "",
};

export const INITIAL_RANKING_FORM = {
  name: "",
  rankingType: "trending",
  timeRange: "day",
  seriesType: "all",
  maxItems: "20",
  adult: false,
  active: true,
};

export function getErrorMessage(error, fallbackMessage) {
  return normalizeAdminErrorMessage(error, fallbackMessage);
}

export function parseSeriesIds(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildSlotPayload(form) {
  const presetToken = String(form.preset || "").trim();
  const slotToken =
    presetToken && presetToken !== "custom"
      ? presetToken
      : String(form.slotToken || "").trim();

  return {
    slot: slotToken,
    seriesIds: parseSeriesIds(form.seriesIdsText),
  };
}

export function buildRankingPayload(form) {
  return {
    name: String(form.name || "").trim(),
    rankingType: String(form.rankingType || "trending").trim(),
    timeRange: String(form.timeRange || "day").trim(),
    seriesType: String(form.seriesType || "all").trim(),
    maxItems: Number.parseInt(String(form.maxItems || "20"), 10),
    adult: Boolean(form.adult),
    active: Boolean(form.active),
  };
}

export function formatRankingTypeLabel(value) {
  return (
    RANKING_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
    LEGACY_RANKING_TYPE_LABELS[value] ||
    "未知类型"
  );
}

export function formatTimeRangeLabel(value) {
  return TIME_RANGE_OPTIONS.find((option) => option.value === value)?.label || "未知范围";
}

export function formatSeriesTypeLabel(value) {
  return SERIES_TYPE_OPTIONS.find((option) => option.value === value)?.label || "未知类型";
}

export function formatDateTime(value) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
}

export function formatPercent(value) {
  const numericValue = Number(value || 0);
  return `${numericValue.toFixed(2)}%`;
}

export function buildAnalyticsSummary(analytics) {
  return analytics.reduce(
    (summary, item) => ({
      impressions: summary.impressions + Number(item.impressions || 0),
      views: summary.views + Number(item.views || 0),
      clicks: summary.clicks + Number(item.clicks || 0),
      conversions: summary.conversions + Number(item.conversions || 0),
    }),
    {
      impressions: 0,
      views: 0,
      clicks: 0,
      conversions: 0,
    },
  );
}

export function buildRecommendationStatCards({
  slotsTotal,
  rankingsTotal,
  analyticsTotal,
  rankingsLoaded,
  analyticsLoaded,
}) {
  return [
    {
      label: "推荐位",
      value: formatNumber(slotsTotal || 0),
      detail: "当前由编辑后台直接维护的推荐位数量。",
      tone: "accent",
    },
    {
      label: "榜单规则",
      value: rankingsLoaded ? formatNumber(rankingsTotal || 0) : "打开标签后加载",
      detail: rankingsLoaded ? "当前已配置的榜单规则数量。" : "只有打开“榜单规则”标签后才会加载。",
    },
    {
      label: "分析记录",
      value: analyticsLoaded ? formatNumber(analyticsTotal || 0) : "打开标签后加载",
      detail: analyticsLoaded ? "当前已加载的推荐位表现记录数。" : "只有打开“表现分析”标签后才会加载。",
    },
  ];
}
