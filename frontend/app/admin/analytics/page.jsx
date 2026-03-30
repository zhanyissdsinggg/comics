'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import AdminShell from '@/components/admin/AdminShell';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import {
  AdminBadge,
  AdminDataTable,
  AdminKeyValueList,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  AdminTabs,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminFetchJson } from '@/lib/adminApiClient';

const VIEW_TABS = [
  { value: 'stats', label: 'Overview' },
  { value: 'segments', label: 'Audience segments' },
  { value: 'user-detail', label: 'User detail' },
];

const SEGMENT_FILTERS = [
  { key: 'all', label: 'All readers' },
  { key: 'vip', label: 'VIP' },
  { key: 'high-value', label: 'High value' },
  { key: 'at-risk', label: 'At risk' },
];

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatPercent(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.includes('%') ? value : `${value}%`;
  }

  const amount = Number(value || 0);
  return `${amount.toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatNumber(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US').format(Number.isFinite(amount) ? amount : 0);
}

function getSegmentLabel(segment) {
  return SEGMENT_FILTERS.find((item) => item.key === segment)?.label || 'Custom segment';
}

function formatChurnRiskLabel(churnRisk) {
  switch (String(churnRisk || '').toLowerCase()) {
    case 'low':
      return 'Low';
    case 'medium':
      return 'Medium';
    case 'high':
      return 'High';
    default:
      return 'Unknown';
  }
}

function getChurnTone(churnRisk) {
  switch (String(churnRisk || '').toLowerCase()) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'danger';
    default:
      return 'default';
  }
}

async function fetchAdminPayload(path) {
  const { response, data } = await adminFetchJson(path, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed with status ${response.status}.`);
  }

  return data || {};
}

export default function AdminUserAnalyticsPage() {
  const [viewMode, setViewMode] = useState('stats');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const statsQuery = useQuery({
    queryKey: ['admin', 'analytics', 'stats'],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await fetchAdminPayload('/api/admin/analytics/stats');
      return data?.stats || null;
    },
  });

  const segmentsQuery = useQuery({
    queryKey: ['admin', 'analytics', 'segments', selectedSegment, page, pageSize],
    staleTime: 60_000,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const params = new URLSearchParams({
        segment: selectedSegment,
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });

      const data = await fetchAdminPayload(`/api/admin/analytics/segments?${params}`);
      return (
        data?.segments || {
          users: [],
          total: 0,
          limit: pageSize,
          offset: 0,
        }
      );
    },
  });

  const userDetailQuery = useQuery({
    queryKey: ['admin', 'analytics', 'user', selectedUserId],
    enabled: Boolean(selectedUserId),
    staleTime: 60_000,
    queryFn: async () => {
      const data = await fetchAdminPayload(`/api/admin/analytics/users/${selectedUserId}`);
      return data?.analytics || null;
    },
  });

  const stats = statsQuery.data;
  const segmentData = segmentsQuery.data || {
    users: [],
    total: 0,
    limit: pageSize,
    offset: 0,
  };
  const users = Array.isArray(segmentData?.users) ? segmentData.users : [];
  const totalUsers = Number(segmentData?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize) || 1);
  const pagination = {
    page,
    pageSize,
    total: totalUsers,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  };
  const analytics = userDetailQuery.data;
  const user = analytics?.user;
  const ltv = analytics?.ltv;
  const userBehavior = user?.userBehavior;

  useEffect(() => {
    setPage(1);
    setSelectedUserId('');
  }, [selectedSegment]);

  const statsCards = [
    {
      label: 'Total readers',
      value: formatNumber(stats?.totalUsers),
      detail: 'All registered reader accounts.',
      tone: 'accent',
    },
    {
      label: 'Active readers',
      value: formatNumber(stats?.activeUsers),
      detail: 'Accounts active in the current analysis window.',
    },
    {
      label: 'Active rate',
      value: formatPercent(stats?.activeRate),
      detail: 'The share of all readers who were recently active.',
    },
    {
      label: 'High-value readers',
      value: formatNumber(stats?.highValueUsers),
      detail: 'Accounts that have crossed the LTV threshold.',
    },
    {
      label: 'At-risk readers',
      value: formatNumber(stats?.atRiskUsers),
      detail: 'Readers who may need a retention touch soon.',
    },
    {
      label: 'Tracked revenue',
      value: formatCurrency(stats?.totalRevenue),
      detail: 'Observed spend attributed to the tracked reader base.',
    },
  ];

  return (
    <AdminShell
      title="Dashboard"
      subtitle="Review the audience picture without turning the page into a loud KPI wall. Start with the overall pulse, then move into segments or a single account when needed."
    >
      <div className="space-y-6">
        <AdminTabs items={VIEW_TABS} value={viewMode} onChange={setViewMode} />

        {viewMode === 'stats' ? (
          <AdminPageSection
            title="Audience overview"
            description="Track reader scale, activity, value, and retention risk in one calm editorial workspace."
          >
            {statsQuery.isError ? (
              <AdminDataState
                isLoading={false}
                hasData={false}
                emptyMessage={getErrorMessage(statsQuery.error, 'Analytics could not be loaded.')}
              />
            ) : (
              <AdminDataState
                isLoading={statsQuery.isLoading}
                hasData={Boolean(stats)}
                emptyMessage="Analytics data is not available yet."
                wrap={false}
              >
                {() => (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {statsCards.map((card) => (
                        <AdminMetricCard key={card.label} {...card} />
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
                        <p className="text-sm font-semibold text-slate-950">Retention watch</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {Number(stats?.atRiskUsers || 0) > 0
                            ? `${formatNumber(stats?.atRiskUsers)} readers currently look like they need retention attention.`
                            : 'No high-risk churn signal is active in the latest snapshot.'}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
                        <p className="text-sm font-semibold text-slate-950">Revenue density</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {Number(stats?.highValueUsers || 0) > 0
                            ? `Average spend across high-value readers is ${formatCurrency((Number(stats?.totalRevenue || 0)) / Number(stats?.highValueUsers || 1))}.`
                            : 'This note will update once high-value readers are available in the current sample.'}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
                        <p className="text-sm font-semibold text-slate-950">Activity pulse</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {Number(stats?.activeUsers || 0) > 0
                            ? `${formatNumber(stats?.activeUsers)} readers generated recent activity in the current window.`
                            : 'No recent activity has been recorded in the latest sample.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </AdminDataState>
            )}
          </AdminPageSection>
        ) : null}

        {viewMode === 'segments' ? (
          <AdminPageSection
            title="Audience segments"
            description="Start with a reader group, then open one account only when you need the deeper story."
          >
            <div className="mb-6 flex flex-wrap gap-2">
              {SEGMENT_FILTERS.map((segment) => (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => {
                    setSelectedSegment(segment.key);
                    setPage(1);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selectedSegment === segment.key
                      ? 'border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]'
                      : 'border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950'
                  }`}
                >
                  {segment.label}
                </button>
              ))}
            </div>

            <AdminTableShell
              isError={segmentsQuery.isError}
              errorMessage={getErrorMessage(segmentsQuery.error, 'Audience segments could not be loaded.')}
              onRetry={() => segmentsQuery.refetch()}
              isLoading={segmentsQuery.isLoading}
              hasItems={users.length > 0}
              emptyMessage="No users match this segment yet."
              pagination={pagination}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            >
              <AdminDataTable className="border-0 shadow-none">
                <table className="w-full min-w-[920px]">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">Reader</th>
                      <th className="px-4 py-4">Wallet</th>
                      <th className="px-4 py-4">LTV</th>
                      <th className="px-4 py-4">Stories viewed</th>
                      <th className="px-4 py-4">Churn risk</th>
                      <th className="px-4 py-4">Joined</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </AdminTableHeader>
                  <tbody>
                    {users.map((segmentUser) => {
                      const metrics = segmentUser.userMetrics;
                      const behavior = segmentUser.userBehavior;

                      return (
                        <AdminTableRow key={segmentUser.id}>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-950">
                                {segmentUser.email || 'Unknown email'}
                              </p>
                              <p className="text-xs text-slate-500">{segmentUser.id}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {formatNumber(segmentUser.wallet?.coins)}
                          </td>
                          <td className="px-4 py-4 text-slate-600">{formatCurrency(metrics?.ltv)}</td>
                          <td className="px-4 py-4 text-slate-600">
                            {formatNumber(behavior?.seriesViewed)}
                          </td>
                          <td className="px-4 py-4">
                            <AdminBadge tone={getChurnTone(metrics?.churnRisk)}>
                              {formatChurnRiskLabel(metrics?.churnRisk)}
                            </AdminBadge>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{formatDate(segmentUser.createdAt)}</td>
                          <td className="px-4 py-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUserId(segmentUser.id);
                                setViewMode('user-detail');
                              }}
                            >
                              Open user
                            </Button>
                          </td>
                        </AdminTableRow>
                      );
                    })}
                  </tbody>
                </table>
              </AdminDataTable>
            </AdminTableShell>
          </AdminPageSection>
        ) : null}

        {viewMode === 'user-detail' ? (
          <AdminPageSection
            title="User detail"
            description={`Review the account behind the current ${getSegmentLabel(selectedSegment)} segment selection.`}
            action={
              <Button type="button" variant="outline" onClick={() => setViewMode('segments')}>
                Back to segments
              </Button>
            }
          >
            {userDetailQuery.isError ? (
              <AdminDataState
                isLoading={false}
                hasData={false}
                emptyMessage={getErrorMessage(userDetailQuery.error, 'User detail could not be loaded.')}
              />
            ) : (
              <AdminDataState
                isLoading={userDetailQuery.isLoading}
                hasData={Boolean(analytics && user)}
                emptyMessage={
                  selectedUserId
                    ? 'That user record could not be found.'
                    : 'Select a reader from the segment table to open the deeper view.'
                }
                wrap={false}
              >
                {() => (
                  <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
                    <div className="space-y-6">
                      <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Reader profile
                        </p>
                        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                          {user?.email || 'Unknown email'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">{user?.id}</p>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <AdminMetricCard
                            label="Lifetime value"
                            value={formatCurrency(ltv?.ltv)}
                            detail={`Average order value: ${formatCurrency(ltv?.avgOrderValue)}`}
                            tone="accent"
                          />
                          <AdminMetricCard
                            label="Total spend"
                            value={formatCurrency(ltv?.totalSpent)}
                            detail={`${formatNumber(ltv?.totalOrders)} recorded orders`}
                          />
                          <AdminMetricCard
                            label="Wallet"
                            value={formatNumber(user?.wallet?.coins)}
                            detail="Current point balance."
                          />
                          <AdminMetricCard
                            label="Activity score"
                            value={formatNumber(userBehavior?.activityScore)}
                            detail="Derived from reading and interaction signals."
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                          <p className="text-sm font-semibold text-slate-950">Spend history</p>
                          <AdminKeyValueList
                            className="mt-4"
                            items={[
                              { label: 'First order', value: formatDate(ltv?.firstOrderDate) },
                              { label: 'Latest order', value: formatDate(ltv?.lastOrderDate) },
                              { label: 'Order count', value: formatNumber(ltv?.totalOrders) },
                              { label: 'Current segment', value: getSegmentLabel(selectedSegment) },
                            ]}
                          />
                        </div>
                        <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                          <p className="text-sm font-semibold text-slate-950">Reading behavior</p>
                          <AdminKeyValueList
                            className="mt-4"
                            items={[
                              { label: 'Stories viewed', value: formatNumber(userBehavior?.seriesViewed) },
                              {
                                label: 'Reading time',
                                value: `${formatNumber(Math.round(Number(userBehavior?.readingTime || 0) / 60))} min`,
                              },
                              { label: 'Comments', value: formatNumber(userBehavior?.commentsCount) },
                              { label: 'Ratings', value: formatNumber(userBehavior?.ratingsCount) },
                              { label: 'Bookmarks', value: formatNumber(userBehavior?.bookmarksCount) },
                            ]}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">Retention status</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              Keep this note direct so operators can understand the risk level at a glance.
                            </p>
                          </div>
                          <AdminBadge tone={getChurnTone(analytics?.churnRisk)}>
                            {formatChurnRiskLabel(analytics?.churnRisk)}
                          </AdminBadge>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-slate-600">
                          {String(analytics?.churnRisk || '').toLowerCase() === 'high'
                            ? 'This account shows a strong churn signal and likely needs a re-engagement touch soon.'
                            : String(analytics?.churnRisk || '').toLowerCase() === 'medium'
                              ? 'Activity is softening, so targeted discovery or a lighter promotional touch may help.'
                              : 'Recent engagement still looks healthy relative to the current retention model.'}
                        </p>
                      </div>

                      <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                        <p className="text-sm font-semibold text-slate-950">Quick facts</p>
                        <AdminKeyValueList
                          className="mt-4"
                          items={[
                            { label: 'Joined', value: formatDate(user?.createdAt) },
                            { label: 'Wallet', value: formatNumber(user?.wallet?.coins) },
                            { label: 'Bonus balance', value: formatNumber(user?.wallet?.bonusCoins) },
                            { label: 'Last active', value: formatDate(userBehavior?.lastActiveAt) },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </AdminDataState>
            )}
          </AdminPageSection>
        ) : null}
      </div>
    </AdminShell>
  );
}
