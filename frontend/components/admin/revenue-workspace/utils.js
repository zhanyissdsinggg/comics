"use client";

import { adminFetchJson } from "@/lib/adminApiClient";
import { normalizeUSDisplayCurrency } from "@/lib/localization";

export const LEGACY_REVENUE_CACHE_TTL_MS = 60_000;
export const EMPTY_MESSAGE = "当前时间范围内还没有收入数据。";
const legacyRevenueCache = new Map();

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
  const amount = Number(value || 0);
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

export async function loadRevenueResource(path, dateRange, fallbackSelector, defaultValue) {
  const result = await fetchAdminJson(path);
  if (result.ok) {
    return result.data;
  }

  if (result.status === 404) {
    const fallback = await getLegacyRevenueFallback(dateRange);
    return fallbackSelector(fallback);
  }

  return defaultValue;
}

export async function getLegacyRevenueFallback(dateRange) {
  const cacheKey = `${dateRange.startDate || ""}:${dateRange.endDate || ""}`;
  const now = Date.now();
  const cached = legacyRevenueCache.get(cacheKey);

  if (cached && now - cached.ts < LEGACY_REVENUE_CACHE_TTL_MS) {
    return cached.value;
  }

  const dateParams = new URLSearchParams({
    from: dateRange.startDate || "",
    to: dateRange.endDate || "",
  });

  const [dashboardRes, dailyStatsRes, promotionsRes, ordersRes] = await Promise.all([
    fetchAdminJson(`/api/admin/stats/dashboard?${dateParams}`),
    fetchAdminJson(`/api/admin/stats?${dateParams}`),
    fetchAdminJson("/api/admin/promotions?page=1&pageSize=100"),
    fetchAdminJson("/api/admin/orders?page=1&pageSize=100"),
  ]);

  const dashboard = dashboardRes?.data || {};
  const dailyStats = extractList(dailyStatsRes?.data, ["stats"]);
  const promotions = extractList(promotionsRes?.data, ["promotions", "data"]);
  const orders = extractList(ordersRes?.data, ["orders", "data"]);

  let paidRevenue = 0;
  let refundedRevenue = 0;
  let paidCount = 0;
  const orderStatus = {
    pending: 0,
    paid: 0,
    failed: 0,
    refunded: 0,
  };

  const channelMap = new Map();
  const userSpendMap = new Map();
  const trendMap = new Map();

  for (const order of orders) {
    const amount = toNumber(order?.amount);
    const status = normalizeOrderStatus(order?.status);

    if (status === "PENDING") orderStatus.pending += 1;
    else if (isPaidOrder(status)) orderStatus.paid += 1;
    else if (isRefundedOrder(status)) orderStatus.refunded += 1;
    else orderStatus.failed += 1;

    if (isPaidOrder(status)) {
      paidRevenue += amount;
      paidCount += 1;

      const channel = String(order?.channel || order?.provider || "unknown");
      const currentChannel = channelMap.get(channel) || { channel, orders: 0, revenue: 0 };
      currentChannel.orders += 1;
      currentChannel.revenue += amount;
      channelMap.set(channel, currentChannel);

      const userId = String(order?.userId || order?.readerId || "");
      if (userId) {
        userSpendMap.set(userId, (userSpendMap.get(userId) || 0) + amount);
      }

      const dateKey = dateKeyFromIso(order?.paidAt || order?.updatedAt || order?.createdAt);
      if (dateKey) {
        const trend = trendMap.get(dateKey) || { date: dateKey, revenue: 0, orders: 0 };
        trend.revenue += amount;
        trend.orders += 1;
        trendMap.set(dateKey, trend);
      }
    }

    if (isRefundedOrder(status)) {
      refundedRevenue += amount;
    }
  }

  const avgOrderValue = paidCount > 0 ? paidRevenue / paidCount : 0;
  const netRevenue = paidRevenue - refundedRevenue;

  const spendBuckets = {
    highValue: 0,
    mediumValue: 0,
    lowValue: 0,
    noValue: 0,
  };

  for (const [, spend] of userSpendMap.entries()) {
    if (spend >= 100) spendBuckets.highValue += 1;
    else if (spend >= 30) spendBuckets.mediumValue += 1;
    else if (spend > 0) spendBuckets.lowValue += 1;
  }

  const estimatedReaders = Math.max(
    toNumber(dashboard?.users),
    toNumber(dashboard?.activeUsers),
    userSpendMap.size,
  );
  spendBuckets.noValue = Math.max(estimatedReaders - userSpendMap.size, 0);

  const stats = {
    totalRevenue: paidRevenue,
    totalOrders: paidCount,
    avgOrderValue,
    totalRefunded: refundedRevenue,
    netRevenue,
  };

  const trend = [...trendMap.values()].sort((left, right) => left.date.localeCompare(right.date));

  const channels = [...channelMap.values()]
    .map((item) => ({
      ...item,
      avgOrderValue: item.orders > 0 ? item.revenue / item.orders : 0,
    }))
    .sort((left, right) => right.revenue - left.revenue);

  const promotionsFallback = promotions.map((promotion) => {
    const promotionOrders = orders.filter(
      (order) => String(order?.promotionId || order?.promotion || "") === String(promotion?.id || ""),
    );
    const promotionRevenue = promotionOrders
      .filter((order) => isPaidOrder(order?.status))
      .reduce((sum, order) => sum + toNumber(order?.amount), 0);

    return {
      promotionId: promotion.id,
      title: promotion.title || promotion.name || "未命名活动",
      orders: promotionOrders.length,
      revenue: promotionRevenue,
      roi: null,
      active: Boolean(promotion.isActive ?? promotion.active),
    };
  });

  const value = {
    stats,
    trend,
    channels,
    promotions: promotionsFallback,
    attributionModel: "derived_rules",
    roiAvailable: false,
    distribution: spendBuckets,
    orderStatus,
  };

  legacyRevenueCache.set(cacheKey, { ts: now, value });
  return value;
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
