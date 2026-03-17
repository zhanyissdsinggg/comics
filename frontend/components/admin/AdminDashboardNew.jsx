"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { apiGet } from "../../lib/apiClient";
import {
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  DollarSign,
  Download,
  Eye,
  Layers,
  Megaphone,
  MessageSquare,
  Receipt,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

const number = new Intl.NumberFormat("zh-CN");
const money = new Intl.NumberFormat("zh-CN", {
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
  { id: 1, title: "Midnight Contract", type: "comic", updatedAt: "2024-01-15T10:30:00Z", episodeCount: 45 },
  { id: 2, title: "Crimson Promise", type: "novel", updatedAt: "2024-01-15T09:15:00Z", episodeCount: 32 },
  { id: 3, title: "Shadow Realm", type: "comic", updatedAt: "2024-01-14T18:45:00Z", episodeCount: 28 },
];

const DEFAULT_ACTIVITY = [
  { id: 1, user: "用户 A", action: "购买了《Midnight Contract》", time: "5 分钟前" },
  { id: 2, user: "用户 B", action: "评论了《Crimson Promise》", time: "10 分钟前" },
  { id: 3, user: "管理员", action: "发布了新作品", time: "30 分钟前" },
];

const RANGE_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "7days", label: "最近 7 天" },
  { value: "30days", label: "最近 30 天" },
  { value: "custom", label: "自定义" },
];

const QUICK_ACTIONS = [
  { href: "/admin/series", label: "新增作品", icon: BookOpen },
  { href: "/admin/storefront", label: "前台体检", icon: Eye },
  { href: "/admin/merchandising", label: "首页编排", icon: TrendingUp },
  { href: "/admin/creators", label: "创作者管理", icon: Award },
  { href: "/admin/promotions", label: "创建活动", icon: Megaphone },
  { href: "/admin/users", label: "管理用户", icon: Users },
  { href: "/admin/orders", label: "查看订单", icon: Receipt },
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
      byViews: safeArray(root.topSeries?.byViews ?? root.rankings?.byViews ?? root.byViews, DEFAULT_TOP.byViews),
      byRevenue: safeArray(
        root.topSeries?.byRevenue ?? root.rankings?.byRevenue ?? root.byRevenue,
        DEFAULT_TOP.byRevenue,
      ),
    },
    updates: safeArray(root.recentUpdates ?? root.latestSeries ?? root.updatedSeries, DEFAULT_UPDATES),
    activity: safeArray(root.recentActivities ?? root.activities ?? root.timeline, DEFAULT_ACTIVITY).map(
      (item, index) => ({
        id: item?.id || `activity-${index}`,
        user: item?.user || item?.username || item?.operator || DEFAULT_ACTIVITY[index % DEFAULT_ACTIVITY.length].user,
        action:
          item?.action ||
          item?.description ||
          item?.message ||
          DEFAULT_ACTIVITY[index % DEFAULT_ACTIVITY.length].action,
        time:
          item?.time ||
          (item?.createdAt ? relativeTime(item.createdAt) : DEFAULT_ACTIVITY[index % DEFAULT_ACTIVITY.length].time),
      }),
    ),
  };
}

function StatCard({ icon: Icon, label, metric, format = (value) => number.format(value), accentClass }) {
  const isUp = metric.trend !== "down";
  const Trend = isUp ? ArrowUp : ArrowDown;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,28,0.9),rgba(8,11,16,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          accentClass,
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_24%,transparent_76%,rgba(255,255,255,0.03))]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.06] text-white">
            <Icon size={22} />
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
              isUp
                ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : "border border-rose-400/20 bg-rose-400/10 text-rose-100",
            )}
          >
            <Trend size={14} />
            <span>{Math.abs(metric.change)}%</span>
          </div>
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
          {label}
        </p>
        <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
          {format(metric.total)}
        </p>
      </div>
    </div>
  );
}

function Panel({ title, description, children, action }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,28,0.92),rgba(8,11,16,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_24%,transparent_76%,rgba(255,255,255,0.03))]" />
      <div className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white">{title}</h3>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
            ) : null}
          </div>
          {action}
        </div>

        <div className="mt-5 space-y-3">{children}</div>
      </div>
    </section>
  );
}

function ListRow({ eyebrow, title, meta }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
      <div className="flex items-center gap-2">
        {eyebrow ? (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
            {eyebrow}
          </span>
        ) : null}
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="mt-2 text-xs text-neutral-400">{meta}</p>
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
      ["指标", "数值", "变化", "趋势"],
      ["总用户数", data.stats.users.total, `${data.stats.users.change}%`, data.stats.users.trend],
      ["作品数", data.stats.series.total, `${data.stats.series.change}%`, data.stats.series.trend],
      ["订单数", data.stats.orders.total, `${data.stats.orders.change}%`, data.stats.orders.trend],
      ["收入", data.stats.revenue.total, `${data.stats.revenue.change}%`, data.stats.revenue.trend],
      ["浏览量", data.stats.views.total, `${data.stats.views.change}%`, data.stats.views.trend],
      ["评论数", data.stats.comments.total, `${data.stats.comments.change}%`, data.stats.comments.trend],
      ["漫画作品", data.stats.seriesByType.comic.total, `${data.stats.seriesByType.comic.change}%`, data.stats.seriesByType.comic.trend],
      ["小说作品", data.stats.seriesByType.novel.total, `${data.stats.seriesByType.novel.change}%`, data.stats.seriesByType.novel.trend],
      ["章节数", data.stats.episodes.total, `${data.stats.episodes.change}%`, data.stats.episodes.trend],
    ];

    const blob = new Blob([`\ufeff${rows.map((row) => row.join(",")).join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-data-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,28,26,0.94),rgba(8,11,16,0.98))] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.24)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_26%),radial-gradient(circle_at_82%_0%,rgba(56,189,248,0.14),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_24%,transparent_76%,rgba(255,255,255,0.03))]" />
        <div className="relative">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100">
                <TrendingUp size={14} />
                运营总览
              </div>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-[2.35rem]">
                用一套真正可运营的后台视图看全站数据。
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-300 sm:text-base">
                这里把内容产出、收入趋势、用户行为和最近动态都压进一个清晰的工作台里，方便你起床之后直接判断今天先动哪一块。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                <span>{refreshing ? "刷新中..." : "刷新数据"}</span>
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <Download size={16} />
                <span>导出报表</span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  range === option.value
                    ? "bg-white text-neutral-950 shadow-[0_18px_40px_rgba(255,255,255,0.18)]"
                    : "border border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {range === "custom" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-sm text-neutral-400">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  开始日期
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400/40"
                />
              </label>
              <label className="text-sm text-neutral-400">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  结束日期
                </span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400/40"
                />
              </label>
            </div>
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <StatCard icon={Users} label="总用户数" metric={data.stats.users} accentClass="via-cyan-300/55" />
            <StatCard icon={BookOpen} label="作品数" metric={data.stats.series} accentClass="via-blue-300/55" />
            <StatCard icon={Receipt} label="订单数" metric={data.stats.orders} accentClass="via-amber-300/55" />
            <StatCard
              icon={DollarSign}
              label="收入"
              metric={data.stats.revenue}
              format={(value) => money.format(value)}
              accentClass="via-emerald-300/55"
            />
            <StatCard icon={Eye} label="浏览量" metric={data.stats.views} accentClass="via-sky-300/55" />
            <StatCard
              icon={MessageSquare}
              label="评论数"
              metric={data.stats.comments}
              accentClass="via-rose-300/55"
            />
            <StatCard
              icon={BookOpen}
              label="漫画作品"
              metric={data.stats.seriesByType.comic}
              accentClass="via-indigo-300/55"
            />
            <StatCard
              icon={Award}
              label="小说作品"
              metric={data.stats.seriesByType.novel}
              accentClass="via-fuchsia-300/55"
            />
            <StatCard icon={Layers} label="章节数" metric={data.stats.episodes} accentClass="via-teal-300/55" />
          </div>

          <Panel title="快捷操作" description="常用入口做成一排，避免每天在后台里来回翻找。">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
              {QUICK_ACTIONS.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-[24px] border border-white/10 bg-black/20 px-4 py-5 text-center transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-white">
                      <Icon size={18} />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">{item.label}</p>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel
              title="浏览量最高作品"
              description="看当前被打开最多的作品，方便你判断前台热度和曝光位是否合理。"
            >
              {data.top.byViews.map((series, index) => (
                <ListRow
                  key={series.id || index}
                  eyebrow={series.type === "comic" ? "漫画" : "小说"}
                  title={series.title}
                  meta={`${number.format(safeNumber(series.views))} 次浏览`}
                />
              ))}
            </Panel>

            <Panel
              title="收入最高作品"
              description="高收入作品会直接影响首页编排、活动资源位和充值节奏。"
            >
              {data.top.byRevenue.map((series, index) => (
                <ListRow
                  key={series.id || index}
                  eyebrow={series.type === "comic" ? "漫画" : "小说"}
                  title={series.title}
                  meta={money.format(safeNumber(series.revenue))}
                />
              ))}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel
              title="最近更新"
              description="最近上线和更新的内容应该跟前台的发现路径保持一致。"
            >
              {data.updates.map((series, index) => (
                <ListRow
                  key={series.id || index}
                  eyebrow={series.type === "comic" ? "漫画" : "小说"}
                  title={series.title}
                  meta={`${number.format(safeNumber(series.episodeCount))} 章 · ${relativeTime(series.updatedAt)}`}
                />
              ))}
            </Panel>

            <Panel
              title="最近活动"
              description="运营动作、用户购买和评论变化都应该在这里快速扫到。"
              action={
                <Link
                  href="/admin/tracking"
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  查看追踪
                </Link>
              }
            >
              {data.activity.map((entry, index) => (
                <ListRow key={entry.id || index} title={`${entry.user} ${entry.action}`} meta={entry.time} />
              ))}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
