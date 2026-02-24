"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiGet } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

function formatDate(value) {
  if (!value) {
    return "";
  }
  return value;
}

function getDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function getDefaultRange() {
  const today = new Date();
  const from = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { from: getDateKey(from), to: getDateKey(today) };
}

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const isAuthorized = key === ADMIN_KEY;
  const defaults = useMemo(() => getDefaultRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [stats, setStats] = useState([]);
  const [summary, setSummary] = useState({
    totalViews: 0,
    totalRegistrations: 0,
    avgDau: 0,
    totalPaidOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [rankRange, setRankRange] = useState("day");
  const [rankType, setRankType] = useState("all");
  const [rankings, setRankings] = useState([]);
  const [rankLoading, setRankLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/stats?key=${key}&from=${from}&to=${to}`);
    if (response.ok) {
      setStats(response.data?.stats || []);
      setSummary(
        response.data?.summary || {
          totalViews: 0,
          totalRegistrations: 0,
          avgDau: 0,
          totalPaidOrders: 0,
        }
      );
    }
    setLoading(false);
  }, [from, key, to]);

  const loadRankings = useCallback(async () => {
    setRankLoading(true);
    const response = await apiGet(
      `/api/admin/rankings?key=${key}&range=${rankRange}&type=${rankType}&limit=10`
    );
    if (response.ok) {
      setRankings(response.data?.list || []);
    }
    setRankLoading(false);
  }, [key, rankRange, rankType]);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError("");
    const response = await apiGet(`/api/admin/metrics?key=${key}`);
    if (response.ok) {
      setMetrics(response.data);
    } else {
      setMetrics(null);
      setMetricsError(response.error || "Load metrics failed.");
    }
    setMetricsLoading(false);
  }, [key]);

  useEffect(() => {
    if (isAuthorized) {
      loadStats();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadStats]);

  useEffect(() => {
    if (isAuthorized) {
      loadRankings();
    } else {
      setRankLoading(false);
    }
  }, [isAuthorized, loadRankings]);

  useEffect(() => {
    if (isAuthorized) {
      loadMetrics();
    } else {
      setMetricsLoading(false);
    }
  }, [isAuthorized, loadMetrics]);

  const latest = stats.length > 0 ? stats[stats.length - 1] : null;
  const reversed = useMemo(() => [...stats].reverse(), [stats]);
  const maxPaidOrders = useMemo(() => {
    if (stats.length === 0) {
      return 1;
    }
    return Math.max(1, ...stats.map((entry) => entry.paidOrders || 0));
  }, [stats]);

  if (!isAuthorized) {
    return (
      <AdminShell title="403 Forbidden" subtitle="无效的管理员密钥">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">403 Forbidden</h2>
            <p className="mt-2 text-sm text-slate-500">Invalid admin key.</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="数据概览" subtitle="关键指标按天汇总">
      <div className="space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">今日实时状态</h2>
              <p className="text-sm text-slate-500">支付与活跃概况（按今日统计）</p>
            </div>
            <button
              type="button"
              onClick={loadMetrics}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              刷新
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">今日成功订单</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {metricsLoading ? "--" : metrics?.paidOrders ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">今日失败订单</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {metricsLoading ? "--" : metrics?.failedOrders ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">今日待支付订单</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {metricsLoading ? "--" : metrics?.pendingOrders ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">支付重试队列</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {metricsLoading ? "--" : metrics?.retryPending ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">今日 DAU</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {metricsLoading ? "--" : metrics?.dau ?? 0}
              </p>
            </div>
          </div>
          {metricsError ? <p className="mt-4 text-sm text-rose-500">{metricsError}</p> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">核心指标</h2>
              <p className="text-sm text-slate-500">
                最近区间 {formatDate(from)} ~ {formatDate(to)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-col text-xs text-slate-500">
                开始日期
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
              </div>
              <div className="flex flex-col text-xs text-slate-500">
                结束日期
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={loadStats}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                刷新
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">今日漫画观看次数</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {latest ? latest.views : 0}
              </p>
              <p className="text-xs text-slate-400">区间总计 {summary.totalViews}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">今日注册人数</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {latest ? latest.registrations : 0}
              </p>
              <p className="text-xs text-slate-400">
                区间总计 {summary.totalRegistrations}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">平均 DAU</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.avgDau}</p>
              <p className="text-xs text-slate-400">今日 DAU {latest ? latest.dau : 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">今日付费成功订单</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {latest ? latest.paidOrders : 0}
              </p>
              <p className="text-xs text-slate-400">
                区间总计 {summary.totalPaidOrders}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">阅读排行 Top 10</h3>
              <p className="text-sm text-slate-500">按漫画/小说阅读次数统计</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {['day', 'week', 'month'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRankRange(item)}
                  className={`rounded-full px-3 py-1 ${
                    rankRange === item
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 text-slate-600'
                  }`}
                >
                  {item === 'day' ? '日榜' : item === 'week' ? '周榜' : '月榜'}
                </button>
              ))}
              {['all', 'comic', 'novel'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRankType(item)}
                  className={`rounded-full px-3 py-1 ${
                    rankType === item
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 text-slate-600'
                  }`}
                >
                  {item === 'all' ? '全部' : item === 'comic' ? '漫画' : '小说'}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-16">排名</th>
                  <th className="px-4 py-3">作品</th>
                  <th className="px-4 py-3 w-24">类型</th>
                  <th className="px-4 py-3 w-32">阅读次数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankings.map((item, index) => (
                  <tr key={item.seriesId}>
                    <td className="px-4 py-3 text-slate-600">#{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-400">{item.seriesId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        {item.type === 'novel' ? '小说' : '漫画'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.views}</td>
                  </tr>
                ))}
                {rankings.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={4}>
                      {rankLoading ? '加载中...' : '暂无数据'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">按天明细</h3>
            {loading ? <span className="text-xs text-slate-400">加载中...</span> : null}
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">日期</th>
                  <th className="px-4 py-3">漫画观看次数</th>
                  <th className="px-4 py-3">注册人数</th>
                  <th className="px-4 py-3">DAU</th>
                  <th className="px-4 py-3">付费成功订单</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reversed.map((item) => (
                  <tr key={item.date}>
                    <td className="px-4 py-3 text-slate-600">{item.date}</td>
                    <td className="px-4 py-3">{item.views}</td>
                    <td className="px-4 py-3">{item.registrations}</td>
                    <td className="px-4 py-3">{item.dau}</td>
                    <td className="px-4 py-3">{item.paidOrders || 0}</td>
                  </tr>
                ))}
                {reversed.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={5}>
                      暂无数据
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">付费订单走势</h3>
            <p className="text-xs text-slate-500">按日统计</p>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-end gap-3">
              {stats.map((item) => {
                const height = Math.max(
                  8,
                  Math.round(((item.paidOrders || 0) / maxPaidOrders) * 80)
                );
                return (
                  <div key={item.date} className="flex flex-col items-center gap-2">
                    <div
                      className="w-6 rounded-full bg-slate-900"
                      style={{ height: `${height}px` }}
                      title={`${item.date} ${item.paidOrders || 0}`}
                    />
                    <span className="text-[10px] text-slate-400">{item.date.slice(5)}</span>
                  </div>
                );
              })}
              {stats.length === 0 ? (
                <div className="py-6 text-sm text-slate-400">暂无数据</div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold">口径说明</h3>
          <div className="mt-3 grid gap-4 text-sm text-slate-600 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">漫画观看次数</p>
              <p className="mt-2">
                读取漫画章节内容接口时计 1 次（/api/episode?seriesId&episodeId 且作品类型为漫画）。
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">注册人数</p>
              <p className="mt-2">成功注册账户时计 1 次（/api/auth/register）。</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">DAU</p>
              <p className="mt-2">当天有登录或阅读行为的去重登录用户数（不含游客）。</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">付费成功订单</p>
              <p className="mt-2">支付或充值成功并入账的钱包订单数。</p>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
