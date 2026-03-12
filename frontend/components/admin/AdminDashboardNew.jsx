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
  Download,
  RefreshCw,
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
  { id: 1, type: "order", user: "User A", action: "purchased Midnight Contract", time: "5 minutes ago" },
  { id: 2, type: "comment", user: "User B", action: "commented on Crimson Promise", time: "10 minutes ago" },
  { id: 3, type: "user", user: "User C", action: "created a new account", time: "15 minutes ago" },
  { id: 4, type: "order", user: "User D", action: "purchased a points package", time: "20 minutes ago" },
  { id: 5, type: "series", user: "Admin", action: "published a new series", time: "30 minutes ago" },
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
    return "Just now";
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
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
    <div className="group relative overflow-hidden rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 backdrop-blur-2xl transition-all duration-300 hover:scale-[1.03] hover:border-ios-green/30 hover:shadow-ios hover:shadow-ios-glow animate-scale-in">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 transition-opacity duration-300 group-hover:opacity-15`} />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className={`flex h-14 w-14 items-center justify-center rounded-4xl bg-gradient-to-br ${color} shadow-ios transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
            <Icon size={26} className="text-white" />
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-bold ${isPositive ? "text-ios-green" : "text-ios-red"}`}>
            <TrendIcon size={18} className="animate-bounce-subtle" />
            <span>{Math.abs(safeChange)}%</span>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm text-ios-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-neutral-100 tabular-nums">{safeValue.toLocaleString("en-US")}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, color }) {
  return (
    <a
      href={href}
      className="group flex flex-col items-center gap-3 rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 backdrop-blur-2xl transition-all duration-300 hover:scale-110 hover:border-ios-green/30 hover:shadow-ios hover:shadow-ios-glow active:scale-95 animate-scale-in"
    >
      <div className={`flex h-16 w-16 items-center justify-center rounded-4xl bg-gradient-to-br ${color} shadow-ios transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12`}>
        <Icon size={30} className="text-white" />
      </div>
      <span className="text-sm font-bold text-neutral-200 transition-colors duration-300 group-hover:text-ios-green">
        {label}
      </span>
    </a>
  );
}

function ActivityItem({ activity }) {
  const iconByType = {
    order: <Receipt size={18} className="text-ios-green" />,
    comment: <MessageSquare size={18} className="text-ios-blue" />,
    user: <Users size={18} className="text-ios-purple" />,
    series: <BookOpen size={18} className="text-ios-orange" />,
  };

  return (
    <div className="group flex items-start gap-3 rounded-4xl p-3 transition-all duration-300 hover:bg-ios-green/5 hover:scale-[1.02] active:scale-95">
      <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-neutral-800/50 transition-all duration-300 group-hover:bg-ios-green/10 group-hover:scale-110 group-hover:rotate-6 shadow-ios-sm">
        {iconByType[activity.type] || <Bell size={18} className="text-ios-gray-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-neutral-200">
          <span className="font-bold text-ios-green">{activity.user}</span>
          {" "}
          <span className="text-ios-gray-400">{activity.action}</span>
        </p>
        <p className="mt-0.5 text-xs text-ios-gray-500">{activity.time}</p>
      </div>
    </div>
  );
}

function TopSeriesItem({ series, rank, metric }) {
  const rankColor =
    rank === 1
      ? "from-ios-yellow to-yellow-600"
      : rank === 2
        ? "from-gray-400 to-gray-500"
        : rank === 3
          ? "from-ios-orange to-orange-700"
          : "from-neutral-700 to-neutral-800";

  return (
    <div className="group flex items-center gap-3 rounded-4xl p-3 transition-all duration-300 hover:bg-ios-green/5 hover:scale-[1.02] active:scale-95">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${rankColor} shadow-ios transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
        <span className="text-sm font-bold text-white">{rank}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="truncate text-sm font-bold text-neutral-200">{series.title}</p>
          <span className={`flex-shrink-0 rounded-2xl bg-neutral-800/50 px-2.5 py-1 text-xs font-medium ${series.type === "comic" ? "text-ios-blue" : "text-ios-purple"}`}>
            {series.type === "comic" ? "Comic" : "Novel"}
          </span>
        </div>
        <p className="text-xs text-ios-gray-400 font-medium">
          {metric === "views"
            ? `${toNumber(series.views).toLocaleString("en-US")} views`
            : `$${toNumber(series.revenue).toLocaleString("en-US")} revenue`}
        </p>
      </div>
    </div>
  );
}

function RecentUpdateItem({ series }) {
  return (
    <div className="group flex items-center gap-3 rounded-4xl p-3 transition-all duration-300 hover:bg-ios-green/5 hover:scale-[1.02] active:scale-95">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-3xl bg-ios-green/10 transition-all duration-300 group-hover:bg-ios-green/20 group-hover:scale-110 group-hover:rotate-6 shadow-ios-sm">
        <Clock size={18} className="text-ios-green" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="truncate text-sm font-bold text-neutral-200">{series.title}</p>
          <span className={`flex-shrink-0 rounded-2xl bg-neutral-800/50 px-2.5 py-1 text-xs font-medium ${series.type === "comic" ? "text-ios-blue" : "text-ios-purple"}`}>
            {series.type === "comic" ? "Comic" : "Novel"}
          </span>
        </div>
        <p className="text-xs text-ios-gray-400 font-medium">
          {toNumber(series.episodeCount)} episodes | {getRelativeTime(series.updatedAt)}
        </p>
      </div>
    </div>
  );
}

function EmptyBlock({ text }) {
  return (
    <div className="rounded-4xl border border-dashed border-ios-gray-700 bg-ios-gray-900/30 p-6 text-center text-sm text-ios-gray-500 font-medium animate-fade-in">
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
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        console.error("Failed to load dashboard data:", error);

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

  // Refresh dashboard data on demand.
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
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

      setStats(normalized.stats);
      setTopSeries(normalized.topSeries);
      setRecentUpdates(normalized.recentUpdates);
      setActivities(normalized.activities);
    } catch (error) {
      console.error("Failed to refresh dashboard data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export the current metric snapshot as CSV.
  const handleExportData = () => {
    const csvData = [
      ["Metric", "Value", "Change", "Trend"],
      ["Total users", stats.users.total, `${stats.users.change}%`, stats.users.trend],
      ["Series", stats.series.total, `${stats.series.change}%`, stats.series.trend],
      ["Orders", stats.orders.total, `${stats.orders.change}%`, stats.orders.trend],
      ["Revenue", stats.revenue.total, `${stats.revenue.change}%`, stats.revenue.trend],
      ["Views", stats.views.total, `${stats.views.change}%`, stats.views.trend],
      ["Comments", stats.comments.total, `${stats.comments.change}%`, stats.comments.trend],
      ["Comic series", stats.seriesByType.comic.total, `${stats.seriesByType.comic.change}%`, stats.seriesByType.comic.trend],
      ["Novel series", stats.seriesByType.novel.total, `${stats.seriesByType.novel.change}%`, stats.seriesByType.novel.trend],
      ["Episodes", stats.episodes.total, `${stats.episodes.change}%`, stats.episodes.trend],
    ];

    const csv = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard-data-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-5xl border border-ios-gray-800 bg-gradient-to-br from-ios-green/10 to-emerald-600/5 p-6 backdrop-blur-2xl shadow-ios">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold text-neutral-100">
              <TrendingUp size={26} className="text-ios-green" />
              Operations dashboard
            </h2>
            <p className="text-sm text-ios-gray-400 font-medium">Monitor content performance, orders, and audience growth in real time.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-4xl border border-ios-green/20 bg-ios-green/5 px-4 py-2.5 text-xs text-ios-green font-bold transition-all duration-300 hover:bg-ios-green/10 hover:border-ios-green/30 hover:scale-105 hover:shadow-ios-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            {/* Export button */}
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 rounded-4xl border border-ios-blue/20 bg-ios-blue/5 px-4 py-2.5 text-xs text-ios-blue font-bold transition-all duration-300 hover:bg-ios-blue/10 hover:border-ios-blue/30 hover:scale-105 hover:shadow-ios-sm active:scale-95"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>

            {[
              { value: "all", label: "All" },
              { value: "7days", label: "Last 7 days" },
              { value: "30days", label: "Last 30 days" },
              { value: "custom", label: "Custom" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`rounded-4xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  dateRange === option.value
                    ? "bg-ios-green text-white shadow-ios shadow-ios-glow scale-105"
                    : "bg-neutral-800/50 text-ios-gray-300 hover:bg-neutral-800 hover:text-ios-green hover:scale-105 active:scale-95"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {dateRange === "custom" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 animate-slide-in-right">
            <div className="flex items-center gap-2">
              <label className="text-sm text-ios-gray-400 font-medium">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="rounded-3xl border border-ios-green/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 transition-all duration-300 focus:border-ios-green/50 focus:outline-none focus:ring-2 focus:ring-ios-green/20 shadow-ios-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-ios-gray-400 font-medium">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="rounded-3xl border border-ios-green/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 transition-all duration-300 focus:border-ios-green/50 focus:outline-none focus:ring-2 focus:ring-ios-green/20 shadow-ios-sm"
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
              className="h-36 animate-pulse rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 backdrop-blur-2xl shadow-ios"
            >
              <div className="mb-4 h-14 w-14 rounded-4xl bg-neutral-800 animate-shimmer" />
              <div className="mb-2 h-4 w-24 rounded-2xl bg-neutral-800 animate-shimmer" />
              <div className="h-8 w-36 rounded-2xl bg-neutral-800 animate-shimmer" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Users}
              label="Total users"
              value={stats.users.total}
              change={stats.users.change}
              trend={stats.users.trend}
              color="from-purple-500 to-purple-600"
            />
            <StatCard
              icon={BookOpen}
              label="Series"
              value={stats.series.total}
              change={stats.series.change}
              trend={stats.series.trend}
              color="from-blue-500 to-blue-600"
            />
            <StatCard
              icon={Receipt}
              label="Orders"
              value={stats.orders.total}
              change={stats.orders.change}
              trend={stats.orders.trend}
              color="from-orange-500 to-orange-600"
            />
            <StatCard
              icon={DollarSign}
              label="Revenue"
              value={stats.revenue.total}
              change={stats.revenue.change}
              trend={stats.revenue.trend}
              color="from-emerald-500 to-emerald-600"
            />
            <StatCard
              icon={Eye}
              label="Views"
              value={stats.views.total}
              change={stats.views.change}
              trend={stats.views.trend}
              color="from-cyan-500 to-cyan-600"
            />
            <StatCard
              icon={MessageSquare}
              label="Comments"
              value={stats.comments.total}
              change={stats.comments.change}
              trend={stats.comments.trend}
              color="from-pink-500 to-pink-600"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatCard
              icon={FileText}
              label="Comic series"
              value={stats.seriesByType.comic.total}
              change={stats.seriesByType.comic.change}
              trend={stats.seriesByType.comic.trend}
              color="from-blue-500 to-blue-600"
            />
            <StatCard
              icon={BookOpen}
              label="Novel series"
              value={stats.seriesByType.novel.total}
              change={stats.seriesByType.novel.change}
              trend={stats.seriesByType.novel.trend}
              color="from-purple-500 to-purple-600"
            />
            <StatCard
              icon={Layers}
              label="Episodes"
              value={stats.episodes.total}
              change={stats.episodes.change}
              trend={stats.episodes.trend}
              color="from-emerald-500 to-emerald-600"
            />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold text-neutral-100">Quick actions</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <QuickAction icon={BookOpen} label="Add series" href="/admin/series" color="from-blue-500 to-blue-600" />
              <QuickAction icon={Megaphone} label="Create campaign" href="/admin/promotions" color="from-orange-500 to-orange-600" />
              <QuickAction icon={Users} label="Manage users" href="/admin/users" color="from-purple-500 to-purple-600" />
              <QuickAction icon={Receipt} label="Manage orders" href="/admin/orders" color="from-emerald-500 to-emerald-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 backdrop-blur-2xl shadow-ios animate-scale-in">
              <div className="mb-4 flex items-center gap-2">
                <Award size={22} className="text-ios-green" />
                <h3 className="text-lg font-bold text-neutral-100">Top series by views</h3>
              </div>
              <div className="space-y-2">
                {topSeries.byViews.length > 0 ? (
                  topSeries.byViews.map((series, index) => (
                    <TopSeriesItem key={series.id} series={series} rank={index + 1} metric="views" />
                  ))
                ) : (
                  <EmptyBlock text="No top-view series yet." />
                )}
              </div>
            </div>

            <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 backdrop-blur-2xl shadow-ios animate-scale-in">
              <div className="mb-4 flex items-center gap-2">
                <DollarSign size={22} className="text-ios-green" />
                <h3 className="text-lg font-bold text-neutral-100">Top series by revenue</h3>
              </div>
              <div className="space-y-2">
                {topSeries.byRevenue.length > 0 ? (
                  topSeries.byRevenue.map((series, index) => (
                    <TopSeriesItem key={series.id} series={series} rank={index + 1} metric="revenue" />
                  ))
                ) : (
                  <EmptyBlock text="No revenue leaderboard yet." />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 backdrop-blur-2xl shadow-ios animate-scale-in">
              <div className="mb-4 flex items-center gap-2">
                <Clock size={22} className="text-ios-green" />
                <h3 className="text-lg font-bold text-neutral-100">Recent updates</h3>
              </div>
              <div className="space-y-2">
                {recentUpdates.length > 0 ? (
                  recentUpdates.map((series) => <RecentUpdateItem key={series.id} series={series} />)
                ) : (
                  <EmptyBlock text="No recent updates." />
                )}
              </div>
            </div>

            <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/50 p-6 backdrop-blur-2xl shadow-ios animate-scale-in">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-100">Recent activity</h3>
                <a href="/admin/tracking" className="text-sm text-ios-green font-medium transition-all duration-300 hover:text-emerald-300 hover:scale-105">
                  View all &gt;
                </a>
              </div>
              <div className="space-y-2">
                {activities.length > 0 ? (
                  activities.map((activity) => <ActivityItem key={activity.id} activity={activity} />)
                ) : (
                  <EmptyBlock text="No activity yet." />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



