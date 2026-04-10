"use client";

import {
  resolveSeriesCreatorIdentity,
  resolveSeriesCreatorName,
} from "../../../lib/creatorIdentity";

export const number = new Intl.NumberFormat("zh-CN");
export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const RANGE_OPTIONS = [
  { value: "all", label: "全部时间" },
  { value: "7days", label: "最近 7 天" },
  { value: "30days", label: "最近 30 天" },
  { value: "custom", label: "自定义区间" },
];

export const QUICK_ACTIONS = [
  {
    href: "/admin/series",
    label: "去作品管理",
    description: "补封面、简介和发布状态。",
    icon: "series",
  },
  {
    href: "/admin/creators",
    label: "去创作者页",
    description: "核对署名、归属和命名。",
    icon: "creators",
  },
  {
    href: "/admin/support",
    label: "去客服队列",
    description: "先处理最新待回复工单。",
    icon: "support",
  },
  {
    href: "/admin/merchandising",
    label: "去首页编排",
    description: "首页和发现位都在这里收口。",
    icon: "merchandising",
  },
];

export const EMPTY_METRIC = { total: null, change: null, available: false };
export const EMPTY_WORKSPACE = {
  stats: {
    users: EMPTY_METRIC,
    series: EMPTY_METRIC,
    orders: EMPTY_METRIC,
    revenue: EMPTY_METRIC,
    views: EMPTY_METRIC,
    comments: EMPTY_METRIC,
  },
  series: [],
  support: [],
  orders: [],
  comments: [],
};

export const PENDING_ITEMS = [
  {
    key: "drafts",
    label: "草稿作品",
    description: "先确认封面、简介和章节，再决定是否发布。",
  },
  {
    key: "missingCredits",
    label: "待补公开署名",
    description: "署名没补齐，前台作品页和创作者页都会显得不可信。",
  },
  {
    key: "missingCovers",
    label: "待补封面",
    description: "缺封面的作品很难进入列表页和前台发现流。",
  },
  {
    key: "emptyEpisodes",
    label: "缺少章节",
    description: "只有作品壳没有内容，就算发布也接不住读者。",
  },
  {
    key: "readyDrafts",
    label: "可安排上线",
    description: "这些草稿基础信息已经够用，可以推进下一步。",
  },
];

export function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function safeText(value) {
  return String(value || "").trim();
}

function normalizeMetric(metric) {
  const source = metric && typeof metric === "object" ? metric : {};
  const rawChange = source.change ?? source.delta ?? source.growth;
  const hasTotal = source.total !== undefined && source.total !== null;

  return {
    total: hasTotal ? safeNumber(source.total) : null,
    change: rawChange !== undefined && rawChange !== null ? safeNumber(rawChange) : null,
    available: hasTotal,
  };
}

export function normalizeStats(payload) {
  const root = payload?.data ?? payload ?? {};
  const stats = root.stats ?? root;

  return {
    users: normalizeMetric(stats.users),
    series: normalizeMetric(stats.series),
    orders: normalizeMetric(stats.orders),
    revenue: normalizeMetric(stats.revenue),
    views: normalizeMetric(stats.views),
    comments: normalizeMetric(stats.comments),
  };
}

export function pickArray(payload, keys) {
  const source = payload?.data ?? payload ?? {};
  if (Array.isArray(source)) {
    return source;
  }

  for (const key of keys) {
    if (Array.isArray(source?.[key])) {
      return source[key];
    }
  }

  return Array.isArray(source?.data) ? source.data : [];
}

export function formatTrend(metric) {
  if (!metric?.available || metric.change === null || !Number.isFinite(metric.change)) {
    return "最近 7 天暂无趋势";
  }

  const sign = metric.change > 0 ? "+" : metric.change < 0 ? "-" : "";
  return `最近 7 天 ${sign}${Math.abs(metric.change).toFixed(1)}%`;
}

export function formatMetric(metric, formatter = number) {
  return metric?.available && metric.total !== null ? formatter.format(metric.total) : "--";
}

export function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) {
    return "刚刚";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  return `${Math.floor(diffHours / 24)} 天前`;
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatSeriesState(series) {
  if (!series?.isPublished) {
    return "草稿";
  }

  const status = safeText(series?.status).toLowerCase();
  if (status === "completed") return "已完结";
  if (status === "hiatus") return "休更中";
  if (status === "cancelled") return "已下线";
  if (status === "ongoing") return "连载中";

  return safeText(series?.status) || "已发布";
}

export function formatTicketState(status) {
  const value = safeText(status).toLowerCase();
  if (value === "open") return "待处理";
  if (value === "in_progress") return "处理中";
  if (value === "closed") return "已关闭";
  return safeText(status) || "状态未知";
}

export function formatOrderState(status) {
  const value = safeText(status).toLowerCase();
  if (value === "paid") return "已支付";
  if (value === "refunded") return "已退款";
  if (value === "pending") return "待支付";
  if (value === "failed") return "失败";
  return safeText(status) || "状态未知";
}

export function buildInsights(seriesList) {
  const series = Array.isArray(seriesList) ? seriesList : [];
  const latestUpdated = [...series]
    .filter((item) => safeText(item?.title))
    .sort(
      (left, right) =>
        new Date(right?.updatedAt || 0).getTime() - new Date(left?.updatedAt || 0).getTime(),
    )
    .slice(0, 5);

  return {
    latestUpdated,
    drafts: series.filter((item) => !item?.isPublished).length,
    published: series.filter((item) => Boolean(item?.isPublished)).length,
    missingCredits: series.filter((item) => !resolveSeriesCreatorIdentity(item).hasPublicCredit)
      .length,
    missingCovers: series.filter((item) => !safeText(item?.coverUrl || item?.coverImage)).length,
    emptyEpisodes: series.filter(
      (item) =>
        safeNumber(item?.episodeCount ?? item?._count?.episodes ?? item?.totalEpisodes, 0) === 0,
    ).length,
    readyDrafts: series.filter((item) => {
      const episodeCount = safeNumber(
        item?.episodeCount ?? item?._count?.episodes ?? item?.totalEpisodes,
        0,
      );

      return (
        !item?.isPublished &&
        resolveSeriesCreatorIdentity(item).hasPublicCredit &&
        safeText(item?.coverUrl || item?.coverImage) &&
        safeText(item?.description).length >= 40 &&
        episodeCount > 0
      );
    }).length,
  };
}

export function buildStatCards(stats, insights) {
  return [
    {
      label: "作品总数",
      value: formatMetric(stats.series),
      detail: `${formatTrend(stats.series)} · 当前目录 ${insights.published} 部已上线`,
      accent: true,
    },
    { label: "读者账户", value: formatMetric(stats.users), detail: formatTrend(stats.users) },
    { label: "已支付订单", value: formatMetric(stats.orders), detail: formatTrend(stats.orders) },
    { label: "累计收入", value: formatMetric(stats.revenue, usd), detail: formatTrend(stats.revenue) },
    { label: "累计访问", value: formatMetric(stats.views), detail: formatTrend(stats.views) },
    { label: "评论总量", value: formatMetric(stats.comments), detail: formatTrend(stats.comments) },
  ];
}

export function getSeriesBadge(series) {
  const creatorReady = resolveSeriesCreatorIdentity(series).hasPublicCredit;
  return (
    resolveSeriesCreatorName(series) ||
    (creatorReady ? "署名已补" : "待补署名")
  );
}
