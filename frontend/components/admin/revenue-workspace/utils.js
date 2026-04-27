"use client";

import { adminFetchJson } from "@/lib/adminApiClient";
import { normalizeUSDisplayCurrency } from "@/lib/localization";

export const EMPTY_MESSAGE = "当前时间范围内还没有收入数据。";

export const REVENUE_TABS = [
  { value: "overview", label: "总览" },
  { value: "trend", label: "趋势" },
  { value: "channels", label: "渠道" },
  { value: "promotions", label: "活动" },
];

export async function fetchAdminJson(path) {
  try {
    const { response, data } = await adminFetchJson(path, {
      cache: "no-store",
    });

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: {},
    };
  }
}

export function extractList(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

export function normalizeOrderStatus(status) {
  return String(status || "").toUpperCase();
}

export function isPaidOrder(status) {
  const normalizedStatus = normalizeOrderStatus(status);
  return normalizedStatus === "PAID" || normalizedStatus === "COMPLETED";
}

export function isRefundedOrder(status) {
  return normalizeOrderStatus(status) === "REFUNDED";
}

export function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPercentage(value) {
  return value === null || value === undefined ? "暂无" : `${value}%`;
}

export function dateKeyFromIso(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function toDateInputValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatCurrency(value, currency = "USD") {
  const amount = Number(value || 0) / 100;
  const normalizedCurrency = normalizeUSDisplayCurrency(currency);

  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatCount(value) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function formatLabel(value, fallback = "未命名渠道") {
  const rawValue = String(value || "").trim();
  if (!rawValue || rawValue.toLowerCase() === "unknown") {
    return fallback;
  }

  return rawValue
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function markUnavailable(defaultValue) {
  if (defaultValue && typeof defaultValue === "object" && !Array.isArray(defaultValue)) {
    return { ...defaultValue, __unavailable: true };
  }

  return { value: defaultValue, __unavailable: true };
}

export async function loadRevenueResource(path, defaultValue) {
  const result = await fetchAdminJson(path);
  if (result.ok) {
    return result.data;
  }

  if (result.status === 404) {
    // Revenue endpoints should exist in stable deployments. If they don't, do not fabricate
    // "best effort" revenue numbers from unrelated endpoints; surface an explicit empty state.
    return markUnavailable(defaultValue);
  }

  return defaultValue;
}

export function viewMeta(tab) {
  switch (tab) {
    case "trend":
      return {
        title: "收入趋势",
        description: "按天看收入波动和支付完成订单。",
      };
    case "channels":
      return {
        title: "渠道表现",
        description: "看清带来收入的支付或购买渠道。",
      };
    case "promotions":
      return {
        title: "活动表现",
        description: "查看活动收入和归因限制。",
      };
    default:
      return {
        title: "收入总览",
        description: "阅读收入、退款、读者层级和订单结果。",
      };
  }
}
