"use client";

import { normalizeUSDisplayCurrency } from "@/lib/localization";

export const searchFields = [
  { field: "id", type: "string" },
  { field: "orderId", type: "string" },
  { field: "userId", type: "string" },
];

export const sortFields = [
  { field: "createdAt", type: "date" },
  { field: "amount", type: "number" },
  { field: "status", type: "string" },
];

export const sortOptions = [
  { value: "createdAt", label: "创建时间" },
  { value: "amount", label: "金额" },
  { value: "status", label: "状态" },
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

export function formatAmount(amount, currency = "USD") {
  const numericAmount = Number(amount || 0);
  const normalizedCurrency = normalizeUSDisplayCurrency(currency);

  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${normalizedCurrency} ${numericAmount.toFixed(2)}`;
  }
}

export function getStatusLabel(status) {
  const normalized = String(status || "").toUpperCase();

  switch (normalized) {
    case "PENDING":
      return "待支付";
    case "PAID":
      return "已支付";
    case "COMPLETED":
      return "已完成";
    case "REFUNDED":
      return "已退款";
    case "FAILED":
      return "失败";
    case "CHARGEBACK":
      return "拒付";
    case "TIMEOUT":
      return "已超时";
    default:
      return status || "未知";
  }
}

export function getStatusTone(status) {
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
      return "warning";
    case "PAID":
    case "COMPLETED":
      return "success";
    case "REFUNDED":
      return "accent";
    case "FAILED":
    case "CHARGEBACK":
      return "danger";
    default:
      return "default";
  }
}

export function isRefunded(status) {
  return String(status || "").toUpperCase() === "REFUNDED";
}

export function buildOrdersMetricCards({ total, refundedCount, revenueInView }) {
  return [
    {
      label: "当前订单",
      value: String(total),
      detail: "当前搜索和排序条件下的订单数量。",
      tone: "accent",
    },
    {
      label: "已退款",
      value: String(refundedCount),
      detail: "当前结果里已经标记为退款的订单。",
    },
    {
      label: "当前金额",
      value: formatAmount(revenueInView),
      detail: "当前可见订单金额的快速概览。",
    },
  ];
}

export function buildOrdersExportCsv(orders, selectedIdsSet) {
  const exportData = orders.filter((order) => selectedIdsSet.has(order.id));

  if (exportData.length === 0) {
    return "";
  }

  return [
    ["订单编号", "用户编号", "金额", "状态", "创建时间"].join(","),
    ...exportData.map((order) =>
      [
        order.id,
        order.userId || "",
        Number(order.amount || 0).toFixed(2),
        getStatusLabel(order.status),
        formatDate(order.createdAt),
      ].join(","),
    ),
  ].join("\n");
}
