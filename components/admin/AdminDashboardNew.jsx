"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  Bell,
  BookOpen,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Layers,
  Megaphone,
  MessageSquare,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";

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

const DEFAULT_TOP_SERIES = {
  byViews: [
    { id: 1, title: "Midnight Contract", type: "comic", views: 45678, revenue: 0 },
    { id: 2, title: "Crimson Promise", type: "novel", views: 38921, revenue: 0 },
    { id: 3, title: "Shadow Realm", type: "comic", views: 32145, revenue: 0 },
    { id: 4, title: "Eternal Bond", type: "novel", views: 28934, revenue: 0 },
    { id: 5, title: "Dark Fantasy", type: "comic", views: 25678, revenue: 0 },
  ],
  byRevenue: [
    { id: 1, title: "Midnight Contract", type: "comic", views: 0, revenue: 8934 },
    { id: 2, title: "Shadow Realm", type: "comic", views: 0, revenue: 7821 },
    { id: 3, title: "Crimson Promise", type: "novel", views: 0, revenue: 6543 },
    { id: 4, title: "Eternal Bond", type: "novel", views: 0, revenue: 5432 },
    { id: 5, title: "Dark Fantasy", type: "comic", views: 0, revenue: 4321 },
  ],
};

const DEFAULT_RECENT_UPDATES = [
  { id: 1, title: "Midnight Contract", type: "comic", updatedAt: "2024-01-15T10:30:00Z", episodeCount: 45 },
  { id: 2, title: "Crimson Promise", type: "novel", updatedAt: "2024-01-15T09:15:00Z", episodeCount: 32 },
  { id: 3, title: "Shadow Realm", type: "comic", updatedAt: "2024-01-14T18:45:00Z", episodeCount: 28 },
  { id: 4, title: "Eternal Bond", type: "novel", updatedAt: "2024-01-14T16:20:00Z", episodeCount: 41 },
  { id: 5, title: "Dark Fantasy", type: "comic", updatedAt: "2024-01-14T14:10:00Z", episodeCount: 36 },
];

const DEFAULT_ACTIVITIES = [
  { id: 1, type: "order", user: "用户A", action: "购买了《Midnight Contract》", time: "5分钟前" },
  { id: 2, type: "comment", user: "用户B", action: "评论了《Crimson Promise》", time: "10分钟前" },
  { id: 3, type: "user", user: "用户C", action: "注册了新账号", time: "15分钟前" },
  { id: 4, type: "order", user: "用户D", action: "购买了套餐", time: "20分钟前" },
  { id: 5, type: "series", user: "管理员", action: "发布了新作品", time: "30分钟前" },
];

function toArray(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}

function toNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function resolveTrend(change, trend) {
  if (trend === "up" || trend === "down") {
    return trend;
  }
  return change < 0 ? "down" : "up";
}

function normalizeMetric(metric, fallback, flatTotal, flatChange) {
  const source = metric && typeof metric === "object" ? metric : {};
  const total = toNumber(source.total, toNumber(flatTotal, fallback.total));
  const change = toNumber(
    source.change,
    toNumber(source.delta, toNumber(source.growth, toNumber(flatChange, fallback.change))),
  );
  const trend = resolveTrend(change, source.trend);

  return { total, change, trend };
}

function normalizeSeriesEntry(entry, index, metric, fallback) {
  const source = entry && typeof entry === "object" ? entry : {};
  const base = fallback[index] || fallback[0];

  return {
    id: source.id || source.seriesId || source._id || `${metric}-${index + 1}`,
    title: source.title || source.name || source.seriesTitle || base.title,
    type: source.type || source.seriesType || base.type || "comic",
    views: toNumber(source.views, toNumber(source.viewCount, base.views || 0)),
    revenue: toNumber(source.revenue, toNumber(source.amount, base.revenue || 0)),
  };
}

function normalizeTopSeries(payload) {
  const source = payload && typeof payload === "object" ? payload : {};

  const viewSource =
    source.topByViews ||
    source.seriesByViews ||
    source.hotSeriesByViews ||
    source.byViews ||
    source.topSeriesByViews ||
    source.rankByViews;

  const revenueSource =
    source.topByRevenue ||
    source.seriesByRevenue ||
    source.hotSeriesByRevenue ||
    source.byRevenue ||
    source.topSeriesByRevenue ||
    source.rankByRevenue;

  return {
    byViews: toArray(viewSource, DEFAULT_TOP_SERIES.byViews).map((entry, index) =>
      normalizeSeriesEntry(entry, index, "views", DEFAULT_TOP_SERIES.byViews),
    ),
    byRevenue: toArray(revenueSource, DEFAULT_TOP_SERIES.byRevenue).map((entry, index) =>
      normalizeSeriesEntry(entry, index, "revenue", DEFAULT_TOP_SERIES.byRevenue),
    ),
  };
}

function normalizeRecentUpdates(list) {
  return toArray(list, DEFAULT_RECENT_UPDATES).map((entry, index) => {
    const source = entry && typeof entry === "object" ? entry : {};
    const fallback = DEFAULT_RECENT_UPDATES[index] || DEFAULT_RECENT_UPDATES[0];

    return {
      id: source.id || source.seriesId || source._id || `update-${index + 1}`,
      title: source.title || source.name || source.seriesTitle || fallback.title,
      type: source.type || source.seriesType || fallback.type,
      updatedAt: source.updatedAt || source.updated_at || source.lastUpdatedAt || fallback.updatedAt,
      episodeCount: toNumber(source.episodeCount, toNumber(source.totalEpisodes, fallback.episodeCount)),
    };
  });
}

function getRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

function normalizeActivities(list) {
  return toArray(list, DEFAULT_ACTIVITIES).map((entry, index) => {
    const source = entry && typeof entry === "object" ? entry : {};
    const fallback = DEFAULT_ACTIVITIES[index] || DEFAULT_ACTIVITIES[0];

    return {
      id: source.id || source.activityId || source._id || `activity-${index + 1}`,
      type: source.type || source.category || fallback.type,
      user: source.user || source.username || source.operator || fallback.user,
      action: source.action || source.description || source.message || fallback.action,
      time: source.time || (source.createdAt ? getRelativeTime(source.createdAt) : fallback.time),
    };
  });
}

function normalizeDashboardPayload(payload) {
  const root = payload?.data ?? payload ?? {};
  const statsSource = root.stats ?? root;

  const normalizedStats = {
    users: normalizeMetric(
      statsSource.users,
      DEFAULT_STATS.users,
      root.totalUsers ?? root.usersTotal ?? root.userCount,
      root.usersChange ?? root.userGrowth,
    ),
    series: normalizeMetric(
      statsSource.series,
      DEFAULT_STATS.series,
      root.totalSeries ?? root.seriesTotal ?? root.worksCount,
      root.seriesChange ?? root.seriesGrowth,
    ),
    orders: normalizeMetric(
      statsSource.orders,
      DEFAULT_STATS.orders,
      root.totalOrders ?? root.ordersTotal ?? root.orderCount,
      root.ordersChange ?? root.orderGrowth,
    ),
    revenue: normalizeMetric(
      statsSource.revenue,
      DEFAULT_STATS.revenue,
      root.totalRevenue ?? root.revenueTotal ?? root.revenue,
      root.revenueChange ?? root.revenueGrowth,
    ),
    views: normalizeMetric(
      statsSource.views,
      DEFAULT_STATS.views,
      root.totalViews ?? root.viewsTotal ?? root.viewCount,
      root.viewsChange ?? root.viewsGrowth,
    ),
    comments: normalizeMetric(
      statsSource.comments,
      DEFAULT_STATS.comments,
      root.totalComments ?? root.commentsTotal ?? root.commentCount,
      root.commentsChange ?? root.commentsGrowth,
    ),
    seriesByType: {
      comic: normalizeMetric(
        statsSource.seriesByType?.comic,
        DEFAULT_STATS.seriesByType.comic,
        root.comicSeriesCount ?? root.totalComicSeries,
        root.comicSeriesChange,
      ),
      novel: normalizeMetric(
        statsSource.seriesByType?.novel,
        DEFAULT_STATS.seriesByType.novel,
        root.novelSeriesCount ?? root.totalNovelSeries,
        root.novelSeriesChange,
      ),
    },
    episodes: normalizeMetric(
      statsSource.episodes,
      DEFAULT_STATS.episodes,
      root.totalEpisodes ?? root.episodesTotal,
      root.episodesChange,
    ),
  };

  const topSource = root.topSeries || root.rankings || root;
  const normalizedTopSeries = normalizeTopSeries(topSource);

  const updatesSource = root.recentUpdates || root.latestSeries || root.updatedSeries;
  const activitiesSource = root.recentActivities || root.activities || root.timeline;

  return {
    stats: normalizedStats,
    topSeries: normalizedTopSeries,
    recentUpdates: normalizeRecentUpdates(updatesSource),
    activities: normalizeActivities(activitiesSource),
  };
}

function StatCard({ icon: Icon, label, value, change, trend, color }) {
  const safeValue = toNumber(value, 0);
  const safeChange = toNumber(change, 0);
  const isPositive = trend !== "down";
  const TrendIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 transition-opacity duration-300 group-hover:opacity-10`} />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br ${color} shadow-lg`}>
            <Icon size={24} className="text-white" />
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            <TrendIcon size={16} />
            <span>{Math.abs(safeChange)}%</span>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm text-neutral-400">{label}</p>
          <p className="text-3xl font-bold text-neutral-100">{safeValue.toLocaleString("zh-CN")}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, color }) {
  return (
    <a
      href={href}
      className="group flex flex-col items-center gap-3 rounded-[16px] border border-emerald-500/10 bg-neutral-900/50 p-6 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95"
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br ${color} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
        <Icon size={28} className="text-white" />
      </div>
      <span className="text-sm font-medium text-neutral-200 transition-colors duration-300 group-hover:text-emerald-300">
        {label}
      </span>
    </a>
  );
}

function ActivityItem({ activity }) {
  const iconByType = {
    order: <Receipt size={16} className="text-emerald-400" />,
    comment: <MessageSquare size={16} className="text-blue-400" />,
    user: <Users size={16} className="text-purple-400" />,
    series: <BookOpen size={16} className="text-orange-400" />,
  };

  return (
    <div className="group flex items-start gap-3 rounded-[14px] p-3 transition-all duration-300 hover:bg-emerald-500/5">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-neutral-800/50 transition-colors duration-300 group-hover:bg-emerald-500/10">
        {iconByType[activity.type] || <Bell size={16} className="text-neutral-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-neutral-200">
          <span className="font-medium text-emerald-300">{activity.user}</span>
          {" "}
          <span className="text-neutral-400">{activity.action}</span>
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">{activity.time}</p>
      </div>
    </div>
  );
}

function TopSeriesItem({ series, rank, metric }) {
  const rankColor =
    rank === 1
      ? "from-yellow-500 to-yellow-600"
      : rank === 2
        ? "from-gray-400 to-gray-500"
        : rank === 3
          ? "from-orange-600 to-orange-700"
          : "from-neutral-700 to-neutral-800";

  return (
    <div className="group flex items-center gap-3 rounded-[14px] p-3 transition-all duration-300 hover:bg-emerald-500/5">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br ${rankColor} shadow-lg`}>
        <span className="text-sm font-bold text-white">{rank}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-200">{series.title}</p>
          <span className={`flex-shrink-0 rounded-[6px] bg-neutral-800/50 px-2 py-0.5 text-xs ${series.type === "comic" ? "text-blue-400" : "text-purple-400"}`}>
            {series.type === "comic" ? "漫画" : "小说"}
          </span>
        </div>
        <p className="text-xs text-neutral-400">
          {metric === "views"
            ? `${toNumber(series.views).toLocaleString("zh-CN")} 次浏览`
            : `¥${toNumber(series.revenue).toLocaleString("zh-CN")} 收入`}
        </p>
      </div>
    </div>
  );
}

function RecentUpdateItem({ series }) {
  return (
    <div className="group flex items-center gap-3 rounded-[14px] p-3 transition-all duration-300 hover:bg-emerald-500/5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-emerald-500/10 transition-colors duration-300 group-hover:bg-emerald-500/20">
        <Clock size={16} className="text-emerald-400" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-200">{series.title}</p>
          <span className={`flex-shrink-0 rounded-[6px] bg-neutral-800/50 px-2 py-0.5 text-xs ${series.type === "comic" ? "text-blue-400" : "text-purple-400"}`}>
            {series.type === "comic" ? "漫画" : "小说"}
          </span>
        </div>
        <p className="text-xs text-neutral-400">
          {toNumber(series.episodeCount)} 章节 · {getRelativeTime(series.updatedAt)}
        </p>
      </div>
    </div>
  );
}

function EmptyBlock({ text }) {
  return (
    <div className="rounded-[14px] border border-dashed border-neutral-700 p-4 text-center text-sm text-neutral-500">
      {text}
    </div>
  );
}

export default function AdminDashboardNew() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [topSeries, setTopSeries] = useState(DEFAULT_TOP_SERIES);
  const [recentUpdates, setRecentUpdates] = useState(DEFAULT_RECENT_UPDATES);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const queryString = useMemo(() => {
    if (dateRange === "7days") {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return `?from=${from}&to=${to}`;
    }

    if (dateRange === "30days") {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return `?from=${from}&to=${to}`;
    }

    if (dateRange === "custom" && customFrom && customTo) {
      return `?from=${customFrom}&to=${customTo}`;
    }

    return "";
  }, [dateRange, customFrom, customTo]);

  useEffect(() => {
    let aborted = false;

    async function fetchDashboardData() {
      try {
        setIsLoading(true);

        const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
        const endpoint = `${baseUrl}/api/admin/stats/dashboard${queryString}`;
        const token = localStorage.getItem("admin_token");

        const headers = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(endpoint, { headers });

        if (!response.ok) {
          throw new Error(`request failed: ${response.status}`);
        }

        const payload = await response.json();
        const normalized = normalizeDashboardPayload(payload);

        if (!aborted) {
          setStats(normalized.stats);
          setTopSeries(normalized.topSeries);
          setRecentUpdates(normalized.recentUpdates);
          setActivities(normalized.activities);
        }
      } catch (error) {
        console.error("获取 dashboard 数据失败:", error);

        if (!aborted) {
          setStats(DEFAULT_STATS);
          setTopSeries(DEFAULT_TOP_SERIES);
          setRecentUpdates(DEFAULT_RECENT_UPDATES);
          setActivities(DEFAULT_ACTIVITIES);
        }
      } finally {
        if (!aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      aborted = true;
    };
  }, [queryString]);

  return (
    <div className="space-y-6">
      <div className="rounded-[20px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold text-neutral-100">
              <TrendingUp size={24} className="text-emerald-400" />
              后台数据看板
            </h2>
            <p className="text-sm text-neutral-400">实时监控内容运营、订单和用户增长表现</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: "all", label: "全部" },
              { value: "7days", label: "最近7天" },
              { value: "30days", label: "最近30天" },
              { value: "custom", label: "自定义" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`rounded-[12px] px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  dateRange === option.value
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {dateRange === "custom" && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400">从</label>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="rounded-[10px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 transition-colors duration-300 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400">到</label>
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="rounded-[10px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 transition-colors duration-300 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 p-6 backdrop-blur-xl"
            >
              <div className="mb-4 h-12 w-12 rounded-[14px] bg-neutral-800" />
              <div className="mb-2 h-4 w-20 rounded bg-neutral-800" />
              <div className="h-8 w-32 rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Users}
              label="总用户数"
              value={stats.users.total}
              change={stats.users.change}
              trend={stats.users.trend}
              color="from-purple-500 to-purple-600"
            />
            <StatCard
              icon={BookOpen}
              label="作品数量"
              value={stats.series.total}
              change={stats.series.change}
              trend={stats.series.trend}
              color="from-blue-500 to-blue-600"
            />
            <StatCard
              icon={Receipt}
              label="订单数量"
              value={stats.orders.total}
              change={stats.orders.change}
              trend={stats.orders.trend}
              color="from-orange-500 to-orange-600"
            />
            <StatCard
              icon={DollarSign}
              label="总收入"
              value={stats.revenue.total}
              change={stats.revenue.change}
              trend={stats.revenue.trend}
              color="from-emerald-500 to-emerald-600"
            />
            <StatCard
              icon={Eye}
              label="总浏览量"
              value={stats.views.total}
              change={stats.views.change}
              trend={stats.views.trend}
              color="from-cyan-500 to-cyan-600"
            />
            <StatCard
              icon={MessageSquare}
              label="评论数量"
              value={stats.comments.total}
              change={stats.comments.change}
              trend={stats.comments.trend}
              color="from-pink-500 to-pink-600"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatCard
              icon={FileText}
              label="漫画作品"
              value={stats.seriesByType.comic.total}
              change={stats.seriesByType.comic.change}
              trend={stats.seriesByType.comic.trend}
              color="from-blue-500 to-blue-600"
            />
            <StatCard
              icon={BookOpen}
              label="小说作品"
              value={stats.seriesByType.novel.total}
              change={stats.seriesByType.novel.change}
              trend={stats.seriesByType.novel.trend}
              color="from-purple-500 to-purple-600"
            />
            <StatCard
              icon={Layers}
              label="总章节数"
              value={stats.episodes.total}
              change={stats.episodes.change}
              trend={stats.episodes.trend}
              color="from-emerald-500 to-emerald-600"
            />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold text-neutral-100">快捷操作</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <QuickAction icon={BookOpen} label="添加作品" href="/admin/series" color="from-blue-500 to-blue-600" />
              <QuickAction icon={Megaphone} label="创建活动" href="/admin/promotions" color="from-orange-500 to-orange-600" />
              <QuickAction icon={Users} label="用户管理" href="/admin/users" color="from-purple-500 to-purple-600" />
              <QuickAction icon={Receipt} label="订单管理" href="/admin/orders" color="from-emerald-500 to-emerald-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2">
                <Award size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-neutral-100">热门作品（浏览量）</h3>
              </div>
              <div className="space-y-2">
                {topSeries.byViews.length > 0 ? (
                  topSeries.byViews.map((series, index) => (
                    <TopSeriesItem key={series.id} series={series} rank={index + 1} metric="views" />
                  ))
                ) : (
                  <EmptyBlock text="暂无热门作品数据" />
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-neutral-100">热门作品（收入）</h3>
              </div>
              <div className="space-y-2">
                {topSeries.byRevenue.length > 0 ? (
                  topSeries.byRevenue.map((series, index) => (
                    <TopSeriesItem key={series.id} series={series} rank={index + 1} metric="revenue" />
                  ))
                ) : (
                  <EmptyBlock text="暂无热门收入数据" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2">
                <Clock size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-neutral-100">最近更新</h3>
              </div>
              <div className="space-y-2">
                {recentUpdates.length > 0 ? (
                  recentUpdates.map((series) => <RecentUpdateItem key={series.id} series={series} />)
                ) : (
                  <EmptyBlock text="暂无更新数据" />
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-100">最近活动</h3>
                <a href="/admin/tracking" className="text-sm text-emerald-400 transition-colors duration-300 hover:text-emerald-300">
                  查看全部 →
                </a>
              </div>
              <div className="space-y-2">
                {activities.length > 0 ? (
                  activities.map((activity) => <ActivityItem key={activity.id} activity={activity} />)
                ) : (
                  <EmptyBlock text="暂无活动记录" />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
