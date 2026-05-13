"use client";

import { normalizeUSDisplayCurrency } from "@/lib/localization";

export const searchFields = [
  { field: "id", type: "string" },
  { field: "name", type: "string" },
  { field: "label", type: "string" },
];

export const sortFields = [
  { field: "createdAt", type: "date" },
  { field: "price", type: "number" },
  { field: "points", type: "number" },
  { field: "name", type: "string" },
  { field: "active", type: "boolean" },
];

export const sortOptions = [
  { value: "createdAt", label: "创建时间" },
  { value: "price", label: "价格" },
  { value: "points", label: "点数" },
  { value: "name", label: "套餐名称" },
  { value: "active", label: "状态" },
];

export function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

export function formatCurrency(value, currency = "USD") {
  const amount = toNumber(value) / 100;
  const normalizedCurrency = normalizeUSDisplayCurrency(currency);

  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`;
  }
}

export function formatPoints(value) {
  return new Intl.NumberFormat("zh-CN").format(toNumber(value));
}

export function getBillingModeLabel(mode) {
  switch (String(mode || "").toLowerCase()) {
    case "demo":
      return "演示模式";
    case "provider":
      return "正式支付模式";
    default:
      return "未配置";
  }
}

export function getStatusTone(isActive) {
  return isActive ? "success" : "default";
}

export function getPackageTotalPoints(pkg) {
  return toNumber(pkg.points) || toNumber(pkg.paidPts) + toNumber(pkg.bonusPts);
}

export function buildPackageSummary(packages) {
  if (!packages.length) {
    return {
      totalCount: 0,
      activeCount: 0,
      highestBonus: 0,
      cheapest: null,
      largest: null,
      bestDensity: null,
    };
  }

  return packages.reduce(
    (summary, pkg) => {
      const totalPoints = getPackageTotalPoints(pkg);
      const price = toNumber(pkg.price);
      const density = price > 0 ? totalPoints / price : 0;
      const currentLargestTotal = summary.largest
        ? getPackageTotalPoints(summary.largest)
        : 0;
      const currency = normalizeUSDisplayCurrency(pkg.currency);

      summary.totalCount += 1;

      if (pkg.active !== false) {
        summary.activeCount += 1;
      }

      summary.highestBonus = Math.max(
        summary.highestBonus,
        toNumber(pkg.bonusPts),
      );

      if (
        !summary.cheapest ||
        (price > 0 && price < toNumber(summary.cheapest.price))
      ) {
        summary.cheapest = pkg;
      }

      if (!summary.largest || totalPoints > currentLargestTotal) {
        summary.largest = pkg;
      }

      if (!summary.bestDensity || density > summary.bestDensity.value) {
        summary.bestDensity = {
          name: pkg.name || pkg.label || pkg.id,
          value: density,
          currency,
        };
      }

      return summary;
    },
    {
      totalCount: 0,
      activeCount: 0,
      highestBonus: 0,
      cheapest: null,
      largest: null,
      bestDensity: null,
    },
  );
}

export function buildPlanSummary(plans) {
  if (!plans.length) {
    return {
      activeCount: 0,
      maxDiscount: 0,
      maxDailyFree: 0,
      maxVoucher: 0,
    };
  }

  return plans.reduce(
    (summary, plan) => {
      if (plan.active !== false) {
        summary.activeCount += 1;
      }

      summary.maxDiscount = Math.max(
        summary.maxDiscount,
        toNumber(plan.discountPct),
      );
      summary.maxDailyFree = Math.max(
        summary.maxDailyFree,
        toNumber(plan.dailyFreeUnlocks),
      );
      summary.maxVoucher = Math.max(
        summary.maxVoucher,
        toNumber(plan.voucherPts),
      );

      return summary;
    },
    {
      activeCount: 0,
      maxDiscount: 0,
      maxDailyFree: 0,
      maxVoucher: 0,
    },
  );
}

export function buildBillingMetricCards(packageSummary, planSummary) {
  return [
    {
      label: "当前套餐",
      value: String(packageSummary.totalCount),
      detail: "当前列表里可见的充值套餐数量。",
      tone: "accent",
    },
    {
      label: "已启用套餐",
      value: String(packageSummary.activeCount),
      detail: "仍对读者或运营开放的套餐。",
    },
    {
      label: "最高赠送",
      value: formatPoints(packageSummary.highestBonus),
      detail: "单个套餐里赠送点数最高的一档。",
    },
    {
      label: "已启用会员方案",
      value: String(planSummary.activeCount),
      detail: "当前仍标记为启用的会员层级。",
    },
  ];
}

export function buildBillingSnapshotItems(billingAvailability) {
  return [
    {
      label: "计费模式",
      value: getBillingModeLabel(billingAvailability?.billingMode),
    },
    {
      label: "购买操作",
      value: billingAvailability?.purchaseActionsEnabled ? "已启用" : "仅预览",
    },
    {
      label: "订阅操作",
      value: billingAvailability?.subscriptionActionsEnabled
        ? "已启用"
        : "仅预览",
    },
    {
      label: "退款操作",
      value: billingAvailability?.refundActionsEnabled ? "已启用" : "仅预览",
    },
  ];
}

export function buildMembershipSnapshotItems(packageSummary, planSummary) {
  return [
    {
      label: "最划算套餐",
      value: packageSummary.bestDensity
        ? `${packageSummary.bestDensity.name} · ${packageSummary.bestDensity.value.toFixed(1)} 点/${packageSummary.bestDensity.currency}`
        : "暂无",
    },
    {
      label: "最大面额套餐",
      value: packageSummary.largest
        ? `${packageSummary.largest.name || packageSummary.largest.id} · ${formatPoints(
            getPackageTotalPoints(packageSummary.largest),
          )} 点`
        : "暂无",
    },
    { label: "最高会员折扣", value: `${planSummary.maxDiscount}%` },
    { label: "每日免费解锁", value: String(planSummary.maxDailyFree) },
    { label: "每月代金券点数", value: formatPoints(planSummary.maxVoucher) },
  ];
}
