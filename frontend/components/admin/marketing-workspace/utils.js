"use client";

import { adminFetchJson, normalizeAdminErrorMessage } from "@/lib/adminApiClient";

export const MARKETING_TABS = [
  { value: "campaigns", label: "活动目录" },
  { value: "stats", label: "总览" },
  { value: "by-segment", label: "分人群" },
  { value: "by-type", label: "分类型" },
];

export const INITIAL_FORM = {
  name: "",
  description: "",
  type: "email",
  status: "draft",
  targetSegment: "all",
  budget: "",
  startDate: "",
  endDate: "",
};

export const EMPTY_FEEDBACK = { type: "", message: "" };

export const TYPE_OPTIONS = ["email", "push", "banner", "discount"];
export const STATUS_OPTIONS = ["draft", "active", "paused", "completed"];
export const SEGMENT_OPTIONS = ["all", "vip", "new", "at-risk", "high-value"];

export function formatCampaignTypeLabel(value) {
  if (value === "push") return "推送";
  if (value === "banner") return "横幅";
  if (value === "discount") return "折扣";
  return "邮件";
}

export function formatCampaignStatusLabel(value) {
  if (value === "active") return "进行中";
  if (value === "paused") return "已暂停";
  if (value === "completed") return "已完成";
  return "草稿";
}

export function formatSegmentLabel(value) {
  if (value === "vip") return "核心付费读者";
  if (value === "new") return "新读者";
  if (value === "at-risk") return "流失风险读者";
  if (value === "high-value") return "高价值读者";
  return "全部读者";
}

export function getErrorMessage(error, fallback) {
  return normalizeAdminErrorMessage(error, fallback);
}

export function formatCurrency(value) {
  const amount = Number(value || 0) / 100;
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("zh-CN").format(Number.isFinite(amount) ? amount : 0);
}

export function formatPercent(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(1)}%`;
}

export function formatDate(value, fallback = "未安排") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日期无效";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function getStatusTone(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "completed":
      return "accent";
    default:
      return "default";
  }
}

export function getCampaignMetrics(campaign) {
  const latest = Array.isArray(campaign?.analytics) ? campaign.analytics[0] : null;
  return {
    revenue: Number(latest?.revenue || 0),
    converted: Number(latest?.converted || 0),
    roi: Number(latest?.roi || 0),
  };
}

export async function requestPayload(path, init = {}) {
  const { response, data } = await adminFetchJson(path, init);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `请求失败，状态码 ${response.status}。`);
  }
  return data || {};
}

export function buildDateQuery(dateRange) {
  const params = new URLSearchParams();
  if (dateRange.startDate) params.set("startDate", dateRange.startDate);
  if (dateRange.endDate) params.set("endDate", dateRange.endDate);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function buildCampaignPayload(formData) {
  return {
    name: formData.name.trim(),
    description: formData.description.trim() || undefined,
    type: formData.type || "email",
    status: formData.status || "draft",
    targetSegment: formData.targetSegment || "all",
    budget: formData.budget === "" ? undefined : Number(formData.budget),
    startDate: formData.startDate || undefined,
    endDate: formData.endDate || undefined,
  };
}

export function tabMeta(tabKey) {
  switch (tabKey) {
    case "stats":
      return {
        title: "表现总览",
        description: "用紧凑视图看清所选时间范围内的预算、花费、收入和转化。",
      };
    case "by-segment":
      return {
        title: "人群表现",
        description: "对比不同读者人群的活动效果。",
      };
    case "by-type":
      return {
        title: "类型表现",
        description: "先看哪种投放类型更有效。",
      };
    default:
      return {
        title: "活动目录",
        description: "查看范围、排期、花费和结果。",
      };
  }
}
