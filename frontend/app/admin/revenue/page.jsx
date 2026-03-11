'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminDataState } from '@/components/admin/common/AdminDataState';

const LEGACY_REVENUE_CACHE_TTL_MS = 60_000;
const legacyRevenueCache = new Map();

function getAdminAuthHeaders() {
  return {
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''}`,
  };
}

async function fetchAdminJson(path) {
  try {
    const response = await fetch(path, {
      headers: getAdminAuthHeaders(),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: {},
    };
  }
}

function extractList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeOrderStatus(status) {
  return String(status || '').toUpperCase();
}

function isPaidOrder(status) {
  const normalized = normalizeOrderStatus(status);
  return normalized === 'PAID' || normalized === 'COMPLETED';
}

function isRefundedOrder(status) {
  return normalizeOrderStatus(status) === 'REFUNDED';
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPercentage(value) {
  return value === null || value === undefined ? 'N/A' : `${value}%`;
}

function dateKeyFromIso(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

async function getLegacyRevenueFallback(dateRange) {
  const cacheKey = `${dateRange.startDate || ''}:${dateRange.endDate || ''}`;
  const now = Date.now();
  const cached = legacyRevenueCache.get(cacheKey);
  if (cached && now - cached.ts < LEGACY_REVENUE_CACHE_TTL_MS) {
    return cached.value;
  }

  const dateParams = new URLSearchParams({
    from: dateRange.startDate || '',
    to: dateRange.endDate || '',
  });

  const [dashboardRes, dailyStatsRes, promotionsRes, ordersRes] = await Promise.all([
    fetchAdminJson(`/api/admin/stats/dashboard?${dateParams}`),
    fetchAdminJson(`/api/admin/stats?${dateParams}`),
    fetchAdminJson('/api/admin/promotions?page=1&pageSize=100'),
    fetchAdminJson('/api/admin/orders?page=1&pageSize=100'),
  ]);

  const dashboard = dashboardRes?.data || {};
  const dailyStats = extractList(dailyStatsRes?.data, ['stats']);
  const promotions = extractList(promotionsRes?.data, ['promotions', 'data']);
  const orders = extractList(ordersRes?.data, ['orders', 'data']);

  let paidRevenue = 0;
  let refundedRevenue = 0;
  let paidCount = 0;
  const orderStatus = {
    pending: 0,
    paid: 0,
    failed: 0,
    refunded: 0,
  };

  const channelMap = new Map();
  const userSpendMap = new Map();
  const trendMap = new Map();

  for (const order of orders) {
    const amount = toNumber(order?.amount);
    const status = normalizeOrderStatus(order?.status);

    if (status === 'PENDING') orderStatus.pending += 1;
    else if (status === 'REFUNDED') orderStatus.refunded += 1;
    else if (status === 'FAILED' || status === 'CHARGEBACK') orderStatus.failed += 1;
    else if (isPaidOrder(status)) orderStatus.paid += 1;

    if (isPaidOrder(status)) {
      paidRevenue += amount;
      paidCount += 1;
      const userId = String(order?.userId || '');
      if (userId) {
        userSpendMap.set(userId, (userSpendMap.get(userId) || 0) + amount);
      }
    }
    if (isRefundedOrder(status)) {
      refundedRevenue += amount;
    }

    const provider = String(
      order?.provider ||
      order?.paymentChannel ||
      order?.channel ||
      order?.paymentMethod ||
      'unknown'
    ).toLowerCase();
    const channelStats = channelMap.get(provider) || { orders: 0, revenue: 0 };
    channelStats.orders += 1;
    if (isPaidOrder(status)) {
      channelStats.revenue += amount;
    }
    channelMap.set(provider, channelStats);

    const dateKey = dateKeyFromIso(order?.createdAt);
    if (dateKey) {
      const current = trendMap.get(dateKey) || { revenue: 0, orders: 0 };
      current.orders += 1;
      if (isPaidOrder(status)) {
        current.revenue += amount;
      }
      trendMap.set(dateKey, current);
    }
  }

  const channels = Array.from(channelMap.entries())
    .map(([channel, value]) => ({
      channel,
      orders: value.orders,
      revenue: Number(value.revenue.toFixed(2)),
      avgOrderValue: Number((value.orders ? value.revenue / value.orders : 0).toFixed(2)),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  let highValue = 0;
  let mediumValue = 0;
  let lowValue = 0;
  for (const spend of userSpendMap.values()) {
    if (spend >= 100) highValue += 1;
    else if (spend >= 20) mediumValue += 1;
    else if (spend > 0) lowValue += 1;
  }

  const trendFromDailyStats = dailyStats
    .map((item) => ({
      date: item?.date || '',
      revenue: 0,
      orders: toNumber(item?.paidOrders),
    }))
    .filter((item) => item.date);

  const trendFromOrders = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      revenue: Number(value.revenue.toFixed(2)),
      orders: value.orders,
    }));

  const totalOrders = toNumber(dashboard?.orders?.total) || orders.length;
  const totalRevenue = toNumber(dashboard?.revenue?.total) || paidRevenue;
  const totalRefunded = refundedRevenue;

  const value = {
    stats: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      avgOrderValue: Number((paidCount ? totalRevenue / paidCount : 0).toFixed(2)),
      totalRefunded: Number(totalRefunded.toFixed(2)),
      netRevenue: Number((totalRevenue - totalRefunded).toFixed(2)),
    },
    trend: trendFromDailyStats.length > 0 ? trendFromDailyStats : trendFromOrders,
    channels,
    promotions: promotions.map((item) => ({
      promotionId: item?.id || item?.promotionId || '',
      title: item?.title || 'Untitled promotion',
      orders: toNumber(item?.orders),
      revenue: Number(toNumber(item?.revenue).toFixed(2)),
      roi: toOptionalNumber(item?.roi),
      active: Boolean(item?.active),
    })),
    attributionModel: 'unavailable',
    roiAvailable: false,
    distribution: {
      highValue,
      mediumValue,
      lowValue,
      noValue: 0,
    },
    orderStatus,
  };

  legacyRevenueCache.set(cacheKey, { ts: now, value });
  return value;
}

const STAT_CARD_STYLES = {
  blue: {
    container: 'bg-blue-900/20 border-blue-700',
    value: 'text-blue-400',
  },
  emerald: {
    container: 'bg-emerald-900/20 border-emerald-700',
    value: 'text-emerald-400',
  },
  purple: {
    container: 'bg-purple-900/20 border-purple-700',
    value: 'text-purple-400',
  },
  red: {
    container: 'bg-red-900/20 border-red-700',
    value: 'text-red-400',
  },
  green: {
    container: 'bg-green-900/20 border-green-700',
    value: 'text-green-400',
  },
  yellow: {
    container: 'bg-yellow-900/20 border-yellow-700',
    value: 'text-yellow-400',
  },
  orange: {
    container: 'bg-orange-900/20 border-orange-700',
    value: 'text-orange-400',
  },
  gray: {
    container: 'bg-gray-900/20 border-gray-700',
    value: 'text-gray-400',
  },
};

export default function AdminRevenuePageNew() {
  const [viewMode, setViewMode] = useState('overview'); // overview, trend, channels, promotions
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // 获取收入统计数据
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const result = await fetchAdminJson(`/api/admin/revenue/stats?${params}`);
      if (result.ok) {
        return result.data;
      }
      if (result.status === 404) {
        const fallback = await getLegacyRevenueFallback(dateRange);
        return { stats: fallback.stats };
      }
      return result.data || { stats: null };
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取收入趋势数据
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'trend', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ ...dateRange, groupBy: 'day' });
      const result = await fetchAdminJson(`/api/admin/revenue/trend?${params}`);
      if (result.ok) {
        return result.data;
      }
      if (result.status === 404) {
        const fallback = await getLegacyRevenueFallback(dateRange);
        return { trend: fallback.trend };
      }
      return result.data || { trend: [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取渠道分析数据
  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'channels', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const result = await fetchAdminJson(`/api/admin/revenue/channels?${params}`);
      if (result.ok) {
        return result.data;
      }
      if (result.status === 404) {
        const fallback = await getLegacyRevenueFallback(dateRange);
        return { channels: fallback.channels };
      }
      return result.data || { channels: [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取促销效果分析
  const { data: promotionsData, isLoading: promotionsLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'promotions', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const result = await fetchAdminJson(`/api/admin/revenue/promotions?${params}`);
      if (result.ok) {
        return result.data;
      }
      if (result.status === 404) {
        const fallback = await getLegacyRevenueFallback(dateRange);
        return {
          promotions: fallback.promotions,
          attributionModel: fallback.attributionModel,
          roiAvailable: fallback.roiAvailable,
        };
      }
      return result.data || { promotions: [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取用户价值分布
  const { data: userValueData, isLoading: userValueLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'user-value-distribution'],
    queryFn: async () => {
      const result = await fetchAdminJson(`/api/admin/revenue/user-value-distribution`);
      if (result.ok) {
        return result.data;
      }
      if (result.status === 404) {
        const fallback = await getLegacyRevenueFallback(dateRange);
        return { distribution: fallback.distribution };
      }
      return result.data || { distribution: null };
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取订单状态分布
  const { data: orderStatusData, isLoading: orderStatusLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'order-status-distribution', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const result = await fetchAdminJson(`/api/admin/revenue/order-status-distribution?${params}`);
      if (result.ok) {
        return result.data;
      }
      if (result.status === 404) {
        const fallback = await getLegacyRevenueFallback(dateRange);
        return { distribution: fallback.orderStatus };
      }
      return result.data || { distribution: null };
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = statsData?.stats;
  const trend = trendData?.trend;
  const channels = channelsData?.channels;
  const promotions = promotionsData?.promotions;
  const promotionsAttributionModel = promotionsData?.attributionModel;
  const promotionsRoiAvailable = promotionsData?.roiAvailable !== false;
  const promotionsAttributionCopy =
    promotionsAttributionModel === "order_audit"
      ? "Revenue is attributed from payment-create audit metadata. ROI stays unavailable until spend attribution is wired."
      : promotionsAttributionModel === "hybrid_order_audit_and_derived_rules"
        ? "Revenue uses explicit payment-create audit metadata when present and derived promotion rules as fallback. ROI stays unavailable until spend attribution is wired."
        : "Revenue is derived from promotion rules. ROI stays unavailable until spend attribution is wired.";
  const userValue = userValueData?.distribution;
  const orderStatus = orderStatusData?.distribution;

  // 渲染统计卡片
  const renderStatCard = (title, value, color = 'blue', unit = '') => {
    const style = STAT_CARD_STYLES[color] || STAT_CARD_STYLES.blue;

    return (
      <div className={`rounded-lg border p-4 ${style.container}`}>
        <p className="text-sm text-neutral-400">{title}</p>
        <p className={`mt-2 text-2xl font-bold ${style.value}`}>
          {typeof value === 'number' ? value.toFixed(2) : value}
          {unit && <span className="text-sm ml-1">{unit}</span>}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">收入管理</h1>
          <p className="text-neutral-400 mt-2">收入趋势、渠道分析、促销效果</p>
        </div>

        {/* 日期范围选择 */}
        <div className="mb-6 flex gap-4">
          <div>
            <label className="text-sm text-neutral-400">开始日期</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="mt-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>
          <div>
            <label className="text-sm text-neutral-400">结束日期</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="mt-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>
        </div>

        {/* 视图切换 */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'overview', label: '概览' },
            { key: 'trend', label: '趋势' },
            { key: 'channels', label: '渠道' },
            { key: 'promotions', label: '促销' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setViewMode(item.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === item.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 概览视图 */}
        {viewMode === 'overview' && (
          <div className="space-y-6">
            <AdminDataState
              isLoading={statsLoading}
              hasData={Boolean(stats)}
              emptyMessage="无数据"
              wrap={false}
            >
              {() => (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {renderStatCard('总收入', stats.totalRevenue, 'emerald', '$')}
                  {renderStatCard('订单数', stats.totalOrders, 'blue')}
                  {renderStatCard('平均订单金额', stats.avgOrderValue, 'purple', '$')}
                  {renderStatCard('退款金额', stats.totalRefunded, 'red', '$')}
                  {renderStatCard('净收入', stats.netRevenue, 'green', '$')}
                </div>

                {/* 用户价值分布 */}
                {userValue && (
                  <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-100 mb-2">用户价值分布</h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {renderStatCard('高价值用户', userValue.highValue, 'emerald')}
                      {renderStatCard('中价值用户', userValue.mediumValue, 'yellow')}
                      {renderStatCard('低价值用户', userValue.lowValue, 'orange')}
                      {renderStatCard('无消费用户', userValue.noValue, 'gray')}
                    </div>
                  </div>
                )}

                {/* 订单状态分布 */}
                {orderStatus && (
                  <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-100 mb-4">订单状态分布</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {renderStatCard('待支付', orderStatus.pending, 'yellow')}
                      {renderStatCard('已支付', orderStatus.paid, 'green')}
                      {renderStatCard('失败', orderStatus.failed, 'red')}
                      {renderStatCard('已退款', orderStatus.refunded, 'gray')}
                    </div>
                  </div>
                )}
              </>
              )}
            </AdminDataState>
          </div>
        )}

        {/* 趋势视图 */}
        {viewMode === 'trend' && (
          <div className="space-y-6">
            <AdminDataState
              isLoading={trendLoading}
              hasData={trend && trend.length > 0}
              emptyMessage="无数据"
            >
                <h3 className="text-lg font-semibold text-neutral-100 mb-4">收入趋势</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">日期</th>
                        <th className="px-4 py-3 text-left text-neutral-400">收入</th>
                        <th className="px-4 py-3 text-left text-neutral-400">订单数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map((item) => (
                        <tr key={item.date} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{item.date}</td>
                          <td className="px-4 py-3 text-emerald-400">${item.revenue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-neutral-300">{item.orders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </AdminDataState>
          </div>
        )}

        {/* 渠道视图 */}
        {viewMode === 'channels' && (
          <div className="space-y-6">
            <AdminDataState
              isLoading={channelsLoading}
              hasData={channels && channels.length > 0}
              emptyMessage="无数据"
            >
                <h3 className="text-lg font-semibold text-neutral-100 mb-4">渠道分析</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">渠道</th>
                        <th className="px-4 py-3 text-left text-neutral-400">订单数</th>
                        <th className="px-4 py-3 text-left text-neutral-400">收入</th>
                        <th className="px-4 py-3 text-left text-neutral-400">平均订单金额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((item) => (
                        <tr key={item.channel} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{item.channel}</td>
                          <td className="px-4 py-3 text-neutral-300">{item.orders}</td>
                          <td className="px-4 py-3 text-emerald-400">${item.revenue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-neutral-300">${item.avgOrderValue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </AdminDataState>
          </div>
        )}

        {/* 促销视图 */}
        {viewMode === 'promotions' && (
          <div className="space-y-6">
            <AdminDataState
              isLoading={promotionsLoading}
              hasData={promotions && promotions.length > 0}
              emptyMessage="无数据"
            >
                <h3 className="text-lg font-semibold text-neutral-100 mb-4">促销效果分析</h3>
                {!promotionsRoiAvailable || promotionsAttributionModel ? (
                  <p className="mb-4 text-xs text-neutral-400">
                    {promotionsAttributionCopy}
                  </p>
                ) : null}
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">促销活动</th>
                        <th className="px-4 py-3 text-left text-neutral-400">订单数</th>
                        <th className="px-4 py-3 text-left text-neutral-400">收入</th>
                        <th className="px-4 py-3 text-left text-neutral-400">ROI</th>
                        <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promotions.map((item) => (
                        <tr key={item.promotionId} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{item.title}</td>
                          <td className="px-4 py-3 text-neutral-300">{item.orders}</td>
                          <td className="px-4 py-3 text-emerald-400">${item.revenue.toFixed(2)}</td>
                          <td className={`px-4 py-3 ${item.roi == null ? 'text-neutral-500' : 'text-blue-400'}`}>{formatPercentage(item.roi)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                item.active
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-gray-900/30 text-gray-400'
                              }`}
                            >
                              {item.active ? '活跃' : '已关闭'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </AdminDataState>
          </div>
        )}
      </div>
    </div>
  );
}
