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
    description: "补封面、简介和发布状态。",
    icon: BookOpen,
  },
  {
    href: "/admin/creators",
    label: "去创作者页",
    description: "核对署名、归属和命名。",
    icon: PenSquare,
  },
  {
    href: "/admin/support",
    label: "去客服队列",
    description: "先处理最新待回复工单。",
    icon: LifeBuoy,
  },
  {
    href: "/admin/merchandising",
    label: "去首页编排",
    description: "首页和发现位都在这里收口。",
    icon: Sparkles,
  },
];

const EMPTY_METRIC = { total: null, change: null, available: false };
const EMPTY_WORKSPACE = {
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

const pillIdleClassName =
  "rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950";
const pillActiveClassName =
  "rounded-full border border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] px-4 py-2 text-sm font-semibold text-slate-950";

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeText(value) {
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

function normalizeStats(payload) {
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

function pickArray(payload, keys) {
  const source = payload?.data ?? payload ?? {};
  if (Array.isArray(source)) return source;
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return Array.isArray(source?.data) ? source.data : [];
}

function formatTrend(metric) {
  if (!metric?.available || metric.change === null || !Number.isFinite(metric.change)) {
    return "最近 7 天暂无趋势";
  }
  const sign = metric.change > 0 ? "+" : metric.change < 0 ? "-" : "";
  return `最近 7 天 ${sign}${Math.abs(metric.change).toFixed(1)}%`;
}

function formatMetric(metric, formatter = number) {
  return metric?.available && metric.total !== null ? formatter.format(metric.total) : "--";
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  return `${Math.floor(diffHours / 24)} 天前`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSeriesState(series) {
  if (!series?.isPublished) return "草稿";
  const status = safeText(series?.status).toLowerCase();
  if (status === "completed") return "已完结";
  if (status === "hiatus") return "休更中";
  if (status === "cancelled") return "已下线";
  return status === "ongoing" ? "连载中" : safeText(series?.status) || "已发布";
}

function formatTicketState(status) {
  const value = safeText(status).toLowerCase();
  if (value === "open") return "待处理";
  if (value === "in_progress") return "处理中";
  if (value === "closed") return "已关闭";
  return safeText(status) || "状态未知";
}

function formatOrderState(status) {
  const value = safeText(status).toLowerCase();
  if (value === "paid") return "已支付";
  if (value === "refunded") return "已退款";
  if (value === "pending") return "待支付";
  if (value === "failed") return "失败";
  return safeText(status) || "状态未知";
}

function EmptyBlock({ title, description }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-6 text-center">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function StatCard({ label, value, detail, accent = false }) {
  return (
    <article
      className={cn(
        "rounded-[24px] border px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]",
        accent
          ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)]"
          : "border-[color:var(--gush-border)] bg-white/92",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-[1.9rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

function SectionHeader({ title, description, action = null }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[1.28rem] font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

function QueueItem({ title, detail, meta, badge }) {
  return (
    <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
        </div>
        {badge ? (
          <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{meta}</p>
    </div>
  );
}

export default function AdminDashboardClean() {
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
    return range === "custom" && from && to ? `?from=${from}&to=${to}` : "";
  }, [from, range, to]);

  const loadDashboard = useCallback(async (mode = "initial") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);

    try {
      const [statsResponse, seriesResponse, supportResponse, ordersResponse, commentsResponse] =
        await Promise.all([
          apiGet(`/api/admin/stats/dashboard${query}`),
          apiGet("/api/admin/series"),
          apiGet("/api/admin/support?page=1&pageSize=5&sortBy=updatedAt&sortOrder=desc"),
          apiGet("/api/admin/orders?page=1&pageSize=5"),
          apiGet("/api/admin/comments"),
        ]);

      const warnings = [
        !statsResponse.ok && "总览统计",
        !seriesResponse.ok && "作品目录",
        !supportResponse.ok && "客服队列",
        !ordersResponse.ok && "订单队列",
        !commentsResponse.ok && "评论列表",
      ].filter(Boolean);

      setWorkspace({
        stats: statsResponse.ok ? normalizeStats(statsResponse.data) : EMPTY_WORKSPACE.stats,
        series: seriesResponse.ok ? pickArray(seriesResponse.data, ["series", "items"]) : [],
        support: supportResponse.ok ? pickArray(supportResponse.data, ["support", "tickets"]) : [],
        orders: ordersResponse.ok ? pickArray(ordersResponse.data, ["orders", "items"]) : [],
        comments: commentsResponse.ok ? pickArray(commentsResponse.data, ["comments", "items"]) : [],
      });
      setWarning(
        warnings.length
          ? `部分数据暂时不可用：${warnings.join("、")}。页面只展示当前拿到的真实后台数据。`
          : "",
      );
    } catch (error) {
      console.error("admin dashboard load failed:", error);
      setWorkspace(EMPTY_WORKSPACE);
      setWarning("仪表盘暂时加载失败，当前没有拿到可展示的后台数据。");
    } finally {
      if (mode === "initial") setLoading(false);
      else setRefreshing(false);
    }
  }, [query]);

  useEffect(() => {
    void loadDashboard("initial");
  }, [loadDashboard]);

  const insights = useMemo(() => {
    const series = Array.isArray(workspace.series) ? workspace.series : [];
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
          !item?.isPublished
          && resolveSeriesCreatorIdentity(item).hasPublicCredit
          && safeText(item?.coverUrl || item?.coverImage)
          && safeText(item?.description).length >= 40
          && episodeCount > 0
        );
      }).length,
    };
  }, [workspace.series]);

  const statCards = [
    {
      label: "作品总数",
      value: formatMetric(workspace.stats.series),
      detail: `${formatTrend(workspace.stats.series)} · 当前目录 ${insights.published} 部已上线`,
      accent: true,
    },
    { label: "读者账户", value: formatMetric(workspace.stats.users), detail: formatTrend(workspace.stats.users) },
    { label: "已支付订单", value: formatMetric(workspace.stats.orders), detail: formatTrend(workspace.stats.orders) },
    { label: "累计收入", value: formatMetric(workspace.stats.revenue, usd), detail: formatTrend(workspace.stats.revenue) },
    { label: "累计访问", value: formatMetric(workspace.stats.views), detail: formatTrend(workspace.stats.views) },
    { label: "评论总量", value: formatMetric(workspace.stats.comments), detail: formatTrend(workspace.stats.comments) },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-48 rounded-[32px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-32 rounded-[24px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SurfacePanel appearance="light" tone="highlight" accent="blue">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_300px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">运营总览</p>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.45rem]">
              先清待处理，再看趋势。
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              草稿、缺署名、缺封面和缺章节，决定前台看起来是不是可信。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                `已上线 ${insights.published}`,
                `草稿 ${insights.drafts}`,
                `待补署名 ${insights.missingCredits}`,
                `待补封面 ${insights.missingCovers}`,
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button type="button" onClick={() => void loadDashboard("refresh")} disabled={refreshing}>
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                {refreshing ? "刷新中..." : "刷新数据"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const rows = [
                    ["指标", "总量", "最近 7 天变化"],
                    ...statCards.map((item) => [item.label, item.value, item.detail]),
                  ];
                  const blob = new Blob(
                    [`\ufeff${rows.map((row) => row.join(",")).join("\n")}`],
                    { type: "text/csv;charset=utf-8;" },
                  );
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `admin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
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
                  className={range === option.value ? pillActiveClassName : pillIdleClassName}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {range === "custom" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { label: "开始日期", value: from, onChange: setFrom },
                  { label: "结束日期", value: to, onChange: setTo },
                ].map((field) => (
                  <label key={field.label} className="text-sm text-slate-600">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {field.label}
                    </span>
                    <input
                      type="date"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            <StatCard
              label="当前最该先看"
              value={number.format(insights.drafts + insights.missingCredits + insights.missingCovers)}
              detail="草稿、缺署名和缺封面是最先要清掉的入口。"
              accent
            />
            <StatCard
              label="最近工单"
              value={number.format(workspace.support.length)}
              detail={workspace.support.length > 0 ? "客服队列里已经有真实工单。" : "当前没有新工单。"}
            />
            <StatCard
              label="最新评论"
              value={number.format(workspace.comments.length)}
              detail={workspace.comments.length > 0 ? "最新评论已经进入后台。" : "当前没有新评论。"}
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
        {statCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <SurfacePanel appearance="light" accent="blue">
        <SectionHeader
          title="待处理事项"
          description="这里只保留会影响前台质量和日常运营的项目。"
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["草稿作品", insights.drafts, "先确认封面、简介和章节，再决定是否发布。"],
            ["待补公开署名", insights.missingCredits, "署名没补齐，前台作品页和创作者页都会显得不可信。"],
            ["待补封面", insights.missingCovers, "缺封面的作品很难进入列表页和前台发现流。"],
            ["缺少章节", insights.emptyEpisodes, "只有作品壳没有内容，就算发布也接不住读者。"],
            ["可安排上线", insights.readyDrafts, "这些草稿基础信息已经够用，可以排到下一步。"],
          ].map(([label, value, description]) => (
            <Link
              key={label}
              href="/admin/series"
              className="rounded-[24px] border border-[color:var(--gush-border)] bg-white/92 px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {label}
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-[1.85rem] font-semibold tracking-tight text-slate-950">
                  {number.format(value)}
                </p>
                <ArrowRight className="size-4 text-slate-400" />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </Link>
          ))}
        </div>
      </SurfacePanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
        <SurfacePanel appearance="light" accent="blue">
          <SectionHeader title="最近更新的作品" description="顺着处理封面、署名和章节。" />
          <div className="mt-5 space-y-3">
            {insights.latestUpdated.length > 0 ? (
              insights.latestUpdated.map((series) => {
                const creatorReady = resolveSeriesCreatorIdentity(series).hasPublicCredit;
                const missing = [
                  !creatorReady && "署名待补",
                  !safeText(series?.coverUrl || series?.coverImage) && "封面待补",
                  safeNumber(
                    series?.episodeCount ?? series?._count?.episodes ?? series?.totalEpisodes,
                    0,
                  ) === 0 && "无章节",
                ]
                  .filter(Boolean)
                  .join(" / ");

                return (
                  <QueueItem
                    key={series.id}
                    title={safeText(series.title) || "未命名作品"}
                    detail={`${series?.type === "novel" ? "小说" : "漫画"} · ${formatSeriesState(series)}${missing ? ` · ${missing}` : ""}`}
                    meta={`${formatDate(series.updatedAt)} · ${relativeTime(series.updatedAt)}`}
                    badge={
                      resolveSeriesCreatorName(series)
                      || (creatorReady ? "署名已补" : "待补署名")
                    }
                  />
                );
              })
            ) : (
              <EmptyBlock title="还没有作品目录数据" description="当前没有作品列表。" />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="amber">
          <SectionHeader title="快捷入口" description="这里只留最常用的四个入口。" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {QUICK_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-[110px] items-start gap-4 rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-[color:var(--gush-border)] bg-white text-slate-950">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SurfacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SurfacePanel appearance="light" accent="cyan">
          <SectionHeader
            title="客服队列"
            description="优先看最近有更新的工单。"
            action={
              <Link href="/admin/support" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
                查看全部
              </Link>
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
              <EmptyBlock title="当前没有客服队列" description="当前没有工单。" />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="rose">
          <SectionHeader
            title="最近订单"
            description="这里只看真实订单。"
            action={
              <Link href="/admin/orders" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
                查看全部
              </Link>
            }
          />
          <div className="mt-5 space-y-3">
            {workspace.orders.length > 0 ? (
              workspace.orders.map((order) => (
                <QueueItem
                  key={safeText(order.id || order.orderId) || `${order.userId}-${order.createdAt}`}
                  title={safeText(order.orderId || order.id) || "未命名订单"}
                  detail={`${safeText(order.userId) || "未记录用户"} · ${usd.format(safeNumber(order?.amount))}`}
                  meta={`${formatOrderState(order.status)} · ${relativeTime(order.createdAt)}`}
                  badge={formatOrderState(order.status)}
                />
              ))
            ) : (
              <EmptyBlock title="当前没有订单记录" description="当前没有真实订单。" />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel appearance="light" accent="emerald">
          <SectionHeader
            title="最新评论"
            description="最近反馈一眼看完。"
            action={
              <Link href="/admin/comments" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
                查看全部
              </Link>
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
              <EmptyBlock title="当前没有评论列表" description="当前没有评论。" />
            )}
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
}
