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
const EMPTY_MESSAGE = '当前时间范围内还没有收入数据。';
const legacyRevenueCache = new Map();

const REVENUE_TABS = [
  { value: 'overview', label: '总览' },
  { value: 'trend', label: '趋势' },
  { value: 'channels', label: '渠道' },
  { value: 'promotions', label: '活动' },
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
  return value === null || value === undefined ? '暂无' : `${value}%`;
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

function formatLabel(value, fallback = '未命名渠道') {
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
      title: item?.title || '未命名活动',
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
        title: '收入趋势',
        description: '按天看收入波动和支付完成订单，不把页面做成吵闹的图表墙。',
      };
    case 'channels':
      return {
        title: '渠道表现',
        description: '看清真正带来收入的是哪些支付或购买渠道，而不是只堆一排指标。',
      };
    case 'promotions':
      return {
        title: '活动表现',
        description: '把活动带来的收入和归因限制说清楚，避免后台看起来像会自己脑补结果。',
      };
    default:
      return {
        title: '收入总览',
        description: '用一个更克制的方式阅读收入、退款、读者层级和订单结果，不回到旧 BI 面板语气。',
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
      ? '当前收入归因来自支付创建时记录的审计元数据。在活动花费归因接线完成前，ROI 仍会保持不可用。'
      : promotionsAttributionModel === 'hybrid_order_audit_and_derived_rules'
        ? '当前收入会优先使用支付创建审计元数据；缺失时再回退到活动规则推导。在活动花费归因接线完成前，ROI 仍会保持不可用。'
        : '当前收入暂时通过活动规则推导得出。在活动花费归因接线完成前，ROI 仍会保持不可用。';

  const overviewLoading = statsLoading || userValueLoading || orderStatusLoading;
  const hasOverviewData = Boolean(stats) || Boolean(userValue) || Boolean(orderStatus);
  const meta = viewMeta(viewMode);

  return (
    <AdminLayout
      title="营收"
      subtitle="用和后台其余页面一致的克制语气，查看收入结果、渠道结构和活动影响，不把这里重新做成一块吵闹 BI 面板。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="总营收"
            value={stats ? formatCurrency(stats.totalRevenue) : '--'}
            detail="当前时间范围内的支付成功总收入。"
            tone="accent"
          />
          <AdminMetricCard
            label="支付成功订单"
            value={stats ? formatCount(stats.totalOrders) : '--'}
            detail="当前营收快照里计入的订单数量。"
          />
          <AdminMetricCard
            label="客单价"
            value={stats ? formatCurrency(stats.avgOrderValue) : '--'}
            detail="快速判断订单质量，不只看订单数量。"
          />
          <AdminMetricCard
            label="净营收"
            value={stats ? formatCurrency(stats.netRevenue) : '--'}
            detail="扣除退款金额后的剩余收入。"
          />
        </div>

        <AdminPageSection
          title="查看范围"
          description="切换视角和时间窗口时，页面保持清楚、轻量、可读，不回到通用 BI 仪表盘写法。"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
            <div className="space-y-3">
              <AdminTabs items={REVENUE_TABS} value={viewMode} onChange={setViewMode} />
              <p className="text-sm leading-6 text-slate-500">{meta.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminFormField label="开始日期">
                <input
                  id="revenue-start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(event) => setDateRange((current) => ({ ...current, startDate: event.target.value }))}
                  className={adminInputClassName}
                />
              </AdminFormField>
              <AdminFormField label="结束日期">
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
                  title="收入总览"
                  description="在当前时间窗口内，先把收入、退款和订单质量读清楚。"
                >
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <AdminMetricCard label="总收入" value={formatCurrency(stats.totalRevenue)} detail="退款前的支付成功收入。" tone="accent" />
                    <AdminMetricCard label="订单总数" value={formatCount(stats.totalOrders)} detail="当前快照里统计到的订单数。" />
                    <AdminMetricCard label="平均订单金额" value={formatCurrency(stats.avgOrderValue)} detail="支付成功订单的平均金额。" />
                    <AdminMetricCard label="退款金额" value={formatCurrency(stats.totalRefunded)} detail="同一时间范围内发生的退款总额。" />
                    <AdminMetricCard label="净收入" value={formatCurrency(stats.netRevenue)} detail="扣除退款后真正留下的收入。" />
                  </div>
                </AdminPageSection>
              ) : null}

              {userValue ? (
                <AdminPageSection
                  title="付费读者层级"
                  description="按照累计消费做一个轻量分层，帮助判断读者价值结构。"
                >
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <AdminMetricCard label="高价值" value={formatCount(userValue.highValue)} detail="累计消费最强的一批读者。" tone="accent" />
                    <AdminMetricCard label="中价值" value={formatCount(userValue.mediumValue)} detail="处在中间消费带的读者。" />
                    <AdminMetricCard label="低价值" value={formatCount(userValue.lowValue)} detail="已付费但还未进入中段的读者。" />
                    <AdminMetricCard label="未付费" value={formatCount(userValue.noValue)} detail="当前没有记录到消费的读者。" />
                  </div>
                </AdminPageSection>
              ) : null}

              {orderStatus ? (
                <AdminPageSection
                  title="订单结果结构"
                  description="让订单健康度保持可读，这样客服和商业判断才建立在真实结果上。"
                >
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <AdminMetricCard label="待完成" value={formatCount(orderStatus.pending)} detail="仍在等待支付完成的订单。" />
                    <AdminMetricCard label="已支付" value={formatCount(orderStatus.paid)} detail="已经成功完成支付的订单。" tone="accent" />
                    <AdminMetricCard label="失败" value={formatCount(orderStatus.failed)} detail="支付失败或被拒付的订单。" />
                    <AdminMetricCard label="已退款" value={formatCount(orderStatus.refunded)} detail="后续完成退款的订单。" />
                  </div>
                </AdminPageSection>
              ) : null}
            </div>
          </AdminDataState>
        ) : null}

        {viewMode === 'trend' ? (
          <AdminDataState isLoading={trendLoading} hasData={trend.length > 0} emptyMessage={EMPTY_MESSAGE} wrap={false}>
            <AdminPageSection title="收入趋势" description="按天看收入和支付完成订单的变化。">
              <AdminDataTable>
                <table className="w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">日期</th>
                      <th className="px-4 py-4">收入</th>
                      <th className="px-4 py-4">支付成功订单</th>
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
            <AdminPageSection title="渠道表现" description="比较不同支付或购买渠道带来的收入，不把页面做成密密麻麻的仪表盘。">
              <AdminDataTable>
                <table className="w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">渠道</th>
                      <th className="px-4 py-4">订单数</th>
                      <th className="px-4 py-4">收入</th>
                      <th className="px-4 py-4">平均订单金额</th>
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
              title="活动表现"
              description="把活动结果和归因限制同时说明白，避免看起来像后台自己编出了完整效果。"
            >
              {!promotionsRoiAvailable || promotionsAttributionModel ? (
                <div className="mb-5 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 text-sm leading-6 text-slate-600">
                  {promotionsAttributionCopy}
                </div>
              ) : null}

              <AdminDataTable>
                <table className="w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">活动</th>
                      <th className="px-4 py-4">订单数</th>
                      <th className="px-4 py-4">收入</th>
                      <th className="px-4 py-4">ROI</th>
                      <th className="px-4 py-4">状态</th>
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
                            {item.active ? '进行中' : '已停用'}
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

