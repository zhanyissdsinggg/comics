"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Download,
  LifeBuoy,
  PenSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import SurfacePanel from "@/components/common/SurfacePanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiGet } from "../../lib/apiClient";
import {
  resolveSeriesCreatorIdentity,
  resolveSeriesCreatorName,
} from "../../lib/creatorIdentity";

const number = new Intl.NumberFormat("zh-CN");
const usd = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const RANGE_OPTIONS = [
  { value: "all", label: "全部时间" },
  { value: "7days", label: "最近 7 天" },
  { value: "30days", label: "最近 30 天" },
  { value: "custom", label: "自定义区间" },
];

const QUICK_ACTIONS = [
  {
    href: "/admin/series",
    label: "去作品管理",
    description: "补封面、补简介、改状态，都先在这里收口。",
    icon: BookOpen,
  },
  {
    href: "/admin/creators",
    label: "去创作者页",
    description: "集中处理公开署名和创作者归属。",
    icon: PenSquare,
  },
  {
    href: "/admin/support",
    label: "去客服队列",
    description: "先看最近有回复压力的工单。",
    icon: LifeBuoy,
  },
  {
    href: "/admin/merchandising",
    label: "去内容编排",
    description: "首页和发现页的展示位在这里调整。",
    icon: Sparkles,
  },
];

function createEmptyMetric() {
  return {
    total: null,
    change: null,
    trend: "up",
    available: false,
  };
}

const EMPTY_STATS = {
  users: createEmptyMetric(),
  series: createEmptyMetric(),
  orders: createEmptyMetric(),
  revenue: createEmptyMetric(),
  views: createEmptyMetric(),
  comments: createEmptyMetric(),
};

const EMPTY_WORKSPACE = {
  stats: EMPTY_STATS,
  series: [],
  support: [],
  orders: [],
  comments: [],
};

function safeNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeText(value) {
  return String(value || "").trim();
}

function normalizeMetric(metric, fallback = createEmptyMetric()) {
  const source = metric && typeof metric === "object" ? metric : {};
  const hasTotal = source.total !== undefined && source.total !== null;
  const hasChange =
    source.change !== undefined ||
    source.delta !== undefined ||
    source.growth !== undefined;

  return {
    total: hasTotal ? safeNumber(source.total) : fallback.total,
    change: hasChange
      ? safeNumber(source.change ?? source.delta ?? source.growth)
      : fallback.change,
    trend: source.trend || ((safeNumber(source.change ?? source.delta ?? source.growth, 0)) < 0 ? "down" : "up"),
    available: hasTotal || fallback.available,
  };
}

function normalizeStats(payload) {
  const root = payload?.data ?? payload ?? {};
  const stats = root.stats ?? root;

  return {
    users: normalizeMetric(stats.users, EMPTY_STATS.users),
    series: normalizeMetric(stats.series, EMPTY_STATS.series),
    orders: normalizeMetric(stats.orders, EMPTY_STATS.orders),
    revenue: normalizeMetric(stats.revenue, EMPTY_STATS.revenue),
    views: normalizeMetric(stats.views, EMPTY_STATS.views),
    comments: normalizeMetric(stats.comments, EMPTY_STATS.comments),
  };
}

function extractArray(payload, keys) {
  const source = payload?.data ?? payload ?? {};

  if (Array.isArray(source)) {
    return source;
  }

  for (const key of keys) {
    if (Array.isArray(source?.[key])) {
      return source[key];
    }
  }

  if (Array.isArray(source?.data)) {
    return source.data;
  }

  return [];
}

function normalizeSeries(payload) {
  return extractArray(payload, ["series", "items"]).filter(Boolean);
}

function normalizeSupport(payload) {
  return extractArray(payload, ["support", "tickets"]).filter(Boolean);
}

function normalizeOrders(payload) {
  return extractArray(payload, ["orders", "items"]).filter(Boolean);
}

function normalizeComments(payload) {
  return extractArray(payload, ["comments", "items"]).filter(Boolean);
}

function relativeTime(value) {
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

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

function formatDate(value) {
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

function formatMetricValue(metric, formatter = number) {
  if (!metric?.available || metric.total === null) {
    return "--";
  }

  return formatter.format(metric.total);
}

function formatTrend(metric) {
  if (!metric?.available || metric.change === null || !Number.isFinite(metric.change)) {
    return "近 7 天暂无趋势";
  }

  const sign = metric.change > 0 ? "+" : metric.change < 0 ? "-" : "";
  return `近 7 天 ${sign}${Math.abs(metric.change).toFixed(1)}%`;
}

function normalizeGenres(value) {
  if (Array.isArray(value)) {
    return value.map((item) => safeText(item)).filter(Boolean);
  }

  return safeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasReadableCreator(series) {
  return resolveSeriesCreatorIdentity(series).hasPublicCredit;
}

function canPublishFromCurrentData(series) {
  return (
    !Boolean(series?.isPublished) &&
    hasReadableCreator(series) &&
    Boolean(safeText(series?.coverUrl || series?.coverImage)) &&
    safeText(series?.description).length >= 40 &&
    normalizeGenres(series?.genres).length > 0 &&
    safeNumber(series?.episodeCount ?? series?._count?.episodes ?? series?.totalEpisodes, 0) > 0
  );
}

function formatSeriesType(type) {
  return type === "novel" ? "小说" : "漫画";
}

function formatSeriesState(series) {
  if (!series?.isPublished) {
    return "草稿";
  }

  const normalized = safeText(series?.status).toLowerCase();
  if (normalized === "ongoing") {
    return "连载中";
  }
  if (normalized === "completed") {
    return "已完结";
  }
  if (normalized === "hiatus") {
    return "休更中";
  }
  if (normalized === "cancelled") {
    return "已下线";
  }

  return safeText(series?.status) || "已发布";
}

function formatTicketState(status) {
  const normalized = safeText(status).toLowerCase();
  if (normalized === "open") {
    return "待处理";
  }
  if (normalized === "in_progress") {
    return "处理中";
  }
  if (normalized === "closed") {
    return "已关闭";
  }
  return safeText(status) || "状态未知";
}

function formatOrderState(status) {
  const normalized = safeText(status).toLowerCase();
  if (normalized === "paid") {
    return "已支付";
  }
  if (normalized === "refunded") {
    return "已退款";
  }
  if (normalized === "pending") {
    return "待支付";
  }
  if (normalized === "failed") {
    return "失败";
  }
  return safeText(status) || "状态未知";
}

function formatOrderAmount(order) {
  return usd.format(safeNumber(order?.amount));
}

function exportDashboardCsv(stats) {
  const rows = [
    ["指标", "总量", "近 7 天变化"],
    ["作品总数", stats.series.total ?? "--", formatTrend(stats.series)],
    ["读者账号", stats.users.total ?? "--", formatTrend(stats.users)],
    ["已支付订单", stats.orders.total ?? "--", formatTrend(stats.orders)],
    ["累计收入", stats.revenue.total ?? "--", formatTrend(stats.revenue)],
    ["累计访问", stats.views.total ?? "--", formatTrend(stats.views)],
    ["评论总量", stats.comments.total ?? "--", formatTrend(stats.comments)],
  ];

  const blob = new Blob([`\ufeff${rows.map((row) => row.join(",")).join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `admin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SectionHeading({ title, description, action = null }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[1.3rem] font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

function EmptyListState({ title, description }) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/10 bg-[rgba(250,247,241,0.74)] px-4 py-6 text-center">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function CompactMetricCard({ label, value, detail, tone = "default" }) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]",
        tone === "accent"
          ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.06)]"
          : "border-black/6 bg-white/78",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-[1.7rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

function TaskCard({ label, value, description, href, tone = "default" }) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-[24px] border px-5 py-5 transition hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(15,23,42,0.05)]",
        tone === "accent"
          ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.06)]"
          : tone === "warning"
            ? "border-amber-200 bg-amber-50/80"
            : tone === "success"
              ? "border-emerald-200 bg-emerald-50/80"
              : "border-black/6 bg-white/78",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[1.9rem] font-semibold tracking-tight text-slate-950">{value}</p>
        <ArrowRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-950" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

function QueueItem({ title, detail, meta, badge = null }) {
  return (
    <div className="rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.76)] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
          {detail ? <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p> : null}
        </div>
        {badge ? (
          <span className="rounded-full border border-black/8 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {badge}
          </span>
        ) : null}
      </div>
      {meta ? <p className="mt-3 text-xs font-medium text-slate-500">{meta}</p> : null}
    </div>
  );
}

function GhostLinkButton({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-[color:var(--gush-ink-soft)] transition hover:bg-[rgba(23,20,18,0.045)] hover:text-[color:var(--gush-ink-strong)]"
    >
      {children}
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-48 rounded-[32px] border border-black/6 bg-white/78" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="skeleton h-32 rounded-[24px] border border-black/6 bg-white/76"
          />
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardNew() {
  const [workspace, setWorkspace] = useState(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warning, setWarning] = useState("");
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = useMemo(() => {
    if (range === "7days" || range === "30days") {
      const days = range === "7days" ? 7 : 30;
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      return `?from=${start}&to=${end}`;
    }

    if (range === "custom" && from && to) {
      return `?from=${from}&to=${to}`;
    }

    return "";
  }, [from, range, to]);

  const loadDashboard = useCallback(
    async (mode = "initial") => {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const warnings = [];

      try {
        const [statsResponse, seriesResponse, supportResponse, ordersResponse, commentsResponse] =
          await Promise.all([
            apiGet(`/api/admin/stats/dashboard${query}`),
            apiGet("/api/admin/series"),
            apiGet("/api/admin/support?page=1&pageSize=5&sortBy=updatedAt&sortOrder=desc"),
            apiGet("/api/admin/orders?page=1&pageSize=5"),
            apiGet("/api/admin/comments"),
          ]);

        if (!statsResponse.ok) {
          warnings.push("总览统计");
        }
        if (!seriesResponse.ok) {
          warnings.push("作品目录");
        }
        if (!supportResponse.ok) {
          warnings.push("客服队列");
        }
        if (!ordersResponse.ok) {
          warnings.push("订单队列");
        }
        if (!commentsResponse.ok) {
          warnings.push("评论列表");
        }

        setWorkspace({
          stats: statsResponse.ok ? normalizeStats(statsResponse.data) : EMPTY_STATS,
          series: seriesResponse.ok ? normalizeSeries(seriesResponse.data) : [],
          support: supportResponse.ok ? normalizeSupport(supportResponse.data) : [],
          orders: ordersResponse.ok ? normalizeOrders(ordersResponse.data) : [],
          comments: commentsResponse.ok ? normalizeComments(commentsResponse.data) : [],
        });

        setWarning(
          warnings.length
            ? `部分数据暂时不可用：${warnings.join("、")}。页面只展示当前成功拿到的真实数据。`
            : "",
        );
      } catch (error) {
        console.error("admin dashboard load failed:", error);
        setWorkspace(EMPTY_WORKSPACE);
        setWarning("仪表盘暂时加载失败，当前没有拿到可展示的后台数据。");
      } finally {
        if (mode === "initial") {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [query],
  );

  useEffect(() => {
    void loadDashboard("initial");
  }, [loadDashboard]);

  const seriesInsights = useMemo(() => {
    const list = Array.isArray(workspace.series) ? workspace.series : [];

    const latestUpdated = [...list]
      .filter((item) => safeText(item?.title))
      .sort((left, right) => {
        const rightTime = new Date(right?.updatedAt || 0).getTime();
        const leftTime = new Date(left?.updatedAt || 0).getTime();
        return rightTime - leftTime;
      })
      .slice(0, 5);

    const drafts = list.filter((item) => !Boolean(item?.isPublished)).length;
    const missingCredits = list.filter((item) => !hasReadableCreator(item)).length;
    const missingCovers = list.filter((item) => !safeText(item?.coverUrl || item?.coverImage)).length;
    const emptyEpisodes = list.filter((item) => safeNumber(item?.episodeCount ?? item?._count?.episodes ?? item?.totalEpisodes, 0) === 0).length;
    const readyDrafts = list.filter((item) => canPublishFromCurrentData(item)).length;
    const published = list.filter((item) => Boolean(item?.isPublished)).length;

    return {
      total: list.length,
      latestUpdated,
      drafts,
      missingCredits,
      missingCovers,
      emptyEpisodes,
      readyDrafts,
      published,
    };
  }, [workspace.series]);

  const statCards = [
    {
      label: "作品总数",
      value: formatMetricValue(workspace.stats.series),
      detail: `${formatTrend(workspace.stats.series)} · 当前目录 ${seriesInsights.published} 部已上线`,
      tone: "accent",
    },
    {
      label: "读者账号",
      value: formatMetricValue(workspace.stats.users),
      detail: formatTrend(workspace.stats.users),
    },
    {
      label: "已支付订单",
      value: formatMetricValue(workspace.stats.orders),
      detail: formatTrend(workspace.stats.orders),
    },
    {
      label: "累计收入",
      value: formatMetricValue(workspace.stats.revenue, usd),
      detail: formatTrend(workspace.stats.revenue),
    },
    {
      label: "累计访问",
      value: formatMetricValue(workspace.stats.views),
      detail: formatTrend(workspace.stats.views),
    },
    {
      label: "评论总量",
      value: formatMetricValue(workspace.stats.comments),
      detail: formatTrend(workspace.stats.comments),
    },
  ];

  const taskCards = [
    {
      label: "草稿作品",
      value: number.format(seriesInsights.drafts),
      description: "先确认封面、简介和章节，再决定是否对外发布。",
      href: "/admin/series",
      tone: seriesInsights.drafts > 0 ? "warning" : "default",
    },
    {
      label: "待补公开署名",
      value: number.format(seriesInsights.missingCredits),
      description: "公开署名没补齐，前台作品页和创作者页都会显得不可信。",
      href: "/admin/series",
      tone: seriesInsights.missingCredits > 0 ? "warning" : "default",
    },
    {
      label: "待补封面",
      value: number.format(seriesInsights.missingCovers),
      description: "缺封面的作品很难进列表页、推荐位和前台发现流。",
      href: "/admin/series",
      tone: seriesInsights.missingCovers > 0 ? "warning" : "default",
    },
    {
      label: "缺少章节",
      value: number.format(seriesInsights.emptyEpisodes),
      description: "只有作品壳没有内容时，就算发布也接不住真实读者。",
      href: "/admin/series",
      tone: seriesInsights.emptyEpisodes > 0 ? "warning" : "default",
    },
    {
      label: "可安排上线",
      value: number.format(seriesInsights.readyDrafts),
      description: "这些草稿的基础信息已经够用，下一步就是确认后发布。",
      href: "/admin/series",
      tone: seriesInsights.readyDrafts > 0 ? "success" : "default",
    },
  ];

  const priorityTags = [
    `已上线 ${seriesInsights.published}`,
    `草稿 ${seriesInsights.drafts}`,
    `待补署名 ${seriesInsights.missingCredits}`,
    `待补封面 ${seriesInsights.missingCovers}`,
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <SurfacePanel appearance="light" tone="highlight" accent="blue">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              运营总览
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.5rem]">
              上来先看待处理，再看趋势。
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              上半部分是所选时间范围内的真实总量；下面的待处理事项、最近更新、客服、评论和订单，始终反映当前后台真实列表。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {priorityTags.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-black/8 bg-white/82 px-3 py-1.5 text-sm font-semibold text-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button type="button" onClick={() => void loadDashboard("refresh")} disabled={refreshing}>
                <RefreshCw className={cn("size-4", refreshing ? "animate-spin" : "")} />
                {refreshing ? "刷新中..." : "刷新数据"}
              </Button>
              <Button type="button" variant="outline" onClick={() => exportDashboardCsv(workspace.stats)}>
                <Download className="size-4" />
                导出总览
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    range === option.value
                      ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]"
                      : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {range === "custom" ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-sm text-slate-600">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    开始日期
                  </span>
                  <input
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className="rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    结束日期
                  </span>
                  <input
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className="rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <CompactMetricCard
              label="当前最该先看"
              value={number.format(seriesInsights.drafts + seriesInsights.missingCredits + seriesInsights.missingCovers)}
              detail="草稿、缺署名和缺封面的作品加在一起，是今天最容易卡住前台质量的地方。"
              tone="accent"
            />
            <CompactMetricCard
              label="最近工单"
              value={number.format(workspace.support.length)}
              detail={workspace.support.length > 0 ? "客服队列已经有真实工单，别让读者等太久。" : "当前没有拿到新的客服工单。"}
            />
            <CompactMetricCard
              label="最新评论"
              value={number.format(workspace.comments.length)}
              detail={workspace.comments.length > 0 ? "最近评论已经进后台，适合顺手看一眼反馈。" : "当前没有拿到新的评论列表。"}
            />
          </div>
        </div>
      </SurfacePanel>

      {warning ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm leading-6 text-amber-800">
          {warning}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card, index) => (
          <CompactMetricCard key={card.label} {...card} tone={index === 0 ? "accent" : card.tone} />
        ))}
      </div>

      <SurfacePanel appearance="light" tone="default" accent="blue">
        <SectionHeading
          title="待处理事项"
          description="这块只放真正会影响前台体验和后台工作效率的内容状态。"
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {taskCards.map((card) => (
            <TaskCard key={card.label} {...card} />
          ))}
        </div>
      </SurfacePanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SurfacePanel appearance="light" tone="default" accent="blue">
          <SectionHeading
            title="最近更新的作品"
            description="优先看最近真的有变动的作品，方便顺着处理封面、署名和章节。"
          />
          <div className="mt-5 space-y-3">
            {seriesInsights.latestUpdated.length > 0 ? (
              seriesInsights.latestUpdated.map((series) => {
                const creatorReady = hasReadableCreator(series);
                const missingFlags = [
                  !creatorReady ? "署名待补" : null,
                  !safeText(series?.coverUrl || series?.coverImage) ? "封面待补" : null,
                  safeNumber(series?.episodeCount ?? series?._count?.episodes ?? series?.totalEpisodes, 0) === 0 ? "无章节" : null,
                ].filter(Boolean);

                return (
                  <QueueItem
                    key={series.id}
                    title={safeText(series.title) || "未命名作品"}
                    detail={`${formatSeriesType(series.type)} · ${formatSeriesState(series)}${missingFlags.length ? ` · ${missingFlags.join(" / ")}` : ""}`}
                    meta={`${formatDate(series.updatedAt)} · ${relativeTime(series.updatedAt)}`}
                    badge={resolveSeriesCreatorName(series) || (creatorReady ? "署名已补" : "待补署名")}
                  />
                );
              })
            ) : (
              <EmptyListState
                title="还没有作品目录数据"
                description="当前没有拿到作品列表，所以这里不会再摆样板作品。"
              />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" tone="default" accent="amber">
          <SectionHeading
            title="快捷入口"
            description="不堆一堆没必要的导航，只保留后台首页最常用的几个入口。"
          />
          <div className="mt-5 space-y-3">
            {QUICK_ACTIONS.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-4 rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.76)] px-4 py-4 transition hover:border-black/10 hover:bg-white/88"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-black/6 bg-white/92 text-[var(--gush-accent,#2f58c6)]">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-950" />
                </Link>
              );
            })}
          </div>
        </SurfacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SurfacePanel appearance="light" tone="default" accent="cyan">
          <SectionHeading
            title="客服队列"
            description="看最近有更新的工单，不要把读者消息压太久。"
            action={
              <GhostLinkButton href="/admin/support">查看全部</GhostLinkButton>
            }
          />
          <div className="mt-5 space-y-3">
            {workspace.support.length > 0 ? (
              workspace.support.map((ticket) => (
                <QueueItem
                  key={ticket.id}
                  title={safeText(ticket.subject || ticket.topic) || "未命名工单"}
                  detail={safeText(ticket.userEmail || ticket.replyEmail || ticket.userId) || "未记录联系信息"}
                  meta={`${formatTicketState(ticket.status)} · ${relativeTime(ticket.updatedAt || ticket.createdAt)}`}
                  badge={formatTicketState(ticket.status)}
                />
              ))
            ) : (
              <EmptyListState
                title="当前没有客服队列"
                description="没有拿到工单列表时，这里就保持空白，不再伪造客服压力。"
              />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" tone="default" accent="rose">
          <SectionHeading
            title="最近订单"
            description="只看最近几笔真实订单，方便判断支付链路是不是正常。"
            action={
              <GhostLinkButton href="/admin/orders">查看全部</GhostLinkButton>
            }
          />
          <div className="mt-5 space-y-3">
            {workspace.orders.length > 0 ? (
              workspace.orders.map((order) => (
                <QueueItem
                  key={safeText(order.id || order.orderId) || `${order.userId}-${order.createdAt}`}
                  title={safeText(order.orderId || order.id) || "未命名订单"}
                  detail={`${safeText(order.userId) || "未记录用户"} · ${formatOrderAmount(order)}`}
                  meta={`${formatOrderState(order.status)} · ${relativeTime(order.createdAt)}`}
                  badge={formatOrderState(order.status)}
                />
              ))
            ) : (
              <EmptyListState
                title="当前没有订单记录"
                description="没有真实订单时，这里就不摆样板流水。"
              />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" tone="default" accent="emerald">
          <SectionHeading
            title="最新评论"
            description="最近几条读者评论放在这里，方便顺手看反馈。"
            action={
              <GhostLinkButton href="/admin/comments">查看全部</GhostLinkButton>
            }
          />
          <div className="mt-5 space-y-3">
            {workspace.comments.length > 0 ? (
              workspace.comments.slice(0, 5).map((comment) => (
                <QueueItem
                  key={comment.id}
                  title={safeText(comment.author) || "匿名读者"}
                  detail={safeText(comment.text).slice(0, 72) || "没有可显示的评论内容"}
                  meta={relativeTime(comment.createdAt)}
                  badge={comment.hidden ? "已隐藏" : "已显示"}
                />
              ))
            ) : (
              <EmptyListState
                title="当前没有评论列表"
                description="接口没有返回评论时，这里不会再摆样板反馈。"
              />
            )}
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
}
