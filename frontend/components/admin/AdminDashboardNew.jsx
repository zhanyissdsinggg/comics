"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  { href: "/admin/series", label: "新增作品", icon: BookOpen, color: "text-ios-blue" },
  { href: "/admin/storefront", label: "前台体检", icon: Eye, color: "text-ios-cyan" },
  { href: "/admin/merchandising", label: "首页编排", icon: TrendingUp, color: "text-ios-orange" },
  { href: "/admin/creators", label: "创作者管理", icon: Award, color: "text-ios-orange" },
  { href: "/admin/promotions", label: "创建活动", icon: Megaphone, color: "text-ios-orange" },
  { href: "/admin/users", label: "管理用户", icon: Users, color: "text-ios-purple" },
  { href: "/admin/orders", label: "查看订单", icon: Receipt, color: "text-ios-green" },
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

function StatCard({ icon: Icon, label, metric, color }) {
  const isUp = metric.trend !== "down";
  const Trend = isUp ? ArrowUp : ArrowDown;

  return (
    <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 backdrop-blur-2xl shadow-ios">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-14 w-14 items-center justify-center rounded-4xl bg-gradient-to-br ${color} shadow-ios`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-bold ${isUp ? "text-ios-green" : "text-ios-red"}`}>
          <Trend size={16} />
          <span>{Math.abs(metric.change)}%</span>
        </div>
      </div>
      <p className="text-sm text-ios-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{number.format(metric.total)}</p>
    </div>
  );
}

function Panel({ title, children, action }) {
  return (
    <section className="rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 backdrop-blur-2xl shadow-ios">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ListRow({ eyebrow, title, meta }) {
  return (
    <div className="rounded-4xl bg-neutral-950/40 p-4">
      <div className="flex items-center gap-2">
        {eyebrow ? (
          <span className="rounded-full bg-ios-green/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ios-green">
            {eyebrow}
          </span>
        ) : null}
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="mt-1 text-xs text-ios-gray-400">{meta}</p>
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
      <section className="rounded-5xl border border-ios-gray-800 bg-gradient-to-br from-ios-green/10 to-emerald-600/5 p-6 backdrop-blur-2xl shadow-ios">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
              <TrendingUp size={24} className="text-ios-green" />
              运营总览
            </h2>
            <p className="mt-2 text-sm text-ios-gray-400">
              在一个面板里查看内容产出、收入表现和用户增长趋势。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-4xl border border-ios-green/20 bg-ios-green/5 px-4 py-2.5 text-xs font-bold text-ios-green transition hover:bg-ios-green/10 disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? "刷新中..." : "刷新"}</span>
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-4xl border border-ios-blue/20 bg-ios-blue/5 px-4 py-2.5 text-xs font-bold text-ios-blue transition hover:bg-ios-blue/10"
            >
              <Download size={14} />
              <span>导出</span>
            </button>
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`rounded-4xl px-4 py-2 text-sm font-bold transition ${
                  range === option.value
                    ? "bg-ios-green text-white shadow-ios"
                    : "bg-neutral-800/50 text-ios-gray-300 hover:bg-neutral-800 hover:text-ios-green"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {range === "custom" ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ios-gray-400">
              开始
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="rounded-3xl border border-ios-green/20 bg-neutral-800/50 px-4 py-2 text-sm text-white"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-ios-gray-400">
              结束
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="rounded-3xl border border-ios-green/20 bg-neutral-800/50 px-4 py-2 text-sm text-white"
              />
            </label>
          </div>
        ) : null}
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={Users} label="总用户数" metric={data.stats.users} color="from-purple-500 to-purple-600" />
            <StatCard icon={BookOpen} label="作品数" metric={data.stats.series} color="from-blue-500 to-blue-600" />
            <StatCard icon={Receipt} label="订单数" metric={data.stats.orders} color="from-orange-500 to-orange-600" />
            <StatCard icon={DollarSign} label="收入" metric={data.stats.revenue} color="from-emerald-500 to-emerald-600" />
            <StatCard icon={Eye} label="浏览量" metric={data.stats.views} color="from-cyan-500 to-cyan-600" />
            <StatCard icon={MessageSquare} label="评论数" metric={data.stats.comments} color="from-pink-500 to-pink-600" />
            <StatCard icon={BookOpen} label="漫画作品" metric={data.stats.seriesByType.comic} color="from-blue-500 to-blue-600" />
            <StatCard icon={Award} label="小说作品" metric={data.stats.seriesByType.novel} color="from-purple-500 to-purple-600" />
            <StatCard icon={Layers} label="章节数" metric={data.stats.episodes} color="from-emerald-500 to-emerald-600" />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold text-white">快捷操作</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {QUICK_ACTIONS.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 text-center text-white transition hover:border-ios-green/30 hover:bg-neutral-900"
                  >
                    <Icon className={`mx-auto mb-3 ${item.color}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="浏览量最高作品">
              {data.top.byViews.map((series, index) => (
                <ListRow
                  key={series.id || index}
                  eyebrow={series.type === "comic" ? "漫画" : "小说"}
                  title={series.title}
                  meta={`${number.format(safeNumber(series.views))} 次浏览`}
                />
              ))}
            </Panel>
            <Panel title="收入最高作品">
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="最近更新">
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
              action={
                <Link href="/admin/tracking" className="text-sm font-medium text-ios-green hover:text-emerald-300">
                  查看追踪 &gt;
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
