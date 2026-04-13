"use client";

export const searchFields = [
  { field: "id", type: "string" },
  { field: "userId", type: "string" },
  { field: "userEmail", type: "string" },
  { field: "content", type: "string" },
  { field: "text", type: "string" },
];

export const sortFields = [
  { field: "createdAt", type: "date" },
  { field: "userId", type: "string" },
  { field: "rating", type: "number" },
];

export const sortOptions = [
  { value: "createdAt", label: "创建时间" },
  { value: "rating", label: "评分" },
  { value: "userId", label: "读者编号" },
];

export function getContentPreview(content) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 120)}...` : text || "暂无评论内容";
}

export function formatDate(value) {
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
  }).format(date);
}

export function formatRating(value) {
  if (value === null || value === undefined || value === "") {
    return "未评分";
  }

  const rating = Number(value);
  if (!Number.isFinite(rating)) {
    return "未评分";
  }

  return `${rating}/5`;
}

export function buildCommentsMetricCards({ total, ratedCount, uniqueReaders }) {
  return [
    {
      label: "当前评论",
      value: String(total),
      detail: "按当前搜索和排序条件统计。",
      tone: "accent",
    },
    {
      label: "含评分评论",
      value: String(ratedCount),
      detail: "同时包含文字反馈和评分的评论数量。",
    },
    {
      label: "当前读者数",
      value: String(uniqueReaders),
      detail: "当前视图里涉及到的唯一读者数量。",
    },
  ];
}
