'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AdminDataState } from '@/components/admin/common/AdminDataState';

const LEGACY_REVENUE_CACHE_TTL_MS = 60_000;
const EMPTY_MESSAGE = 'No revenue data available yet.';
const legacyRevenueCache = new Map();

const STAT_CARD_STYLES = {
  blue: {
    container: 'border-blue-700 bg-blue-900/20',
    value: 'text-blue-400',
  },
  emerald: {
    container: 'border-emerald-700 bg-emerald-900/20',
    value: 'text-emerald-400',
  },
  purple: {
    container: 'border-purple-700 bg-purple-900/20',
    value: 'text-purple-400',
  },
  red: {
    container: 'border-red-700 bg-red-900/20',
    value: 'text-red-400',
  },
  green: {
    container: 'border-green-700 bg-green-900/20',
    value: 'text-green-400',
  },
  yellow: {
    container: 'border-yellow-700 bg-yellow-900/20',
    value: 'text-yellow-400',
  },
  orange: {
    container: 'border-orange-700 bg-orange-900/20',
    value: 'text-orange-400',
  },
  gray: {
    container: 'border-gray-700 bg-gray-900/20',
    value: 'text-gray-400',
  },
};

const REVENUE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'trend', label: 'Trend' },
  { key: 'channels', label: 'Channels' },
  { key: 'promotions', label: 'Promotions' },
];

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
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function normalizeOrderStatus(status) {
  return String(status || '').toUpperCase();
}

function isPaidOrder(status) {
  const normalizedStatus = normalizeOrderStatus(status);
  return normalizedStatus === 'PAID' || normalizedStatus === 'COMPLETED';
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
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function toDateInputValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrency(value, currency = 'USD') {
  const amount = Number(value || 0);
  const normalizedCurrency = typeof currency === 'string' && currency.trim() ? currency : 'USD';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatCount(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatLabel(value, fallback = 'Unknown') {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return fallback;
  }

  return rawValue
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function loadRevenueResource(path, dateRange, fallbackSelector, defaultValue) {
  const result = await fetchAdminJson(path);
  if (result.ok) {
    return result.data;
  }

  if (result.status === 404) {
    const fallback = await getLegacyRevenueFallback(dateRange);
    return fallbackSelector(fallback);
  }

  return defaultValue;
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

    if (status === 'PENDING') {
      orderStatus.pending += 1;
    } else if (status === 'REFUNDED') {
      orderStatus.refunded += 1;
    } else if (status === 'FAILED' || status === 'CHARGEBACK') {
      orderStatus.failed += 1;
    } else if (isPaidOrder(status)) {
      orderStatus.paid += 1;
    }

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
      order?.provider || order?.paymentChannel || order?.channel || order?.paymentMethod || 'unknown'
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
    .sort((left, right) => right.revenue - left.revenue);

  let highValue = 0;
  let mediumValue = 0;
  let lowValue = 0;

  for (const spend of userSpendMap.values()) {
    if (spend >= 100) {
      highValue += 1;
    } else if (spend >= 20) {
      mediumValue += 1;
    } else if (spend > 0) {
      lowValue += 1;
    }
  }

  const trendFromDailyStats = dailyStats
    .map((item) => ({
      date: item?.date || '',
      revenue: Number(toNumber(item?.revenue ?? item?.totalRevenue ?? item?.amount).toFixed(2)),
      orders: toNumber(item?.paidOrders ?? item?.orders),
    }))
    .filter((item) => item.date);

  const trendFromOrders = Array.from(trendMap.entries())
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
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

function StatCard({ title, value, tone = 'blue', formatter = (item) => item }) {
  const style = STAT_CARD_STYLES[tone] || STAT_CARD_STYLES.blue;

  return (
    <div className={`rounded-xl border p-4 ${style.container}`}>
      <p className="text-sm text-neutral-400">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${style.value}`}>{formatter(value)}</p>
    </div>
  );
}

export default function AdminRevenuePage() {
  const [viewMode, setViewMode] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    endDate: toDateInputValue(new Date()),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      return loadRevenueResource(
        `/api/admin/revenue/stats?${params}`,
        dateRange,
        (fallback) => ({ stats: fallback.stats }),
        { stats: null }
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'trend', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ ...dateRange, groupBy: 'day' });
      return loadRevenueResource(
        `/api/admin/revenue/trend?${params}`,
        dateRange,
        (fallback) => ({ trend: fallback.trend }),
        { trend: [] }
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'channels', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      return loadRevenueResource(
        `/api/admin/revenue/channels?${params}`,
        dateRange,
        (fallback) => ({ channels: fallback.channels }),
        { channels: [] }
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: promotionsData, isLoading: promotionsLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'promotions', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      return loadRevenueResource(
        `/api/admin/revenue/promotions?${params}`,
        dateRange,
        (fallback) => ({
          promotions: fallback.promotions,
          attributionModel: fallback.attributionModel,
          roiAvailable: fallback.roiAvailable,
        }),
        { promotions: [], attributionModel: null, roiAvailable: true }
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: userValueData, isLoading: userValueLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'user-value-distribution'],
    queryFn: async () => {
      return loadRevenueResource(
        '/api/admin/revenue/user-value-distribution',
        dateRange,
        (fallback) => ({ distribution: fallback.distribution }),
        { distribution: null }
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: orderStatusData, isLoading: orderStatusLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'order-status-distribution', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      return loadRevenueResource(
        `/api/admin/revenue/order-status-distribution?${params}`,
        dateRange,
        (fallback) => ({ distribution: fallback.orderStatus }),
        { distribution: null }
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = statsData?.stats;
  const trend = trendData?.trend || [];
  const channels = channelsData?.channels || [];
  const promotions = promotionsData?.promotions || [];
  const userValue = userValueData?.distribution;
  const orderStatus = orderStatusData?.distribution;

  const promotionsAttributionModel = promotionsData?.attributionModel;
  const promotionsRoiAvailable = promotionsData?.roiAvailable !== false;
  const promotionsAttributionCopy =
    promotionsAttributionModel === 'order_audit'
      ? 'Revenue is attributed from payment-create audit metadata. ROI remains unavailable until spend attribution is wired.'
      : promotionsAttributionModel === 'hybrid_order_audit_and_derived_rules'
        ? 'Revenue uses explicit payment-create audit metadata when present and derived promotion rules as fallback. ROI remains unavailable until spend attribution is wired.'
        : 'Revenue is currently derived from promotion rules. ROI remains unavailable until spend attribution is wired.';

  const overviewLoading = statsLoading || userValueLoading || orderStatusLoading;
  const hasOverviewData = Boolean(stats) || Boolean(userValue) || Boolean(orderStatus);

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">Revenue Insights</h1>
          <p className="mt-2 max-w-3xl text-neutral-400">
            Review revenue, channel performance, promotion output, and order quality across the selected time range.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-neutral-700 bg-neutral-800 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="revenue-start-date" className="text-sm text-neutral-400">
                  Start date
                </label>
                <input
                  id="revenue-start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(event) => setDateRange((current) => ({ ...current, startDate: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100"
                />
              </div>
              <div>
                <label htmlFor="revenue-end-date" className="text-sm text-neutral-400">
                  End date
                </label>
                <input
                  id="revenue-end-date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(event) => setDateRange((current) => ({ ...current, endDate: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {REVENUE_TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setViewMode(item.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === item.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {viewMode === 'overview' ? (
          <AdminDataState
            isLoading={overviewLoading}
            hasData={hasOverviewData}
            emptyMessage={EMPTY_MESSAGE}
            wrap={false}
          >
            <div className="space-y-6">
              {stats ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Total revenue" value={stats.totalRevenue} tone="emerald" formatter={(value) => formatCurrency(value)} />
                  <StatCard title="Total orders" value={stats.totalOrders} tone="blue" formatter={(value) => formatCount(value)} />
                  <StatCard title="Average order value" value={stats.avgOrderValue} tone="purple" formatter={(value) => formatCurrency(value)} />
                  <StatCard title="Refunded revenue" value={stats.totalRefunded} tone="red" formatter={(value) => formatCurrency(value)} />
                  <StatCard title="Net revenue" value={stats.netRevenue} tone="green" formatter={(value) => formatCurrency(value)} />
                </div>
              ) : null}

              {userValue ? (
                <div className="rounded-xl border border-neutral-700 bg-neutral-800 p-5">
                  <h2 className="text-lg font-semibold text-neutral-100">Customer value distribution</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Segment users by cumulative paid order value.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="High value" value={userValue.highValue} tone="emerald" formatter={(value) => formatCount(value)} />
                    <StatCard title="Medium value" value={userValue.mediumValue} tone="yellow" formatter={(value) => formatCount(value)} />
                    <StatCard title="Low value" value={userValue.lowValue} tone="orange" formatter={(value) => formatCount(value)} />
                    <StatCard title="No value yet" value={userValue.noValue} tone="gray" formatter={(value) => formatCount(value)} />
                  </div>
                </div>
              ) : null}

              {orderStatus ? (
                <div className="rounded-xl border border-neutral-700 bg-neutral-800 p-5">
                  <h2 className="text-lg font-semibold text-neutral-100">Order status distribution</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Track order outcomes across the current date window.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="Pending" value={orderStatus.pending} tone="yellow" formatter={(value) => formatCount(value)} />
                    <StatCard title="Paid" value={orderStatus.paid} tone="green" formatter={(value) => formatCount(value)} />
                    <StatCard title="Failed" value={orderStatus.failed} tone="red" formatter={(value) => formatCount(value)} />
                    <StatCard title="Refunded" value={orderStatus.refunded} tone="gray" formatter={(value) => formatCount(value)} />
                  </div>
                </div>
              ) : null}
            </div>
          </AdminDataState>
        ) : null}

        {viewMode === 'trend' ? (
          <AdminDataState isLoading={trendLoading} hasData={trend.length > 0} emptyMessage={EMPTY_MESSAGE}>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-neutral-100">Revenue trend</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="px-4 py-3 text-left text-neutral-400">Date</th>
                      <th className="px-4 py-3 text-left text-neutral-400">Revenue</th>
                      <th className="px-4 py-3 text-left text-neutral-400">Paid orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.map((item) => (
                      <tr key={item.date} className="border-b border-neutral-700 hover:bg-neutral-700/40">
                        <td className="px-4 py-3 text-neutral-300">{item.date}</td>
                        <td className="px-4 py-3 text-emerald-400">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3 text-neutral-300">{formatCount(item.orders)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AdminDataState>
        ) : null}

        {viewMode === 'channels' ? (
          <AdminDataState isLoading={channelsLoading} hasData={channels.length > 0} emptyMessage={EMPTY_MESSAGE}>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-neutral-100">Channel performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="px-4 py-3 text-left text-neutral-400">Channel</th>
                      <th className="px-4 py-3 text-left text-neutral-400">Orders</th>
                      <th className="px-4 py-3 text-left text-neutral-400">Revenue</th>
                      <th className="px-4 py-3 text-left text-neutral-400">Average order value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((item) => (
                      <tr key={item.channel} className="border-b border-neutral-700 hover:bg-neutral-700/40">
                        <td className="px-4 py-3 text-neutral-300">{formatLabel(item.channel)}</td>
                        <td className="px-4 py-3 text-neutral-300">{formatCount(item.orders)}</td>
                        <td className="px-4 py-3 text-emerald-400">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3 text-neutral-300">{formatCurrency(item.avgOrderValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AdminDataState>
        ) : null}

        {viewMode === 'promotions' ? (
          <AdminDataState isLoading={promotionsLoading} hasData={promotions.length > 0} emptyMessage={EMPTY_MESSAGE}>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-neutral-100">Promotion performance</h2>
              {!promotionsRoiAvailable || promotionsAttributionModel ? (
                <p className="mb-4 text-xs text-neutral-400">{promotionsAttributionCopy}</p>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="px-4 py-3 text-left text-neutral-400">Promotion</th>
                      <th className="px-4 py-3 text-left text-neutral-400">Orders</th>
                      <th className="px-4 py-3 text-left text-neutral-400">Revenue</th>
                      <th className="px-4 py-3 text-left text-neutral-400">ROI</th>
                      <th className="px-4 py-3 text-left text-neutral-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map((item) => (
                      <tr key={item.promotionId} className="border-b border-neutral-700 hover:bg-neutral-700/40">
                        <td className="px-4 py-3 text-neutral-300">{item.title}</td>
                        <td className="px-4 py-3 text-neutral-300">{formatCount(item.orders)}</td>
                        <td className="px-4 py-3 text-emerald-400">{formatCurrency(item.revenue)}</td>
                        <td className={`px-4 py-3 ${item.roi == null ? 'text-neutral-500' : 'text-blue-400'}`}>
                          {formatPercentage(item.roi)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.active
                                ? 'bg-green-900/30 text-green-300'
                                : 'bg-neutral-700 text-neutral-300'
                            }`}
                          >
                            {item.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AdminDataState>
        ) : null}
      </div>
    </div>
  );
}
