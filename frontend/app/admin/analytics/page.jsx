'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { AdminListPagination } from '@/components/admin/common/AdminListPagination';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { adminFetchJson } from '@/lib/adminApiClient';

const VIEW_TABS = [
  { key: 'stats', label: 'Overview' },
  { key: 'segments', label: 'Segments' },
  { key: 'user-detail', label: 'User detail' },
];

const SEGMENT_FILTERS = [
  { key: 'all', label: 'All users' },
  { key: 'vip', label: 'VIP users' },
  { key: 'high-value', label: 'High value' },
  { key: 'at-risk', label: 'At risk' },
];

const STAT_CARD_STYLES = {
  blue: {
    container: 'border-sky-500/20 bg-sky-500/10',
    value: 'text-sky-200',
  },
  emerald: {
    container: 'border-emerald-500/20 bg-emerald-500/10',
    value: 'text-emerald-200',
  },
  violet: {
    container: 'border-violet-500/20 bg-violet-500/10',
    value: 'text-violet-200',
  },
  amber: {
    container: 'border-amber-500/20 bg-amber-500/10',
    value: 'text-amber-200',
  },
  rose: {
    container: 'border-rose-500/20 bg-rose-500/10',
    value: 'text-rose-200',
  },
  teal: {
    container: 'border-teal-500/20 bg-teal-500/10',
    value: 'text-teal-200',
  },
};

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
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function formatNumber(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US').format(Number.isFinite(amount) ? amount : 0);
}

function getSegmentLabel(segment) {
  return SEGMENT_FILTERS.find((item) => item.key === segment)?.label || 'Custom';
}

function getChurnTone(churnRisk) {
  switch (String(churnRisk || '').toLowerCase()) {
    case 'low':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    case 'medium':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'high':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    default:
      return 'border-neutral-700 bg-neutral-900 text-neutral-300';
  }
}

async function fetchAdminPayload(path) {
  const { response, data } = await adminFetchJson(path, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed with status ${response.status}.`);
  }

  return data || {};
}

function SectionHeading({ title, description, action = null }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="max-w-2xl text-sm text-neutral-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({ title, value, tone = 'blue', helperText }) {
  const style = STAT_CARD_STYLES[tone] || STAT_CARD_STYLES.blue;

  return (
    <div className={`rounded-3xl border px-5 py-5 ${style.container}`}>
      <p className="text-sm text-neutral-400">{title}</p>
      <p className={`mt-3 text-3xl font-semibold ${style.value}`}>{value}</p>
      {helperText ? <p className="mt-2 text-xs text-neutral-500">{helperText}</p> : null}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-800 py-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
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

  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">Admin analytics</p>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white">User Analytics</h1>
                <p className="max-w-3xl text-sm text-neutral-400">
                  Inspect customer value, segment quality, churn pressure, and activity signals without leaving the admin workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {VIEW_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setViewMode(tab.key)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                    viewMode === tab.key
                      ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100'
                      : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {viewMode === 'stats' ? (
          <section className="space-y-6">
            <SectionHeading
              title="Performance overview"
              description="Track the current balance between active readers, premium spend, and churn exposure."
            />

            {statsQuery.isError ? (
              <LoadingState.ErrorState
                error={getErrorMessage(statsQuery.error, 'Failed to load analytics overview.')}
                onRetry={() => statsQuery.refetch()}
              />
            ) : (
              <AdminDataState
                isLoading={statsQuery.isLoading}
                hasData={Boolean(stats)}
                emptyMessage="No analytics data is available yet."
                wrap={false}
              >
                {() => (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <StatCard title="Total users" value={formatNumber(stats?.totalUsers)} tone="blue" helperText="All registered accounts." />
                      <StatCard title="Active users" value={formatNumber(stats?.activeUsers)} tone="emerald" helperText="Users active in the current measurement window." />
                      <StatCard title="Active rate" value={formatPercent(stats?.activeRate)} tone="violet" helperText="Share of active users across the entire base." />
                      <StatCard title="High-value users" value={formatNumber(stats?.highValueUsers)} tone="amber" helperText="Users who cross the LTV threshold." />
                      <StatCard title="At-risk users" value={formatNumber(stats?.atRiskUsers)} tone="rose" helperText="Users currently flagged for churn intervention." />
                      <StatCard title="Total revenue" value={formatCurrency(stats?.totalRevenue)} tone="teal" helperText="Realized paid revenue attributed to tracked users." />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Retention outlook</p>
                        <p className="mt-3 text-sm leading-7 text-neutral-300">
                          {Number(stats?.atRiskUsers || 0) > 0
                            ? `${formatNumber(stats?.atRiskUsers)} users currently need targeted retention treatment.`
                            : 'No at-risk cohort is currently flagged in the latest analytics pass.'}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Revenue density</p>
                        <p className="mt-3 text-sm leading-7 text-neutral-300">
                          {Number(stats?.highValueUsers || 0) > 0
                            ? `${formatCurrency((Number(stats?.totalRevenue || 0)) / Number(stats?.highValueUsers || 1))} average revenue per high-value user.`
                            : 'High-value user revenue density will appear once qualifying users exist.'}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Activation pulse</p>
                        <p className="mt-3 text-sm leading-7 text-neutral-300">
                          {Number(stats?.activeUsers || 0) > 0
                            ? `${formatNumber(stats?.activeUsers)} users drove activity in the current cycle.`
                            : 'No recent activity was reported in the current analytics snapshot.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </AdminDataState>
            )}
          </section>
        ) : null}

        {viewMode === 'segments' ? (
          <section className="space-y-6">
            <SectionHeading
              title="Audience segments"
              description="Slice the user base, inspect spend quality, and jump into individual accounts from the same view."
            />

            <div className="flex flex-wrap gap-3">
              {SEGMENT_FILTERS.map((segment) => (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => {
                    setSelectedSegment(segment.key);
                    setPage(1);
                  }}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                    selectedSegment === segment.key
                      ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100'
                      : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:text-white'
                  }`}
                >
                  {segment.label}
                </button>
              ))}
            </div>

            {segmentsQuery.isError ? (
              <LoadingState.ErrorState
                error={getErrorMessage(segmentsQuery.error, 'Failed to load audience segments.')}
                onRetry={() => segmentsQuery.refetch()}
              />
            ) : (
              <AdminDataState
                isLoading={segmentsQuery.isLoading}
                hasData={users.length > 0}
                emptyMessage="No users match this segment yet."
                wrap={false}
              >
                {() => (
                  <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/80 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-neutral-800 text-sm">
                        <thead className="bg-neutral-950/80 text-left text-xs uppercase tracking-[0.16em] text-neutral-500">
                          <tr>
                            <th className="px-4 py-4">User</th>
                            <th className="px-4 py-4">Wallet</th>
                            <th className="px-4 py-4">LTV</th>
                            <th className="px-4 py-4">Reads</th>
                            <th className="px-4 py-4">Churn</th>
                            <th className="px-4 py-4">Joined</th>
                            <th className="px-4 py-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                          {users.map((segmentUser) => {
                            const metrics = segmentUser.userMetrics;
                            const behavior = segmentUser.userBehavior;

                            return (
                              <tr key={segmentUser.id} className="align-top transition hover:bg-neutral-900/90">
                                <td className="px-4 py-4">
                                  <div className="space-y-1">
                                    <p className="font-medium text-white">{segmentUser.email || 'Unknown email'}</p>
                                    <p className="text-xs text-neutral-500">{segmentUser.id}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-neutral-300">{formatNumber(segmentUser.wallet?.coins)}</td>
                                <td className="px-4 py-4 text-neutral-300">{formatCurrency(metrics?.ltv)}</td>
                                <td className="px-4 py-4 text-neutral-300">{formatNumber(behavior?.seriesViewed)}</td>
                                <td className="px-4 py-4">
                                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getChurnTone(metrics?.churnRisk)}`}>
                                    {String(metrics?.churnRisk || 'unknown').toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-neutral-400">{formatDate(segmentUser.createdAt)}</td>
                                <td className="px-4 py-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedUserId(segmentUser.id);
                                      setViewMode('user-detail');
                                    }}
                                    className="rounded-2xl border border-neutral-700 px-3 py-2 text-xs font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-950"
                                  >
                                    Inspect user
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <AdminListPagination
                      pagination={pagination}
                      page={page}
                      pageSize={pageSize}
                      onPageChange={setPage}
                      onPageSizeChange={(value) => {
                        setPageSize(value);
                        setPage(1);
                      }}
                      containerClassName="flex flex-col gap-3 border-t border-neutral-800 bg-neutral-950/70 px-4 py-4 text-sm text-neutral-400 lg:flex-row lg:items-center lg:justify-between"
                      pageSizeSelectClassName="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none"
                      buttonClassName="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}
              </AdminDataState>
            )}
          </section>
        ) : null}

        {viewMode === 'user-detail' ? (
          <section className="space-y-6">
            <SectionHeading
              title="User deep dive"
              description={`Detailed account diagnostics for the ${getSegmentLabel(selectedSegment).toLowerCase()} cohort.`}
              action={
                <button
                  type="button"
                  onClick={() => setViewMode('segments')}
                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
                >
                  Back to segments
                </button>
              }
            />

            {userDetailQuery.isError ? (
              <LoadingState.ErrorState
                error={getErrorMessage(userDetailQuery.error, 'Failed to load user analytics.')}
                onRetry={() => userDetailQuery.refetch()}
              />
            ) : (
              <AdminDataState
                isLoading={userDetailQuery.isLoading}
                hasData={Boolean(analytics && user)}
                emptyMessage={selectedUserId ? 'This user could not be found.' : 'Pick a user from the segment table to inspect details.'}
                wrap={false}
              >
                {() => (
                  <div className="grid gap-6 xl:grid-cols-[1.35fr,0.85fr]">
                    <div className="space-y-6 rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">User identity</p>
                        <h3 className="text-2xl font-semibold text-white">{user?.email || 'Unknown email'}</h3>
                        <p className="text-sm text-neutral-500">{user?.id}</p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <StatCard title="Lifetime value" value={formatCurrency(ltv?.ltv)} tone="blue" helperText={`Average order: ${formatCurrency(ltv?.avgOrderValue)}`} />
                        <StatCard title="Total spend" value={formatCurrency(ltv?.totalSpent)} tone="emerald" helperText={`${formatNumber(ltv?.totalOrders)} paid orders`} />
                        <StatCard title="Wallet balance" value={formatNumber(user?.wallet?.coins)} tone="violet" helperText="Current coin inventory." />
                        <StatCard title="Activity score" value={formatNumber(userBehavior?.activityScore)} tone="amber" helperText="Derived from reading and engagement behavior." />
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 px-5 py-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Monetization</p>
                          <div className="mt-4">
                            <DetailRow label="First order" value={formatDate(ltv?.firstOrderDate)} />
                            <DetailRow label="Last order" value={formatDate(ltv?.lastOrderDate)} />
                            <DetailRow label="Orders placed" value={formatNumber(ltv?.totalOrders)} />
                            <DetailRow label="Current segment" value={getSegmentLabel(selectedSegment)} />
                          </div>
                        </div>

                        <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 px-5 py-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Engagement</p>
                          <div className="mt-4">
                            <DetailRow label="Series viewed" value={formatNumber(userBehavior?.seriesViewed)} />
                            <DetailRow label="Reading minutes" value={formatNumber(Math.round(Number(userBehavior?.readingTime || 0) / 60))} />
                            <DetailRow label="Comments" value={formatNumber(userBehavior?.commentsCount)} />
                            <DetailRow label="Ratings" value={formatNumber(userBehavior?.ratingsCount)} />
                            <DetailRow label="Bookmarks" value={formatNumber(userBehavior?.bookmarksCount)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Retention status</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getChurnTone(analytics?.churnRisk)}`}>
                            {String(analytics?.churnRisk || 'unknown').toUpperCase()}
                          </span>
                          <span className="text-sm text-neutral-400">Last active {formatDate(userBehavior?.lastActiveAt)}</span>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-neutral-300">
                          {String(analytics?.churnRisk || '').toLowerCase() === 'high'
                            ? 'This account is drifting away and likely needs a win-back touchpoint.'
                            : String(analytics?.churnRisk || '').toLowerCase() === 'medium'
                              ? 'Activity is softening. Consider a promotional nudge or surfaced content.'
                              : 'Engagement looks healthy relative to the tracked retention model.'}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Quick facts</p>
                        <div className="mt-4">
                          <DetailRow label="Registered" value={formatDate(user?.createdAt)} />
                          <DetailRow label="Wallet coins" value={formatNumber(user?.wallet?.coins)} />
                          <DetailRow label="Wallet bonus" value={formatNumber(user?.wallet?.bonusCoins)} />
                          <DetailRow label="Last active" value={formatDate(userBehavior?.lastActiveAt)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </AdminDataState>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
