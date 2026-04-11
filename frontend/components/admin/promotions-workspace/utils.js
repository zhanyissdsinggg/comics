"use client";

export const searchFields = [
  { field: "id", type: "string" },
  { field: "title", type: "string" },
];

export const sortFields = [
  { field: "createdAt", type: "date" },
  { field: "title", type: "string" },
  { field: "active", type: "boolean" },
];

export const sortOptions = [
  { value: "createdAt", label: "创建时间" },
  { value: "title", label: "标题" },
  { value: "active", label: "状态" },
];

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

export function getStatusLabel(isActive) {
  return isActive ? "进行中" : "已暂停";
}

export function getStatusTone(isActive) {
  return isActive ? "success" : "default";
}

export function buildPromotionsMetricCards({ total, activeCount, pausedCount }) {
  return [
    {
      label: "当前活动",
      value: String(total),
      detail: "当前搜索和排序条件下的活动数量。",
      tone: "accent",
    },
    {
      label: "进行中",
      value: String(activeCount),
      detail: "在当前结果里仍标记为在线的活动。",
    },
    {
      label: "已暂停",
      value: String(pausedCount),
      detail: "已保留但当前没有继续运行的活动。",
    },
  ];
}
