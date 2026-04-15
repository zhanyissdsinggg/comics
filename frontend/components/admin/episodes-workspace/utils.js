"use client";

import { adminFetchJson, normalizeAdminErrorMessage } from "@/lib/adminApiClient";

export const EMPTY_FEEDBACK = { type: "", message: "" };

export const EMPTY_NEW_EPISODE = {
  number: "",
  title: "",
  previewFreePages: "0",
  pricePts: "0",
  ttfEligible: false,
};

export const EMPTY_BULK_FORM = {
  previewFreePages: "",
  pricePts: "",
  ttfEligible: "unchanged",
};

export const QUICK_FILTERS = [
  {
    id: "all",
    label: "全部章节",
    filters: { priceType: "all", previewStatus: "all", ttfEligible: "all" },
  },
  {
    id: "preview",
    label: "含试看页",
    filters: { priceType: "all", previewStatus: "enabled", ttfEligible: "all" },
  },
  {
    id: "free",
    label: "免费章节",
    filters: { priceType: "free", previewStatus: "all", ttfEligible: "all" },
  },
  {
    id: "paid",
    label: "付费章节",
    filters: { priceType: "paid", previewStatus: "all", ttfEligible: "all" },
  },
];

export const SORT_OPTIONS = [
  { value: "number", label: "章节号" },
  { value: "updatedAt", label: "更新时间" },
  { value: "releasedAt", label: "发布时间" },
  { value: "title", label: "标题" },
  { value: "previewFreePages", label: "试看页数" },
];

export function normalizeParam(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
}

export function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isNonNegativeIntegerString(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return allowEmpty;
  }

  return /^\d+$/.test(normalized);
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

export function getErrorMessage(error, fallbackMessage) {
  return normalizeAdminErrorMessage(error, fallbackMessage);
}

export function getDateValue(value) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isRecentlyUpdated(value, days = 30) {
  const dateValue = getDateValue(value);
  if (!dateValue) {
    return false;
  }

  return dateValue >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function buildEpisodesQuery({ searchTerm, sortBy, sortOrder, page, pageSize, filters }) {
  const params = new URLSearchParams();

  if (searchTerm) {
    params.set("search", searchTerm);
  }

  params.set("sortBy", sortBy);
  params.set("sortOrder", sortOrder);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  if (filters.priceType && filters.priceType !== "all") {
    params.set("priceType", filters.priceType);
  }
  if (filters.previewStatus && filters.previewStatus !== "all") {
    params.set("previewStatus", filters.previewStatus);
  }
  if (filters.ttfEligible && filters.ttfEligible !== "all") {
    params.set("ttfEligible", filters.ttfEligible);
  }

  return params.toString();
}

export async function fetchSeriesDetail(seriesId) {
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "作品详情加载失败。");
  }

  return data?.series || null;
}

export async function fetchEpisodes(seriesId, options) {
  const query = buildEpisodesQuery(options);
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}/episodes?${query}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "章节列表加载失败。");
  }

  return {
    episodes: Array.isArray(data?.episodes) ? data.episodes : [],
    pagination: data?.pagination || {
      page: options.page,
      pageSize: options.pageSize,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}

export function validateNewEpisodeDraft(newEpisode) {
  if (!isNonNegativeIntegerString(newEpisode.number) || !String(newEpisode.title || "").trim()) {
    return "章节号和标题不能为空。";
  }

  if (
    !isNonNegativeIntegerString(newEpisode.previewFreePages, { allowEmpty: true }) ||
    !isNonNegativeIntegerString(newEpisode.pricePts, { allowEmpty: true })
  ) {
    return "试看页数和附加发行设置必须是非负整数。";
  }

  return "";
}

export function buildCreateEpisodePayload(newEpisode) {
  return {
    number: toInteger(newEpisode.number, 1),
    title: newEpisode.title.trim(),
    previewFreePages: toInteger(newEpisode.previewFreePages, 0),
    pricePts: toInteger(newEpisode.pricePts, 0),
    ttfEligible: Boolean(newEpisode.ttfEligible),
  };
}

export function buildBulkUpdatePayload({ bulkForm, showBulkCommercialFields }) {
  const updates = {};

  if (bulkForm.previewFreePages !== "") {
    if (!isNonNegativeIntegerString(bulkForm.previewFreePages)) {
      return { updates: null, errorMessage: "批量试看页数必须是非负整数。" };
    }
    updates.previewFreePages = toInteger(bulkForm.previewFreePages, 0);
  }

  if (showBulkCommercialFields && bulkForm.pricePts !== "") {
    if (!isNonNegativeIntegerString(bulkForm.pricePts)) {
      return { updates: null, errorMessage: "批量点数价格必须是非负整数。" };
    }
    updates.pricePts = toInteger(bulkForm.pricePts, 0);
  }

  if (showBulkCommercialFields) {
    if (bulkForm.ttfEligible === "true") {
      updates.ttfEligible = true;
    } else if (bulkForm.ttfEligible === "false") {
      updates.ttfEligible = false;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { updates: null, errorMessage: "至少选择一项要更新的内容。" };
  }

  return { updates, errorMessage: "" };
}

export function getPageStats(episodes, selectedCount) {
  const previewCount = episodes.filter((episode) => toInteger(episode.previewFreePages, 0) > 0).length;
  const recentUpdateCount = episodes.filter((episode) =>
    isRecentlyUpdated(episode.updatedAt || episode.releasedAt, 30),
  ).length;

  return {
    previewCount,
    recentUpdateCount,
    selectedCount,
  };
}

export function getQuickFilterId(filters) {
  const matched = QUICK_FILTERS.find(
    (item) =>
      item.filters.priceType === filters.priceType &&
      item.filters.previewStatus === filters.previewStatus &&
      item.filters.ttfEligible === filters.ttfEligible,
  );

  return matched?.id || "custom";
}
