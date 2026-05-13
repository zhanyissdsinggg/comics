"use client";

export const searchFields = [
  { field: "id", type: "string" },
  { field: "title", type: "string" },
  { field: "content", type: "string" },
];

export const sortFields = [
  { field: "createdAt", type: "date" },
  { field: "title", type: "string" },
];

export const sortOptions = [
  { value: "createdAt", label: "创建时间" },
  { value: "title", label: "标题" },
];

export function getContentPreview(content) {
  const text = String(content || "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 120
    ? `${text.slice(0, 120)}...`
    : text || "暂无通知正文";
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

export function buildNotificationsMetricCards({
  total,
  titledCount,
  bodyCount,
}) {
  return [
    {
      label: "当前通知",
      value: String(total),
      detail: "当前搜索和排序条件下的通知数量。",
      tone: "accent",
    },
    {
      label: "有标题",
      value: String(titledCount),
      detail: "已经具备读者可见标题的通知。",
    },
    {
      label: "有正文",
      value: String(bodyCount),
      detail: "包含正文而不只是标题壳子的通知。",
    },
  ];
}
