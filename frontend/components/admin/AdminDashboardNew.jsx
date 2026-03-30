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

const number = new Intl.NumberFormat("en-US");
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DEFAULT_STATS = {
  users: { total: 12543, change: 12.5, trend: "up" },
  series: { total: 856, change: 3.2, trend: "up" },
  orders: { total: 3421, change: -2.1, trend: "down" },
  revenue: { total: 45678, change: 18.3, trend: "up" },
  views: { total: 234567, change: 8.7, trend: "up" },
  comments: { total: 1234, change: 5.4, trend: "up" },
  seriesByType: {
    comic: { total: 520, change: 5.2, trend: "up" },
    novel: { total: 336, change: 1.8, trend: "up" },
  },
  episodes: { total: 12456, change: 15.3, trend: "up" },
};

const DEFAULT_TOP = {
  byViews: [
    { id: 1, title: "Midnight Contract", type: "comic", views: 45678, revenue: 0 },
    { id: 2, title: "Crimson Promise", type: "novel", views: 38921, revenue: 0 },
    { id: 3, title: "Shadow Realm", type: "comic", views: 32145, revenue: 0 },
  ],
  byRevenue: [
    { id: 1, title: "Midnight Contract", type: "comic", views: 0, revenue: 8934 },
    { id: 2, title: "Shadow Realm", type: "comic", views: 0, revenue: 7821 },
    { id: 3, title: "Crimson Promise", type: "novel", views: 0, revenue: 6543 },
  ],
};

const DEFAULT_UPDATES = [
  {
    id: 1,
    title: "Midnight Contract",
    type: "comic",
    updatedAt: "2024-01-15T10:30:00Z",
    episodeCount: 45,
  },
  {
    id: 2,
    title: "Crimson Promise",
    type: "novel",
    updatedAt: "2024-01-15T09:15:00Z",
    episodeCount: 32,
  },
  {
    id: 3,
    title: "Shadow Realm",
    type: "comic",
    updatedAt: "2024-01-14T18:45:00Z",
    episodeCount: 28,
  },
];

const DEFAULT_ACTIVITY = [
  { id: 1, user: "Reader A", action: "purchased Midnight Contract", time: "5 min ago" },
  { id: 2, user: "Reader B", action: "commented on Crimson Promise", time: "10 min ago" },
  { id: 3, user: "Editor", action: "published a new title", time: "30 min ago" },
];

const RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7days", label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

const QUICK_ACTIONS = [
  { href: "/admin/series", label: "New Series", description: "Add or update titles.", icon: BookOpen },
  {
    href: "/admin/creators",
    label: "Update Credits",
    description: "Keep creator identity clean.",
    icon: Users,
  },
  {
    href: "/admin/merchandising",
    label: "Edit Collections",
    description: "Control featured discovery lanes.",
    icon: Sparkles,
  },
  {
    href: "/admin/storefront",
    label: "Review Live Pages",
    description: "Check what readers actually see.",
    icon: Layers,
  },
];

const safeArray = (value, fallback) => (Array.isArray(value) ? value : fallback);

const safeNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMetric = (metric, fallback) => {
  const source = metric && typeof metric === "object" ? metric : {};
  const total = safeNumber(source.total, fallback.total);
  const change = safeNumber(source.change ?? source.delta ?? source.growth, fallback.change);
  return { total, change, trend: source.trend || (change < 0 ? "down" : "up") };
};

const relativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

function normalize(payload) {
  const root = payload?.data ?? payload ?? {};
  const stats = root.stats ?? root;

  return {
    stats: {
      users: normalizeMetric(stats.users, DEFAULT_STATS.users),
      series: normalizeMetric(stats.series, DEFAULT_STATS.series),
      orders: normalizeMetric(stats.orders, DEFAULT_STATS.orders),
      revenue: normalizeMetric(stats.revenue, DEFAULT_STATS.revenue),
      views: normalizeMetric(stats.views, DEFAULT_STATS.views),
      comments: normalizeMetric(stats.comments, DEFAULT_STATS.comments),
      seriesByType: {
        comic: normalizeMetric(stats.seriesByType?.comic, DEFAULT_STATS.seriesByType.comic),
        novel: normalizeMetric(stats.seriesByType?.novel, DEFAULT_STATS.seriesByType.novel),
      },
      episodes: normalizeMetric(stats.episodes, DEFAULT_STATS.episodes),
    },
    top: {
      byViews: safeArray(
        root.topSeries?.byViews ?? root.rankings?.byViews ?? root.byViews,
        DEFAULT_TOP.byViews,
      ),
      byRevenue: safeArray(
        root.topSeries?.byRevenue ?? root.rankings?.byRevenue ?? root.byRevenue,
        DEFAULT_TOP.byRevenue,
      ),
    },
    updates: safeArray(
      root.recentUpdates ?? root.latestSeries ?? root.updatedSeries,
      DEFAULT_UPDATES,
    ),
    activity: safeArray(
      root.recentActivities ?? root.activities ?? root.timeline,
      DEFAULT_ACTIVITY,
    ).map((item, index) => ({
      id: item?.id || `activity-${index}`,
      user:
        item?.user ||
        item?.username ||
        item?.operator ||
        DEFAULT_ACTIVITY[index % DEFAULT_ACTIVITY.length].user,
      action:
        item?.action ||
        item?.description ||
        item?.message ||
        DEFAULT_ACTIVITY[index % DEFAULT_ACTIVITY.length].action,
      time:
        item?.time ||
        (item?.createdAt
          ? relativeTime(item.createdAt)
          : DEFAULT_ACTIVITY[index % DEFAULT_ACTIVITY.length].time),
    })),
  };
}

function formatTrend(change) {
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${Math.abs(change).toFixed(1)}%`;
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
  const [data, setData] = useState({
    stats: DEFAULT_STATS,
    top: DEFAULT_TOP,
    updates: DEFAULT_UPDATES,
    activity: DEFAULT_ACTIVITY,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
          setData({
            stats: DEFAULT_STATS,
            top: DEFAULT_TOP,
            updates: DEFAULT_UPDATES,
            activity: DEFAULT_ACTIVITY,
          });
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
      const response = await apiGet(`/api/admin/stats/dashboard${query}`);
      if (!response.ok) {
        throw new Error(`request failed: ${response.status}`);
      }

      setData(normalize(response.data));
    } catch (error) {
      console.error("admin dashboard refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Metric", "Value", "Change", "Trend"],
      ["Users", data.stats.users.total, `${data.stats.users.change}%`, data.stats.users.trend],
      ["Series", data.stats.series.total, `${data.stats.series.change}%`, data.stats.series.trend],
      ["Orders", data.stats.orders.total, `${data.stats.orders.change}%`, data.stats.orders.trend],
      ["Revenue", data.stats.revenue.total, `${data.stats.revenue.change}%`, data.stats.revenue.trend],
      ["Views", data.stats.views.total, `${data.stats.views.change}%`, data.stats.views.trend],
      [
        "Comments",
        data.stats.comments.total,
        `${data.stats.comments.change}%`,
        data.stats.comments.trend,
      ],
      [
        "Comic series",
        data.stats.seriesByType.comic.total,
        `${data.stats.seriesByType.comic.change}%`,
        data.stats.seriesByType.comic.trend,
      ],
      [
        "Novel series",
        data.stats.seriesByType.novel.total,
        `${data.stats.seriesByType.novel.change}%`,
        data.stats.seriesByType.novel.trend,
      ],
      [
        "Episodes",
        data.stats.episodes.total,
        `${data.stats.episodes.change}%`,
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
      label: "Live series",
      value: number.format(data.stats.series.total),
      detail: `${formatTrend(data.stats.series.change)} vs. the previous period`,
      emphasis: true,
    },
    {
      label: "Episodes in catalog",
      value: number.format(data.stats.episodes.total),
      detail: `${formatTrend(data.stats.episodes.change)} in recent volume`,
    },
    {
      label: "Orders processed",
      value: number.format(data.stats.orders.total),
      detail: `${formatTrend(data.stats.orders.change)} across commercial flows`,
    },
    {
      label: "Reader signals",
      value: number.format(data.stats.comments.total),
      detail: `${formatTrend(data.stats.comments.change)} in comment volume`,
    },
  ];

  return (
    <div className="space-y-6">
      <SurfacePanel appearance="light" tone="highlight" accent="blue" className="p-0">
        <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Publishing overview
            </p>
            <h2 className="mt-3 text-[2.1rem] font-semibold tracking-tight text-slate-950 sm:text-[2.6rem]">
              Keep the catalog clean, current, and ready to publish.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              This dashboard is a quiet starting point for the day. Refresh the latest signals, jump into the content queue, and keep discovery surfaces aligned with what is actually live.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button type="button" onClick={refresh} disabled={refreshing}>
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button type="button" variant="outline" onClick={exportCsv}>
                <Download size={16} />
                Export CSV
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
                    From
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
                    To
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
              title="Quick actions"
              description="Start with the tasks that affect stories, credits, and front-page presentation first."
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
                      <span>Open</span>
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
                title="Publishing queue"
                description="Watch the titles that changed most recently and make sure they are ready for discovery."
              />
              <div className="mt-5 space-y-3">
                {data.updates.map((series, index) => (
                  <ListRow
                    key={series.id || index}
                    title={series.title}
                    detail={`${series.type === "comic" ? "Comic" : "Novel"} · ${number.format(
                      safeNumber(series.episodeCount),
                    )} episodes`}
                    meta={relativeTime(series.updatedAt)}
                  />
                ))}
              </div>
            </SurfacePanel>

            <SurfacePanel appearance="light" tone="default" accent="emerald">
              <SectionHeading
                title="Catalog mix"
                description="Keep the storefront balanced across formats and audience activity."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <OverviewCard
                  label="Comic series"
                  value={number.format(data.stats.seriesByType.comic.total)}
                  detail={`${formatTrend(data.stats.seriesByType.comic.change)} this period`}
                />
                <OverviewCard
                  label="Novel series"
                  value={number.format(data.stats.seriesByType.novel.total)}
                  detail={`${formatTrend(data.stats.seriesByType.novel.change)} this period`}
                />
                <OverviewCard
                  label="Readers tracked"
                  value={number.format(data.stats.users.total)}
                  detail={`${formatTrend(data.stats.users.change)} in active user volume`}
                />
                <OverviewCard
                  label="Revenue"
                  value={money.format(data.stats.revenue.total)}
                  detail={`${formatTrend(data.stats.revenue.change)} in the selected range`}
                />
              </div>
            </SurfacePanel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SurfacePanel appearance="light" tone="default" accent="amber">
              <SectionHeading
                title="Reader attention"
                description="These titles are drawing the most visits right now, so their live presentation matters most."
              />
              <div className="mt-5 space-y-3">
                {data.top.byViews.map((series, index) => (
                  <ListRow
                    key={series.id || index}
                    title={series.title}
                    detail={`${series.type === "comic" ? "Comic" : "Novel"} · ${number.format(
                      safeNumber(series.views),
                    )} visits`}
                  />
                ))}
              </div>
            </SurfacePanel>

            <SurfacePanel appearance="light" tone="default" accent="rose">
              <SectionHeading
                title="Commercial watch"
                description="A quieter view of which titles are carrying the most revenue in the current window."
              />
              <div className="mt-5 space-y-3">
                {data.top.byRevenue.map((series, index) => (
                  <ListRow
                    key={series.id || index}
                    title={series.title}
                    detail={`${series.type === "comic" ? "Comic" : "Novel"} · ${money.format(
                      safeNumber(series.revenue),
                    )}`}
                  />
                ))}
              </div>
            </SurfacePanel>
          </div>

          <SurfacePanel appearance="light" tone="default" accent="cyan">
            <SectionHeading
              title="Recent activity"
              description="A quick feed of reader and operator activity without turning the page into a noisy monitoring console."
            />
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {data.activity.map((entry, index) => (
                <ListRow
                  key={entry.id || index}
                  title={`${entry.user}`}
                  detail={entry.action}
                  meta={entry.time}
                />
              ))}
            </div>
          </SurfacePanel>
        </>
      )}
    </div>
  );
}
