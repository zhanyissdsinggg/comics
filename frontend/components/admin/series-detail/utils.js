"use client";

import { adminFetchJson, normalizeAdminErrorMessage } from "@/lib/adminApiClient";

export const TYPE_OPTIONS = [
  { value: "comic", label: "漫画" },
  { value: "novel", label: "小说" },
];

export const STATUS_OPTIONS = [
  { value: "Ongoing", label: "连载中" },
  { value: "Completed", label: "已完结" },
  { value: "Hiatus", label: "休更中" },
  { value: "Cancelled", label: "已下架" },
];

export const CREDIT_ROLE_OPTIONS = [
  { value: "AUTHOR", label: "作者" },
  { value: "WRITER", label: "编剧" },
  { value: "ARTIST", label: "主笔" },
  { value: "ADAPTER", label: "改编" },
  { value: "TEAM", label: "团队" },
  { value: "STUDIO", label: "工作室" },
  { value: "CREATOR", label: "创作" },
];

export const CREDIT_TYPE_OPTIONS = [
  { value: "person", label: "个人" },
  { value: "team", label: "团队" },
  { value: "studio", label: "工作室" },
];

export const EMPTY_FEEDBACK = { type: "", message: "" };
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function normalizeParam(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
}

export function createEmptyForm() {
  return {
    title: "",
    type: "comic",
    status: "Ongoing",
    adult: false,
    isPublished: true,
    description: "",
    genres: "",
    coverUrl: "",
    coverTone: "",
  };
}

export function createEmptyCreditRow(index = 0) {
  return {
    id: `draft-credit-${Date.now()}-${index}`,
    creatorId: "",
    name: "",
    role: "AUTHOR",
    type: "person",
    sortOrder: index,
    isPrimary: index === 0,
    isPublic: true,
  };
}

export function buildFormState(series) {
  return {
    title: series?.title || "",
    type: series?.type || "comic",
    status: series?.status || "Ongoing",
    adult: Boolean(series?.adult),
    isPublished: series?.isPublished !== undefined ? Boolean(series.isPublished) : true,
    description: series?.description || "",
    genres: Array.isArray(series?.genres) ? series.genres.join(", ") : "",
    coverUrl: series?.coverUrl || "",
    coverTone: series?.coverTone || "",
  };
}

export function buildCreditsState(credits) {
  const rows = (Array.isArray(credits) ? credits : [])
    .filter(Boolean)
    .map((credit, index) => ({
      id: String(credit?.id || `credit-${index + 1}`),
      creatorId: String(credit?.creatorId || ""),
      name: String(credit?.name || ""),
      role: String(credit?.role || "author").toUpperCase(),
      type: String(credit?.type || "person").toLowerCase(),
      sortOrder: Number(credit?.sortOrder ?? index) || index,
      isPrimary: Boolean(credit?.isPrimary),
      isPublic: credit?.isPublic !== false,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  if (rows.length === 0) {
    return [createEmptyCreditRow(0)];
  }

  const hasPrimary = rows.some((row) => row.isPrimary);
  return rows.map((row, index) => ({
    ...row,
    sortOrder: index,
    isPrimary: hasPrimary ? row.isPrimary : index === 0,
  }));
}

export function normalizeGenresInput(value) {
  return String(value || "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);
}

export function buildSeriesPayload(formData) {
  return {
    title: formData.title.trim(),
    type: formData.type || "comic",
    status: formData.status || "Ongoing",
    adult: Boolean(formData.adult),
    isPublished: Boolean(formData.isPublished),
    description: formData.description.trim(),
    genres: normalizeGenresInput(formData.genres),
    coverUrl: formData.coverUrl.trim(),
    coverTone: formData.coverTone.trim(),
  };
}

export function buildCreditsPayload(credits) {
  const normalizedRows = (Array.isArray(credits) ? credits : [])
    .map((credit, index) => ({
      creatorId: String(credit?.creatorId || "").trim(),
      name: String(credit?.name || "").trim(),
      role: String(credit?.role || "AUTHOR").trim().toUpperCase(),
      type: String(credit?.type || "person").trim().toLowerCase(),
      sortOrder: Number(credit?.sortOrder ?? index) || index,
      isPrimary: Boolean(credit?.isPrimary),
      isPublic: credit?.isPublic !== false,
    }))
    .filter((credit) => credit.name);

  const firstPublicIndex = normalizedRows.findIndex((credit) => credit.isPublic);
  const hasPrimary = normalizedRows.some((credit) => credit.isPrimary && credit.isPublic);

  return normalizedRows.map((credit, index) => ({
    ...credit,
    sortOrder: index,
    isPrimary: hasPrimary
      ? credit.isPrimary && credit.isPublic
      : index === (firstPublicIndex >= 0 ? firstPublicIndex : 0) && credit.isPublic,
  }));
}

export function validateSeriesDraft(formData) {
  if (!formData.title.trim()) {
    return "作品标题不能为空。";
  }

  return "";
}

export function validateCreditsDraft(credits) {
  const namedCredits = (Array.isArray(credits) ? credits : []).filter((credit) =>
    String(credit?.name || "").trim(),
  );

  if (namedCredits.length === 0) {
    return "";
  }

  const hasPrimaryPublicCredit = namedCredits.some(
    (credit) => credit.isPrimary && credit.isPublic,
  );

  if (!hasPrimaryPublicCredit) {
    return "至少保留一条公开主署名，前台作品页和创作者页才有稳定身份。";
  }

  return "";
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

export async function fetchSeriesCredits(seriesId) {
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}/credits`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "创作者署名加载失败。");
  }

  return {
    credits: Array.isArray(data?.credits) ? data.credits : [],
    creator: data?.creator || null,
    author: String(data?.author || ""),
  };
}

export function buildCreatorPreviewLabel(publicCredits, authorFallback = "") {
  if (!publicCredits.length) {
    return authorFallback || "待补全";
  }

  const primaryCredit = publicCredits.find((credit) => credit.isPrimary) || publicCredits[0];
  if (!primaryCredit) {
    return "待补全";
  }

  if (publicCredits.length === 1) {
    return primaryCredit.name;
  }

  if (publicCredits.length === 2) {
    return `${publicCredits[0].name} 与 ${publicCredits[1].name}`;
  }

  return `${primaryCredit.name} 等 ${publicCredits.length} 位`;
}

export function buildSeriesInsightState({
  series,
  formData,
  publicCredits,
  creatorPreviewLabel,
  readiness,
  authorFallback,
}) {
  const normalizedGenres = normalizeGenresInput(formData.genres);
  const descriptionLength = formData.description.trim().length;
  const coverStatus = formData.coverUrl.trim() ? "封面已就绪" : "封面待补";
  const synopsisStatus = descriptionLength > 0 ? `简介 ${descriptionLength} 字` : "简介待补";
  const genreStatus = normalizedGenres.length > 0 ? `${normalizedGenres.length} 个标签` : "标签待补";
  const hasLegacyAuthorFallback = !publicCredits.length && Boolean(authorFallback);

  const creatorStatusDetail = publicCredits.length
    ? `${publicCredits.length} 条公开署名 · ${coverStatus} · ${genreStatus}`
    : hasLegacyAuthorFallback
      ? "当前仍由旧 author 字段兼容兜底，建议尽快迁移到真实署名。"
      : "当前还缺少可公开展示的创作者署名。";

  return {
    normalizedGenres,
    descriptionLength,
    coverStatus,
    synopsisStatus,
    genreStatus,
    hasLegacyAuthorFallback,
    creatorStatusDetail,
    summaryCards: [
      {
        label: "章节数",
        value: String(series?.episodeCount || 0),
        detail: series?.latestEpisodeId
          ? `最新章节：${series.latestEpisodeId}`
          : "还没有章节。",
        tone: "accent",
      },
      {
        label: "发布状态",
        value: formData.isPublished ? "已发布" : "草稿",
        detail: formData.adult ? "当前开启 18+ 限制。" : "当前为常规内容模式。",
      },
      {
        label: "创作者",
        value: creatorPreviewLabel,
        detail: creatorStatusDetail,
      },
      {
        label: "前台就绪度",
        value: readiness.score,
        detail: readiness.summary,
      },
    ],
    recordItems: [
      { label: "作品编号", value: series?.id || "暂无" },
      { label: "创建时间", value: formatDateTime(series?.createdAt) },
      { label: "最近更新", value: formatDateTime(series?.updatedAt) },
      { label: "最新章节", value: series?.latestEpisodeId || "暂无" },
      { label: "封面状态", value: coverStatus },
      { label: "简介状态", value: synopsisStatus },
      { label: "标签状态", value: genreStatus },
    ],
  };
}
