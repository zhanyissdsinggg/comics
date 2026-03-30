'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AdminLayout } from '../../../components/admin/AdminLayout';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import {
  AdminBadge,
  AdminDataTable,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  AdminTabs,
  adminInputClassName,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { adminFetchJson } from '@/lib/adminApiClient';
import { normalizeUSDisplayCurrency } from '@/lib/localization';

const LEGACY_REVENUE_CACHE_TTL_MS = 60_000;
const EMPTY_MESSAGE = 'No revenue data is available for this range.';
const legacyRevenueCache = new Map();

const REVENUE_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'trend', label: 'Trend' },
  { value: 'channels', label: 'Channels' },
  { value: 'promotions', label: 'Promotions' },
];

async function fetchAdminJson(path) {
  try {
    const { response, data } = await adminFetchJson(path, {
      cache: 'no-store',
    });

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
  return value === null || value === undefined ? 'Not available' : `${value}%`;
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
  const normalizedCurrency = normalizeUSDisplayCurrency(currency);

  try {
    return new Intl.NumberFormat('zh-CN', {
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
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatLabel(value, fallback = 'Unknown') {
  const rawValue = String(value || '').trim();
  if (!rawValue || rawValue.toLowerCase() === 'unknown') {
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
      order?.provider || order?.paymentChannel || order?.channel || order?.paymentMethod || 'unknown',
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

function viewMeta(tab) {
  switch (tab) {
    case 'trend':
      return {
        title: 'Revenue trend',
        description: 'Read the daily movement without wrapping the page in charts and dashboard chrome.',
      };
    case 'channels':
      return {
        title: 'Channel performance',
        description: 'See which payment or purchase channels actually drive revenue.',
      };
    case 'promotions':
      return {
        title: 'Promotion performance',
        description: 'Keep promotional attribution explicit, especially where ROI is still limited by backend inputs.',
      };
    default:
      return {
        title: 'Revenue overview',
        description: 'A clear operational read on revenue, refunds, reader value mix, and order outcomes.',
      };
  }
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
        { stats: null },
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
        { trend: [] },
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
        { channels: [] },
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
        { promotions: [], attributionModel: null, roiAvailable: true },
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: userValueData, isLoading: userValueLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'user-value-distribution', dateRange],
    queryFn: async () =>
      loadRevenueResource(
        '/api/admin/revenue/user-value-distribution',
        dateRange,
        (fallback) => ({ distribution: fallback.distribution }),
        { distribution: null },
      ),
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
        { distribution: null },
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
      ? 'Revenue is currently attributed from payment-creation audit metadata. ROI will remain unavailable until spend attribution is wired in.'
      : promotionsAttributionModel === 'hybrid_order_audit_and_derived_rules'
        ? 'Revenue uses payment-creation audit metadata first and falls back to derived promotion rules when audit metadata is missing. ROI remains unavailable until spend attribution is wired in.'
        : 'Revenue is currently derived from promotion rules. ROI remains unavailable until spend attribution is wired in.';

  const overviewLoading = statsLoading || userValueLoading || orderStatusLoading;
  const hasOverviewData = Boolean(stats) || Boolean(userValue) || Boolean(orderStatus);
  const meta = viewMeta(viewMode);

  return (
    <AdminLayout
      title="Revenue"
      subtitle="Read revenue outcomes, channel mix, and promotion impact in the same calm editorial admin language as the rest of the workspace."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Revenue"
            value={stats ? formatCurrency(stats.totalRevenue) : '--'}
            detail="Gross paid revenue in the selected range."
            tone="accent"
          />
          <AdminMetricCard
            label="Paid orders"
            value={stats ? formatCount(stats.totalOrders) : '--'}
            detail="Orders counted in the current revenue snapshot."
          />
          <AdminMetricCard
            label="Average order value"
            value={stats ? formatCurrency(stats.avgOrderValue) : '--'}
            detail="A quick read on order quality, not just order count."
          />
          <AdminMetricCard
            label="Net revenue"
            value={stats ? formatCurrency(stats.netRevenue) : '--'}
            detail="Revenue after refunded volume is removed."
          />
        </div>

        <AdminPageSection
          title="Revenue filters"
          description="Switch views and update the reporting window without falling back to a generic BI dashboard layout."
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
            <div className="space-y-3">
              <AdminTabs items={REVENUE_TABS} value={viewMode} onChange={setViewMode} />
              <p className="text-sm leading-6 text-slate-500">{meta.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminFormField label="Start date">
                <input
                  id="revenue-start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(event) => setDateRange((current) => ({ ...current, startDate: event.target.value }))}
                  className={adminInputClassName}
                />
              </AdminFormField>
              <AdminFormField label="End date">
                <input
                  id="revenue-end-date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(event) => setDateRange((current) => ({ ...current, endDate: event.target.value }))}
                  className={adminInputClassName}
                />
              </AdminFormField>
            </div>
          </div>
        </AdminPageSection>

        {viewMode === 'overview' ? (
          <AdminDataState isLoading={overviewLoading} hasData={hasOverviewData} emptyMessage={EMPTY_MESSAGE} wrap={false}>
            <div className="space-y-6">
              {stats ? (
                <AdminPageSection
                  title="Revenue overview"
                  description="A compact operational read on revenue, refunds, and order quality in the selected window."
                >
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <AdminMetricCard label="Gross revenue" value={formatCurrency(stats.totalRevenue)} detail="Paid revenue before refunds." tone="accent" />
                    <AdminMetricCard label="Total orders" value={formatCount(stats.totalOrders)} detail="Orders counted in this snapshot." />
                    <AdminMetricCard label="Average order value" value={formatCurrency(stats.avgOrderValue)} detail="Average paid order size." />
                    <AdminMetricCard label="Refunded" value={formatCurrency(stats.totalRefunded)} detail="Refunded value in the same range." />
                    <AdminMetricCard label="Net revenue" value={formatCurrency(stats.netRevenue)} detail="Revenue remaining after refunds." />
                  </div>
                </AdminPageSection>
              ) : null}

              {userValue ? (
                <AdminPageSection
                  title="Reader value mix"
                  description="A lightweight segmentation of paying readers based on cumulative spend."
                >
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <AdminMetricCard label="High value" value={formatCount(userValue.highValue)} detail="Readers with the strongest cumulative spend." tone="accent" />
                    <AdminMetricCard label="Mid value" value={formatCount(userValue.mediumValue)} detail="Readers in the mid-spend band." />
                    <AdminMetricCard label="Low value" value={formatCount(userValue.lowValue)} detail="Paying readers below the mid band." />
                    <AdminMetricCard label="No spend" value={formatCount(userValue.noValue)} detail="Readers without recorded spend." />
                  </div>
                </AdminPageSection>
              ) : null}

              {orderStatus ? (
                <AdminPageSection
                  title="Order outcome mix"
                  description="Keep order health readable so support and commerce decisions stay grounded in real outcomes."
                >
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <AdminMetricCard label="Pending" value={formatCount(orderStatus.pending)} detail="Orders still waiting on completion." />
                    <AdminMetricCard label="Paid" value={formatCount(orderStatus.paid)} detail="Orders that completed successfully." tone="accent" />
                    <AdminMetricCard label="Failed" value={formatCount(orderStatus.failed)} detail="Orders that failed or were charged back." />
                    <AdminMetricCard label="Refunded" value={formatCount(orderStatus.refunded)} detail="Orders later refunded." />
                  </div>
                </AdminPageSection>
              ) : null}
            </div>
          </AdminDataState>
        ) : null}

        {viewMode === 'trend' ? (
          <AdminDataState isLoading={trendLoading} hasData={trend.length > 0} emptyMessage={EMPTY_MESSAGE} wrap={false}>
            <AdminPageSection title="Revenue trend" description="A day-by-day read on revenue and paid orders.">
              <AdminDataTable>
                <table className="w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Revenue</th>
                      <th className="px-4 py-4">Paid orders</th>
                    </tr>
                  </AdminTableHeader>
                  <tbody>
                    {trend.map((item) => (
                      <AdminTableRow key={item.date}>
                        <td className="px-4 py-4 text-slate-700">{item.date}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCount(item.orders)}</td>
                      </AdminTableRow>
                    ))}
                  </tbody>
                </table>
              </AdminDataTable>
            </AdminPageSection>
          </AdminDataState>
        ) : null}

        {viewMode === 'channels' ? (
          <AdminDataState isLoading={channelsLoading} hasData={channels.length > 0} emptyMessage={EMPTY_MESSAGE} wrap={false}>
            <AdminPageSection title="Channel performance" description="Compare revenue by purchase or payment channel without turning the page into dashboard clutter.">
              <AdminDataTable>
                <table className="w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">Channel</th>
                      <th className="px-4 py-4">Orders</th>
                      <th className="px-4 py-4">Revenue</th>
                      <th className="px-4 py-4">Average order value</th>
                    </tr>
                  </AdminTableHeader>
                  <tbody>
                    {channels.map((item) => (
                      <AdminTableRow key={item.channel}>
                        <td className="px-4 py-4 text-slate-700">{formatLabel(item.channel)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCount(item.orders)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(item.avgOrderValue)}</td>
                      </AdminTableRow>
                    ))}
                  </tbody>
                </table>
              </AdminDataTable>
            </AdminPageSection>
          </AdminDataState>
        ) : null}

        {viewMode === 'promotions' ? (
          <AdminDataState isLoading={promotionsLoading} hasData={promotions.length > 0} emptyMessage={EMPTY_MESSAGE} wrap={false}>
            <AdminPageSection
              title="Promotion performance"
              description="Track promotion outcomes while keeping attribution limitations explicit."
            >
              {!promotionsRoiAvailable || promotionsAttributionModel ? (
                <div className="mb-5 rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.82)] px-4 py-4 text-sm leading-6 text-slate-600">
                  {promotionsAttributionCopy}
                </div>
              ) : null}

              <AdminDataTable>
                <table className="w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">Promotion</th>
                      <th className="px-4 py-4">Orders</th>
                      <th className="px-4 py-4">Revenue</th>
                      <th className="px-4 py-4">ROI</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </AdminTableHeader>
                  <tbody>
                    {promotions.map((item) => (
                      <AdminTableRow key={item.promotionId}>
                        <td className="px-4 py-4 text-slate-700">{item.title}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCount(item.orders)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatPercentage(item.roi)}</td>
                        <td className="px-4 py-4">
                          <AdminBadge tone={item.active ? 'success' : 'default'}>
                            {item.active ? 'Active' : 'Inactive'}
                          </AdminBadge>
                        </td>
                      </AdminTableRow>
                    ))}
                  </tbody>
                </table>
              </AdminDataTable>
            </AdminPageSection>
          </AdminDataState>
        ) : null}
      </div>
    </AdminLayout>
  );
}

