"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { apiGet } from "../../lib/apiClient";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  Download,
  Layers,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import SurfacePanel from "@/components/common/SurfacePanel";
import { Button } from "@/components/ui/button";

const number = new Intl.NumberFormat("zh-CN");
const money = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const createEmptyMetric = () => ({
  total: null,
  change: null,
  trend: "up",
  available: false,
});

const EMPTY_STATS = {
  users: createEmptyMetric(),
  series: createEmptyMetric(),
  orders: createEmptyMetric(),
  revenue: createEmptyMetric(),
  views: createEmptyMetric(),
  comments: createEmptyMetric(),
  seriesByType: {
    comic: createEmptyMetric(),
    novel: createEmptyMetric(),
  },
  episodes: createEmptyMetric(),
};

const EMPTY_DASHBOARD = {
  stats: EMPTY_STATS,
  top: {
    byViews: [],
    byRevenue: [],
  },
  updates: [],
  activity: [],
};

const RANGE_OPTIONS = [
  { value: "all", label: "全部时间" },
  { value: "7days", label: "最近 7 天" },
  { value: "30days", label: "最近 30 天" },
  { value: "custom", label: "自定义区间" },
];

const QUICK_ACTIONS = [
  { href: "/admin/series", label: "管理作品", description: "新增作品或更新作品信息。", icon: BookOpen },
  {
    href: "/admin/creators",
    label: "更新署名",
    description: "维护创作者身份和公开署名。",
    icon: Users,
  },
  {
    href: "/admin/merchandising",
    label: "调整编排",
    description: "管理首页与发现页的内容编排。",
    icon: Sparkles,
  },
  {
    href: "/admin/storefront",
    label: "检查前台",
    description: "确认读者真正看到的页面效果。",
    icon: Layers,
  },
];

const safeNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMetric = (metric, fallback = createEmptyMetric()) => {
  const source = metric && typeof metric === "object" ? metric : {};
  const hasTotal = source.total !== undefined && source.total !== null;
  const hasChange =
    source.change !== undefined ||
    source.delta !== undefined ||
    source.growth !== undefined;
  const total = hasTotal ? safeNumber(source.total) : fallback.total;
  const change = hasChange
    ? safeNumber(source.change ?? source.delta ?? source.growth)
    : fallback.change;
  const available = hasTotal || fallback.available;

  return {
    total,
    change,
    trend: source.trend || ((change ?? 0) < 0 ? "down" : "up"),
    available,
  };
};

const relativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) {
    return "刚刚";
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }

  const days = Math.floor(hours / 24);
  return `${days} 天前`;
};

function normalize(payload) {
  const root = payload?.data ?? payload ?? {};
  const stats = root.stats ?? root;

  return {
    stats: {
      users: normalizeMetric(stats.users, EMPTY_STATS.users),
      series: normalizeMetric(stats.series, EMPTY_STATS.series),
      orders: normalizeMetric(stats.orders, EMPTY_STATS.orders),
      revenue: normalizeMetric(stats.revenue, EMPTY_STATS.revenue),
      views: normalizeMetric(stats.views, EMPTY_STATS.views),
      comments: normalizeMetric(stats.comments, EMPTY_STATS.comments),
      seriesByType: {
        comic: normalizeMetric(stats.seriesByType?.comic, EMPTY_STATS.seriesByType.comic),
        novel: normalizeMetric(stats.seriesByType?.novel, EMPTY_STATS.seriesByType.novel),
      },
      episodes: normalizeMetric(stats.episodes, EMPTY_STATS.episodes),
    },
    top: {
      byViews: Array.isArray(root.topSeries?.byViews ?? root.rankings?.byViews ?? root.byViews)
        ? (root.topSeries?.byViews ?? root.rankings?.byViews ?? root.byViews).filter(Boolean)
        : [],
      byRevenue: Array.isArray(
        root.topSeries?.byRevenue ?? root.rankings?.byRevenue ?? root.byRevenue,
      )
        ? (root.topSeries?.byRevenue ?? root.rankings?.byRevenue ?? root.byRevenue).filter(Boolean)
        : [],
    },
    updates: Array.isArray(root.recentUpdates ?? root.latestSeries ?? root.updatedSeries)
      ? (root.recentUpdates ?? root.latestSeries ?? root.updatedSeries).filter(Boolean)
      : [],
    activity: Array.isArray(root.recentActivities ?? root.activities ?? root.timeline)
      ? (root.recentActivities ?? root.activities ?? root.timeline)
          .map((item, index) => ({
            id: item?.id || `activity-${index}`,
            user: item?.user || item?.username || item?.operator || "",
            action: item?.action || item?.description || item?.message || "",
            time: item?.time || (item?.createdAt ? relativeTime(item.createdAt) : ""),
          }))
          .filter((item) => item.user || item.action)
      : [],
  };
}

function formatTrend(change) {
  if (!Number.isFinite(change)) {
    return "暂无";
  }
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${Math.abs(change).toFixed(1)}%`;
}

function formatMetricValue(metric, formatter = number) {
  if (!metric?.available || metric.total === null) {
    return "--";
  }

  return formatter.format(metric.total);
}

function formatMetricDetail(metric, detailWhenAvailable, detailWhenMissing = "等待真实数据接入") {
  if (!metric?.available) {
    return detailWhenMissing;
  }

  return detailWhenAvailable(metric);
}

function formatSeriesFormatLabel(value) {
  return value === "novel" ? "小说" : "漫画";
}

function EmptyListState({ title, description }) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/10 bg-[rgba(250,247,241,0.76)] px-4 py-6 text-center">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function OverviewCard({ label, value, detail, emphasis = false }) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]",
        emphasis
          ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.06)]"
          : "border-black/6 bg-white/76",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

function SectionHeading({ title, description, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function ListRow({ title, detail, meta }) {
  return (
    <div className="rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.76)] px-4 py-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          {detail ? <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p> : null}
        </div>
        {meta ? <p className="text-xs font-medium text-slate-500">{meta}</p> : null}
      </div>
    </div>
  );
}

export default function AdminDashboardNew() {
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const response = await apiGet(`/api/admin/stats/dashboard${query}`);
        if (!response.ok) {
          throw new Error(`request failed: ${response.status}`);
        }

        if (!cancelled) {
          setData(normalize(response.data));
        }
      } catch (error) {
        console.error("admin dashboard load failed:", error);
        if (!cancelled) {
          setData(EMPTY_DASHBOARD);
          setError("仪表盘数据暂时加载失败，页面只显示当前能确认的真实信息。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      setError("");
      const response = await apiGet(`/api/admin/stats/dashboard${query}`);
      if (!response.ok) {
        throw new Error(`request failed: ${response.status}`);
      }

      setData(normalize(response.data));
    } catch (error) {
      console.error("admin dashboard refresh failed:", error);
      setError("刷新失败，当前页面保留最近一次拿到的真实数据。");
    } finally {
      setRefreshing(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["指标", "数值", "变化", "趋势"],
      ["用户", data.stats.users.total ?? "--", formatTrend(data.stats.users.change), data.stats.users.trend],
      ["作品", data.stats.series.total ?? "--", formatTrend(data.stats.series.change), data.stats.series.trend],
      ["订单", data.stats.orders.total ?? "--", formatTrend(data.stats.orders.change), data.stats.orders.trend],
      ["收入", data.stats.revenue.total ?? "--", formatTrend(data.stats.revenue.change), data.stats.revenue.trend],
      ["浏览", data.stats.views.total ?? "--", formatTrend(data.stats.views.change), data.stats.views.trend],
      [
        "评论",
        data.stats.comments.total ?? "--",
        formatTrend(data.stats.comments.change),
        data.stats.comments.trend,
      ],
      [
        "漫画作品",
        data.stats.seriesByType.comic.total ?? "--",
        formatTrend(data.stats.seriesByType.comic.change),
        data.stats.seriesByType.comic.trend,
      ],
      [
        "小说作品",
        data.stats.seriesByType.novel.total ?? "--",
        formatTrend(data.stats.seriesByType.novel.change),
        data.stats.seriesByType.novel.trend,
      ],
      [
        "章节",
        data.stats.episodes.total ?? "--",
        formatTrend(data.stats.episodes.change),
        data.stats.episodes.trend,
      ],
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
  };

  const overviewCards = [
    {
      label: "已上线作品",
      value: formatMetricValue(data.stats.series),
      detail: formatMetricDetail(data.stats.series, (metric) => `${formatTrend(metric.change)}，对比上一周期`),
      emphasis: true,
    },
    {
      label: "作品章节数",
      value: formatMetricValue(data.stats.episodes),
      detail: formatMetricDetail(data.stats.episodes, (metric) => `${formatTrend(metric.change)}，近期收录变化`),
    },
    {
      label: "已处理订单",
      value: formatMetricValue(data.stats.orders),
      detail: formatMetricDetail(data.stats.orders, (metric) => `${formatTrend(metric.change)}，当前商业链路`),
    },
    {
      label: "读者互动",
      value: formatMetricValue(data.stats.comments),
      detail: formatMetricDetail(data.stats.comments, (metric) => `${formatTrend(metric.change)}，评论量变化`),
    },
  ];

  return (
    <div className="space-y-6">
      <SurfacePanel appearance="light" tone="highlight" accent="blue" className="p-0">
        <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              今日概览
            </p>
            <h2 className="mt-3 text-[2.1rem] font-semibold tracking-tight text-slate-950 sm:text-[2.6rem]">
              先把真实内容看清楚，再做后台操作。
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              这里优先展示真实统计和真实后台入口，不再用样板热度、样板作品或样板活动冒充线上状态。
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button type="button" onClick={refresh} disabled={refreshing}>
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "刷新中..." : "刷新"}
              </Button>
              <Button type="button" variant="outline" onClick={exportCsv}>
                <Download size={16} />
                导出 CSV
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
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
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
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
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
            {overviewCards.map((item, index) => (
              <OverviewCard key={item.label} {...item} emphasis={index === 0 || item.emphasis} />
            ))}
          </div>
        </div>
      </SurfacePanel>

      {error ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm leading-6 text-amber-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="skeleton h-32 rounded-[28px] border border-black/6 bg-white/72"
            />
          ))}
        </div>
      ) : (
        <>
          <SurfacePanel appearance="light" tone="default" accent="blue">
            <SectionHeading
              title="快捷入口"
              description="先处理直接影响作品、署名和前台展示的后台任务。"
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {QUICK_ACTIONS.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-[24px] border border-black/6 bg-white/76 px-5 py-5 transition hover:border-black/10 hover:bg-white hover:shadow-[0_12px_24px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-black/6 bg-[rgba(250,247,241,0.86)] text-[var(--gush-accent,#2f58c6)]">
                      <Icon size={18} />
                    </div>
                    <p className="mt-4 text-base font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition group-hover:text-slate-950">
                      <span>进入</span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </SurfacePanel>

          <div className="grid gap-6 xl:grid-cols-2">
            <SurfacePanel appearance="light" tone="default" accent="blue">
              <SectionHeading
                title="最近更新的作品"
                description="只展示接口真正返回的更新队列，没有真实数据时就老实留空。"
              />
              <div className="mt-5 space-y-3">
                {data.updates.length > 0 ? (
                  data.updates.map((series, index) => (
                    <ListRow
                      key={series.id || index}
                      title={series.title}
                      detail={`${formatSeriesFormatLabel(series.type)} · ${number.format(
                        safeNumber(series.episodeCount),
                      )} 话`}
                      meta={relativeTime(series.updatedAt)}
                    />
                  ))
                ) : (
                  <EmptyListState
                    title="暂时没有真实更新队列"
                    description="当前接口还没有返回最近更新作品，所以这里不再展示样板作品。"
                  />
                )}
              </div>
            </SurfacePanel>

            <SurfacePanel appearance="light" tone="default" accent="emerald">
              <SectionHeading
                title="目录结构"
                description="只展示当前确实有统计支持的目录数据。"
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <OverviewCard
                  label="漫画作品"
                  value={formatMetricValue(data.stats.seriesByType.comic)}
                  detail={formatMetricDetail(
                    data.stats.seriesByType.comic,
                    (metric) => `${formatTrend(metric.change)}，当前统计区间`,
                  )}
                />
                <OverviewCard
                  label="小说作品"
                  value={formatMetricValue(data.stats.seriesByType.novel)}
                  detail={formatMetricDetail(
                    data.stats.seriesByType.novel,
                    (metric) => `${formatTrend(metric.change)}，当前统计区间`,
                  )}
                />
                <OverviewCard
                  label="纳入统计的用户"
                  value={formatMetricValue(data.stats.users)}
                  detail={formatMetricDetail(data.stats.users, (metric) => `${formatTrend(metric.change)}，用户规模变化`)}
                />
                <OverviewCard
                  label="收入"
                  value={formatMetricValue(data.stats.revenue, money)}
                  detail={formatMetricDetail(data.stats.revenue, (metric) => `${formatTrend(metric.change)}，所选时间范围`)}
                />
              </div>
            </SurfacePanel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SurfacePanel appearance="light" tone="default" accent="amber">
              <SectionHeading
                title="访问关注"
                description="只有接口返回真实访问榜单时才会显示，缺失时不再伪造热门作品。"
              />
              <div className="mt-5 space-y-3">
                {data.top.byViews.length > 0 ? (
                  data.top.byViews.map((series, index) => (
                    <ListRow
                      key={series.id || index}
                      title={series.title}
                      detail={`${formatSeriesFormatLabel(series.type)} · ${number.format(
                        safeNumber(series.views),
                      )} 次访问`}
                    />
                  ))
                ) : (
                  <EmptyListState
                    title="暂时没有真实访问榜单"
                    description="后端当前没有返回访问排行，所以这里不会再展示虚假的热门作品。"
                  />
                )}
              </div>
            </SurfacePanel>

            <SurfacePanel appearance="light" tone="default" accent="rose">
              <SectionHeading
                title="收入观察"
                description="只在后端确实返回作品收入排行时展示。"
              />
              <div className="mt-5 space-y-3">
                {data.top.byRevenue.length > 0 ? (
                  data.top.byRevenue.map((series, index) => (
                    <ListRow
                      key={series.id || index}
                      title={series.title}
                      detail={`${formatSeriesFormatLabel(series.type)} · ${money.format(
                        safeNumber(series.revenue),
                      )}`}
                    />
                  ))
                ) : (
                  <EmptyListState
                    title="暂时没有真实收入排行"
                    description="当前接口没有返回作品收入榜，所以这里保持空状态。"
                  />
                )}
              </div>
            </SurfacePanel>
          </div>

          <SurfacePanel appearance="light" tone="default" accent="cyan">
            <SectionHeading
              title="最近活动"
              description="只展示接口真正返回的读者或运营活动，不再用样板动态占位。"
            />
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {data.activity.length > 0 ? (
                data.activity.map((entry, index) => (
                  <ListRow
                    key={entry.id || index}
                    title={`${entry.user}`}
                    detail={entry.action}
                    meta={entry.time}
                  />
                ))
              ) : (
                <EmptyListState
                  title="暂时没有真实活动流"
                  description="接口没有返回活动数据时，这里不会再伪造读者或运营动作。"
                />
              )}
            </div>
          </SurfacePanel>
        </>
      )}
    </div>
  );
}
