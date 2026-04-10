"use client";

import { resolveSeriesCreatorIdentity } from "../../../lib/creatorIdentity";

export const TYPE_TABS = [
  { value: "all", label: "全部形式" },
  { value: "comic", label: "漫画" },
  { value: "novel", label: "小说" },
];

export const STATUS_OPTIONS = ["Ongoing", "Completed", "Hiatus", "Cancelled"];

export const DEFAULT_FILTERS = {
  status: "all",
  publishStatus: "all",
  adultContent: "all",
  sortBy: "createdAt_desc",
};

export const EMPTY_FEEDBACK = { type: "", message: "" };

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const QUICK_FILTERS = [
  { value: "all", label: "全部作品" },
  { value: "needsMetadata", label: "待补基础信息" },
  { value: "noAuthor", label: "缺少创作者署名" },
  { value: "needsEpisodes", label: "还没有章节" },
  { value: "noCover", label: "缺少封面" },
  { value: "draft", label: "仅看草稿" },
  { value: "adult", label: "18+" },
];

export const CREATE_FLOW_OPTIONS = [
  { value: "stay", label: "留在当前页", helper: "继续在作品列表里处理下一部作品。" },
  { value: "details", label: "打开详情页", helper: "继续补充作品信息、封面和署名。" },
  { value: "episodes", label: "前往章节管理", helper: "下一步直接开始添加漫画章节或小说内容。" },
];

export function createEmptyCreateForm() {
  return {
    title: "",
    author: "",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "",
    genres: "",
    isPublished: true,
    openAfterCreate: "episodes",
    coverFile: null,
    coverPreviewUrl: "",
  };
}

export function revokeObjectUrl(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function slugifyTitle(title) {
  const slug = String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "series";
}

export function createSeriesId(title) {
  return `${slugifyTitle(title)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeGenresInput(value) {
  return String(value || "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);
}

export function normalizeSeries(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};
  const creatorIdentity = resolveSeriesCreatorIdentity(source);

  return {
    id: String(source.id || `series-${index + 1}`),
    title: String(source.title || "未命名作品"),
    author: String(source.author || ""),
    creatorLabel: creatorIdentity.hasPublicCredit ? creatorIdentity.displayName : "",
    creatorHref: creatorIdentity.hasPublicCredit ? creatorIdentity.href : "",
    hasPublicCreator: creatorIdentity.hasPublicCredit,
    type: source.type === "novel" ? "novel" : "comic",
    status: STATUS_OPTIONS.includes(source.status) ? source.status : "Ongoing",
    adult: Boolean(source.adult),
    description: String(source.description || ""),
    coverUrl: String(source.coverUrl || source.coverImage || ""),
    coverTone: String(source.coverTone || ""),
    genres: Array.isArray(source.genres) ? source.genres.filter(Boolean) : [],
    latestEpisodeId: String(source.latestEpisodeId || ""),
    episodeCount: toNumber(
      source.episodeCount ?? source?._count?.episodes ?? source.totalEpisodes,
      0,
    ),
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || source.createdAt || null,
    isPublished: source.isPublished !== undefined ? Boolean(source.isPublished) : true,
    isFeatured: Boolean(source.isFeatured),
  };
}

export function buildSeriesPayload(series, overrides = {}) {
  const merged = { ...series, ...overrides };

  return {
    id: merged.id,
    title: String(merged.title || "").trim(),
    author: String(merged.author || "").trim(),
    type: merged.type === "novel" ? "novel" : "comic",
    status: STATUS_OPTIONS.includes(merged.status) ? merged.status : "Ongoing",
    adult: Boolean(merged.adult),
    description: String(merged.description || "").trim(),
    coverUrl: String(merged.coverUrl || "").trim(),
    coverTone: String(merged.coverTone || "").trim(),
    genres: Array.isArray(merged.genres) ? merged.genres.filter(Boolean) : [],
    latestEpisodeId: String(merged.latestEpisodeId || ""),
    isPublished: Boolean(merged.isPublished),
    isFeatured: Boolean(merged.isFeatured),
  };
}

export function formatUpdatedAt(value, compact = false) {
  if (!value) return "尚未更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未更新";

  return new Intl.DateTimeFormat(
    "zh-CN",
    compact
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  ).format(date);
}

export function formatSeriesTypeLabel(type) {
  return type === "novel" ? "小说" : "漫画";
}

export function formatSeriesStatusLabel(status) {
  if (status === "Completed") return "已完结";
  if (status === "Hiatus") return "休更中";
  if (status === "Cancelled") return "已下线";
  return "连载中";
}

export function buildQueryString(search, typeFilter, filters) {
  const params = new URLSearchParams();

  if (search) params.set("search", search);
  if (typeFilter !== "all") params.set("type", typeFilter);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.publishStatus !== "all") params.set("publishStatus", filters.publishStatus);
  if (filters.adultContent === "adult") params.set("adult", "true");
  if (filters.adultContent === "general") params.set("adult", "false");

  params.set("sortBy", filters.sortBy || DEFAULT_FILTERS.sortBy);
  params.set("page", "1");
  params.set("limit", "100");
  return params.toString();
}

export function sortSeries(list, sortBy) {
  const items = [...list];
  const [field, direction] = String(sortBy || DEFAULT_FILTERS.sortBy).split("_");
  const sign = direction === "asc" ? 1 : -1;

  return items.sort((left, right) => {
    if (field === "title") return left.title.localeCompare(right.title) * sign;
    if (field === "updatedAt") {
      return (
        (new Date(left.updatedAt || 0).getTime() - new Date(right.updatedAt || 0).getTime()) *
        sign
      );
    }
    if (field === "createdAt") {
      return (
        (new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()) *
        sign
      );
    }
    if (field === "episodeCount") {
      return (toNumber(left.episodeCount) - toNumber(right.episodeCount)) * sign;
    }
    return 0;
  });
}

export function extractSeriesCollection(payload) {
  if (Array.isArray(payload?.series)) {
    return payload.series;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}
