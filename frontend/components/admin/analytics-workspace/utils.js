"use client";

import { normalizeAdminErrorMessage, adminFetchJson } from "@/lib/adminApiClient";

export const VIEW_TABS = [
  { value: "stats", label: "总览" },
  { value: "segments", label: "读者分群" },
  { value: "user-detail", label: "用户详情" },
];

export const SEGMENT_FILTERS = [
  { key: "all", label: "全部读者" },
  { key: "vip", label: "重点会员" },
  { key: "high-value", label: "高价值用户" },
  { key: "at-risk", label: "流失风险用户" },
];

export function getErrorMessage(error, fallbackMessage) {
  return normalizeAdminErrorMessage(error, fallbackMessage);
}

export function formatCurrency(value) {
  const amount = Number(value || 0) / 100;
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatPercent(value) {
  if (typeof value === "string" && value.trim()) {
    return value.includes("%") ? value : `${value}%`;
  }

  const amount = Number(value || 0);
  return `${amount.toFixed(1)}%`;
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

export function formatNumber(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("zh-CN").format(Number.isFinite(amount) ? amount : 0);
}

export function getSegmentLabel(segment) {
  return SEGMENT_FILTERS.find((item) => item.key === segment)?.label || "自定义分群";
}

export function formatChurnRiskLabel(churnRisk) {
  switch (String(churnRisk || "").toLowerCase()) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
    default:
      return "未知";
  }
}

export function getChurnTone(churnRisk) {
  switch (String(churnRisk || "").toLowerCase()) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "danger";
    default:
      return "default";
  }
}

export async function fetchAnalyticsAdminPayload(path) {
  const { response, data } = await adminFetchJson(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `请求失败，状态码 ${response.status}。`);
  }

  return data || {};
}

export function buildStatsCards(stats) {
  return [
    {
      label: "读者总数",
      value: formatNumber(stats?.totalUsers),
      detail: "当前已注册的读者账号总量。",
      tone: "accent",
    },
    {
      label: "活跃读者",
      value: formatNumber(stats?.activeUsers),
      detail: "当前分析窗口内仍有活跃行为的账号。",
    },
    {
      label: "活跃率",
      value: formatPercent(stats?.activeRate),
      detail: "最近仍有活跃行为的读者占比。",
    },
    {
      label: "高价值读者",
      value: formatNumber(stats?.highValueUsers),
      detail: "已经跨过生命周期价值阈值的账号数量。",
    },
    {
      label: "流失风险读者",
      value: formatNumber(stats?.atRiskUsers),
      detail: "近期可能需要留存干预的读者。",
    },
    {
      label: "已归因收入",
      value: formatCurrency(stats?.totalRevenue),
      detail: "当前已追踪读者样本对应的收入。",
    },
  ];
}

export function buildStatsInsights(stats) {
  return [
    {
      title: "留存观察",
      message:
        Number(stats?.atRiskUsers || 0) > 0
          ? `当前有 ${formatNumber(stats?.atRiskUsers)} 位读者看起来需要尽快做留存处理。`
          : "当前最新快照里还没有明显的高风险流失信号。",
    },
    {
      title: "收入密度",
      message:
        Number(stats?.highValueUsers || 0) > 0
          ? `高价值读者的人均消费约为 ${formatCurrency(
              Number(stats?.totalRevenue || 0) / Number(stats?.highValueUsers || 1),
            )}。`
          : "等当前数据里出现高价值读者后，这里会自动更新。",
    },
    {
      title: "活跃脉搏",
      message:
        Number(stats?.activeUsers || 0) > 0
          ? `当前窗口内有 ${formatNumber(stats?.activeUsers)} 位读者产生了近期活跃行为。`
          : "最新快照里还没有记录到近期活跃行为。",
    },
  ];
}
