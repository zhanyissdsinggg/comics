"use client";

import { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  Receipt,
  TrendingUp,
  DollarSign,
  Eye,
  MessageSquare,
  Bell,
  ArrowUp,
  ArrowDown,
  Megaphone,
  FileText,
  Layers,
  Award,
  Clock,
} from "lucide-react";

/**
 * 老王重新设计：Dashboard数据看板
 * 特点：
 * - 关键指标卡片
 * - 快捷操作
 * - 最近活动
 * - emerald绿色主题
 */

// 老王注释：模拟数据（实际应该从API获取）
const MOCK_STATS = {
  users: { total: 12543, change: 12.5, trend: "up" },
  series: { total: 856, change: 3.2, trend: "up" },
  orders: { total: 3421, change: -2.1, trend: "down" },
  revenue: { total: 45678, change: 18.3, trend: "up" },
  views: { total: 234567, change: 8.7, trend: "up" },
  comments: { total: 1234, change: 5.4, trend: "up" },
  // 老王添加：作品类型分布
  seriesByType: {
    comic: { total: 520, change: 5.2, trend: "up" },
    novel: { total: 336, change: 1.8, trend: "up" },
  },
  // 老王添加：章节统计
  episodes: { total: 12456, change: 15.3, trend: "up" },
};

// 老王添加：热门作品排行数据
const MOCK_TOP_SERIES = {
  byViews: [
    { id: 1, title: "Midnight Contract", type: "comic", views: 45678, cover: "/placeholder-cover.svg" },
    { id: 2, title: "Crimson Promise", type: "novel", views: 38921, cover: "/placeholder-cover.svg" },
    { id: 3, title: "Shadow Realm", type: "comic", views: 32145, cover: "/placeholder-cover.svg" },
    { id: 4, title: "Eternal Bond", type: "novel", views: 28934, cover: "/placeholder-cover.svg" },
    { id: 5, title: "Dark Fantasy", type: "comic", views: 25678, cover: "/placeholder-cover.svg" },
  ],
  byRevenue: [
    { id: 1, title: "Midnight Contract", type: "comic", revenue: 8934, cover: "/placeholder-cover.svg" },
    { id: 2, title: "Shadow Realm", type: "comic", revenue: 7821, cover: "/placeholder-cover.svg" },
    { id: 3, title: "Crimson Promise", type: "novel", revenue: 6543, cover: "/placeholder-cover.svg" },
    { id: 4, title: "Eternal Bond", type: "novel", revenue: 5432, cover: "/placeholder-cover.svg" },
    { id: 5, title: "Dark Fantasy", type: "comic", revenue: 4321, cover: "/placeholder-cover.svg" },
  ],
};

// 老王添加：最近更新的作品
const MOCK_RECENT_UPDATES = [
  { id: 1, title: "Midnight Contract", type: "comic", updatedAt: "2024-01-15T10:30:00Z", episodeCount: 45, cover: "/placeholder-cover.svg" },
  { id: 2, title: "Crimson Promise", type: "novel", updatedAt: "2024-01-15T09:15:00Z", episodeCount: 32, cover: "/placeholder-cover.svg" },
  { id: 3, title: "Shadow Realm", type: "comic", updatedAt: "2024-01-14T18:45:00Z", episodeCount: 28, cover: "/placeholder-cover.svg" },
  { id: 4, title: "Eternal Bond", type: "novel", updatedAt: "2024-01-14T16:20:00Z", episodeCount: 41, cover: "/placeholder-cover.svg" },
  { id: 5, title: "Dark Fantasy", type: "comic", updatedAt: "2024-01-14T14:10:00Z", episodeCount: 36, cover: "/placeholder-cover.svg" },
];

const RECENT_ACTIVITIES = [
  { id: 1, type: "order", user: "用户A", action: "购买了《Midnight Contract》", time: "5分钟前" },
  { id: 2, type: "comment", user: "用户B", action: "评论了《Crimson Promise》", time: "10分钟前" },
  { id: 3, type: "user", user: "用户C", action: "注册了新账号", time: "15分钟前" },
  { id: 4, type: "order", user: "用户D", action: "购买了套餐", time: "20分钟前" },
  { id: 5, type: "series", user: "管理员", action: "发布了新作品", time: "30分钟前" },
];

function StatCard({ icon: Icon, label, value, change, trend, color }) {
  const isPositive = trend === "up";
  const TrendIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.02]">
      {/* 老王添加：背景渐变效果 */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br ${color} shadow-lg`}>
            <Icon size={24} className="text-white" />
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            <TrendIcon size={16} />
            <span>{Math.abs(change)}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-neutral-100">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, color }) {
  return (
    <a
      href={href}
      className={`group flex flex-col items-center gap-3 rounded-[16px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-105 active:scale-95`}
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br ${color} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
        <Icon size={28} className="text-white" />
      </div>
      <span className="text-sm font-medium text-neutral-200 group-hover:text-emerald-300 transition-colors duration-300">
        {label}
      </span>
    </a>
  );
}

function ActivityItem({ activity }) {
  const getIcon = () => {
    switch (activity.type) {
      case "order":
        return <Receipt size={16} className="text-emerald-400" />;
      case "comment":
        return <MessageSquare size={16} className="text-blue-400" />;
      case "user":
        return <Users size={16} className="text-purple-400" />;
      case "series":
        return <BookOpen size={16} className="text-orange-400" />;
      default:
        return <Bell size={16} className="text-neutral-400" />;
    }
  };

  return (
    <div className="group flex items-start gap-3 rounded-[14px] p-3 transition-all duration-300 hover:bg-emerald-500/5">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-neutral-800/50 group-hover:bg-emerald-500/10 transition-colors duration-300">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-200">
          <span className="font-medium text-emerald-300">{activity.user}</span>
          {" "}
          <span className="text-neutral-400">{activity.action}</span>
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">{activity.time}</p>
      </div>
    </div>
  );
}

// 老王添加：热门作品排行项组件
function TopSeriesItem({ series, rank, metric }) {
  const getRankColor = () => {
    if (rank === 1) return "from-yellow-500 to-yellow-600";
    if (rank === 2) return "from-gray-400 to-gray-500";
    if (rank === 3) return "from-orange-600 to-orange-700";
    return "from-neutral-700 to-neutral-800";
  };

  const getTypeLabel = () => {
    return series.type === "comic" ? "漫画" : "小说";
  };

  const getTypeColor = () => {
    return series.type === "comic" ? "text-blue-400" : "text-purple-400";
  };

  return (
    <div className="group flex items-center gap-3 rounded-[14px] p-3 transition-all duration-300 hover:bg-emerald-500/5">
      {/* 老王添加：排名徽章 */}
      <div className={`flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br ${getRankColor()} shadow-lg flex-shrink-0`}>
        <span className="text-sm font-bold text-white">{rank}</span>
      </div>

      {/* 老王添加：作品信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-neutral-200 truncate">{series.title}</p>
          <span className={`text-xs px-2 py-0.5 rounded-[6px] bg-neutral-800/50 ${getTypeColor()} flex-shrink-0`}>
            {getTypeLabel()}
          </span>
        </div>
        <p className="text-xs text-neutral-400">
          {metric === "views" ? `${series.views.toLocaleString()} 次浏览` : `¥${series.revenue.toLocaleString()} 收入`}
        </p>
      </div>
    </div>
  );
}

// 老王添加：最近更新作品项组件
function RecentUpdateItem({ series }) {
  const getTypeLabel = () => {
    return series.type === "comic" ? "漫画" : "小说";
  };

  const getTypeColor = () => {
    return series.type === "comic" ? "text-blue-400" : "text-purple-400";
  };

  const getTimeAgo = () => {
    const now = new Date();
    const updated = new Date(series.updatedAt);
    const diffMs = now - updated;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    return `${diffDays}天前`;
  };

  return (
    <div className="group flex items-center gap-3 rounded-[14px] p-3 transition-all duration-300 hover:bg-emerald-500/5">
      {/* 老王添加：时钟图标 */}
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors duration-300 flex-shrink-0">
        <Clock size={16} className="text-emerald-400" />
      </div>

      {/* 老王添加：作品信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-neutral-200 truncate">{series.title}</p>
          <span className={`text-xs px-2 py-0.5 rounded-[6px] bg-neutral-800/50 ${getTypeColor()} flex-shrink-0`}>
            {getTypeLabel()}
          </span>
        </div>
        <p className="text-xs text-neutral-400">
          {series.episodeCount} 章节 · {getTimeAgo()}
        </p>
      </div>
    </div>
  );
}

export default function AdminDashboardNew() {
  const [stats, setStats] = useState(MOCK_STATS);
  const [activities, setActivities] = useState(RECENT_ACTIVITIES);
  const [isLoading, setIsLoading] = useState(true);

  // 老王添加：热门作品和最近更新状态
  const [topSeries, setTopSeries] = useState(MOCK_TOP_SERIES);
  const [recentUpdates, setRecentUpdates] = useState(MOCK_RECENT_UPDATES);

  // 老王添加：日期范围状态
  const [dateRange, setDateRange] = useState("all"); // all, 7days, 30days, custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // 老王修复：从API获取真实数据
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
        const token = localStorage.getItem("admin_token");

        // 老王添加：根据dateRange构建查询参数
        let queryParams = "";
        if (dateRange === "7days") {
          const to = new Date().toISOString().slice(0, 10);
          const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          queryParams = `?from=${from}&to=${to}`;
        } else if (dateRange === "30days") {
          const to = new Date().toISOString().slice(0, 10);
          const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          queryParams = `?from=${from}&to=${to}`;
        } else if (dateRange === "custom" && customFrom && customTo) {
          queryParams = `?from=${customFrom}&to=${customTo}`;
        }

        const response = await fetch(`${baseUrl}/api/admin/stats/dashboard${queryParams}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          console.error("获取dashboard数据失败:", response.status);
        }
      } catch (error) {
        console.error("获取dashboard数据出错:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [dateRange, customFrom, customTo]); // 老王注释：日期变化时重新获取数据

  return (
    <div className="space-y-6">
      {/* 老王添加：欢迎标题和日期筛选 */}
      <div className="rounded-[20px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-100 mb-2">
              欢迎回来，管理员 👋
            </h2>
            <p className="text-sm text-neutral-400">
              这是您的数据概览，实时监控平台运营状况
            </p>
          </div>

          {/* 老王添加：日期筛选器 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDateRange("all")}
              className={`px-4 py-2 rounded-[12px] text-sm font-medium transition-all duration-300 ${
                dateRange === "all"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setDateRange("7days")}
              className={`px-4 py-2 rounded-[12px] text-sm font-medium transition-all duration-300 ${
                dateRange === "7days"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
              }`}
            >
              最近7天
            </button>
            <button
              onClick={() => setDateRange("30days")}
              className={`px-4 py-2 rounded-[12px] text-sm font-medium transition-all duration-300 ${
                dateRange === "30days"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
              }`}
            >
              最近30天
            </button>
            <button
              onClick={() => setDateRange("custom")}
              className={`px-4 py-2 rounded-[12px] text-sm font-medium transition-all duration-300 ${
                dateRange === "custom"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
              }`}
            >
              自定义
            </button>
          </div>
        </div>

        {/* 老王添加：自定义日期范围输入 */}
        {dateRange === "custom" && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400">从</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 rounded-[10px] bg-neutral-800/50 border border-emerald-500/20 text-neutral-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors duration-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400">到</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 rounded-[10px] bg-neutral-800/50 border border-emerald-500/20 text-neutral-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors duration-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* 老王添加：Loading状态 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6 h-32 animate-pulse"
            >
              <div className="h-12 w-12 bg-neutral-800 rounded-[14px] mb-4" />
              <div className="h-4 w-20 bg-neutral-800 rounded mb-2" />
              <div className="h-8 w-32 bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* 老王重新设计：关键指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* 老王添加：作品类型分布和章节统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon={FileText}
              label="漫画作品"
              value={stats.seriesByType?.comic?.total || 0}
              change={stats.seriesByType?.comic?.change || 0}
              trend={stats.seriesByType?.comic?.trend || "up"}
              color="from-blue-500 to-blue-600"
            />
            <StatCard
              icon={BookOpen}
              label="小说作品"
              value={stats.seriesByType?.novel?.total || 0}
              change={stats.seriesByType?.novel?.change || 0}
              trend={stats.seriesByType?.novel?.trend || "up"}
              color="from-purple-500 to-purple-600"
            />
            <StatCard
              icon={Layers}
              label="总章节数"
              value={stats.episodes?.total || 0}
              change={stats.episodes?.change || 0}
              trend={stats.episodes?.trend || "up"}
              color="from-emerald-500 to-emerald-600"
            />
          </div>

          {/* 老王添加：快捷操作 */}
          <div>
            <h3 className="text-lg font-bold text-neutral-100 mb-4">快捷操作</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickAction
                icon={BookOpen}
                label="添加作品"
                href="/admin/series"
                color="from-blue-500 to-blue-600"
              />
              <QuickAction
                icon={Megaphone}
                label="创建活动"
                href="/admin/promotions"
                color="from-orange-500 to-orange-600"
              />
              <QuickAction
                icon={Users}
                label="用户管理"
                href="/admin/users"
                color="from-purple-500 to-purple-600"
              />
              <QuickAction
                icon={Receipt}
                label="订单管理"
                href="/admin/orders"
                color="from-emerald-500 to-emerald-600"
              />
            </div>
          </div>

          {/* 老王添加：热门作品排行和最近更新 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 老王添加：按浏览量排行 */}
            <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-neutral-100">热门作品（浏览量）</h3>
              </div>
              <div className="space-y-2">
                {topSeries.byViews.map((series, index) => (
                  <TopSeriesItem key={series.id} series={series} rank={index + 1} metric="views" />
                ))}
              </div>
            </div>

            {/* 老王添加：按收入排行 */}
            <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-neutral-100">热门作品（收入）</h3>
              </div>
              <div className="space-y-2">
                {topSeries.byRevenue.map((series, index) => (
                  <TopSeriesItem key={series.id} series={series} rank={index + 1} metric="revenue" />
                ))}
              </div>
            </div>
          </div>

          {/* 老王添加：最近更新和最近活动 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 老王添加：最近更新的作品 */}
            <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-neutral-100">最近更新</h3>
              </div>
              <div className="space-y-2">
                {recentUpdates.map((series) => (
                  <RecentUpdateItem key={series.id} series={series} />
                ))}
              </div>
            </div>

            {/* 老王添加：最近活动 */}
            <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-neutral-100">最近活动</h3>
                <a
                  href="/admin/tracking"
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors duration-300"
                >
                  查看全部 →
                </a>
              </div>
              <div className="space-y-2">
                {activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
