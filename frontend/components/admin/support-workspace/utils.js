"use client";

export const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "open", label: "待处理" },
  { value: "in_progress", label: "处理中" },
  { value: "closed", label: "已关闭" },
  { value: "OPEN", label: "待处理（旧状态）" },
  { value: "IN_PROGRESS", label: "处理中（旧状态）" },
  { value: "CLOSED", label: "已关闭（旧状态）" },
];

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

export function getStatusLabel(status) {
  switch (String(status || "").toLowerCase()) {
    case "open":
      return "待处理";
    case "in_progress":
      return "处理中";
    case "closed":
      return "已关闭";
    default:
      return status || "未知";
  }
}

export function getStatusTone(status) {
  switch (String(status || "").toLowerCase()) {
    case "open":
      return "warning";
    case "in_progress":
      return "accent";
    case "closed":
      return "success";
    default:
      return "default";
  }
}

export function getMessagePreview(message, limit = 140) {
  const normalized = String(message || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "未附带消息内容。";
  }

  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

export function buildSupportMetricCards({ total, openCount, pendingReplies }) {
  return [
    {
      label: "当前视图工单数",
      value: String(total),
      detail: "当前搜索和状态筛选后的工单总量。",
      tone: "accent",
    },
    {
      label: "待处理工单",
      value: String(openCount),
      detail: "还没有拿到首次回复的读者工单。",
    },
    {
      label: "仍需跟进",
      value: String(pendingReplies),
      detail: "尚未关闭、还可能需要继续处理的工单。",
    },
  ];
}
