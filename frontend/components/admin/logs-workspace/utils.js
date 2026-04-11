"use client";

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

export function summarizeDetails(value) {
  if (!value) {
    return "暂无详情";
  }

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const entries = Object.entries(parsed || {}).slice(0, 3);

    if (!entries.length) {
      return "暂无详情";
    }

    return entries.map(([key, item]) => `${key}: ${String(item)}`).join(" | ");
  } catch {
    return String(value).slice(0, 160);
  }
}

export function getAdminIdentity(log) {
  return log.adminId || log.userId || "";
}

export function buildLogsMetricCards({ total, actionCount, adminCount }) {
  return [
    {
      label: "当前日志",
      value: String(total),
      detail: "符合当前搜索和筛选条件的记录数量。",
      tone: "accent",
    },
    {
      label: "动作类型",
      value: String(actionCount),
      detail: "当前数据里出现过的动作种类。",
    },
    {
      label: "操作者",
      value: String(adminCount),
      detail: "日志里出现过的后台账号或回退身份数量。",
    },
  ];
}
