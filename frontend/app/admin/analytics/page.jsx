'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { AdminListPagination } from '@/components/admin/common/AdminListPagination';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { adminFetchJson } from '@/lib/adminApiClient';

const VIEW_TABS = [
  { key: 'stats', label: '概览' },
  { key: 'segments', label: '用户分群' },
  { key: 'user-detail', label: '用户详情' },
];

const SEGMENT_FILTERS = [
  { key: 'all', label: '全部用户' },
  { key: 'vip', label: 'VIP 用户' },
  { key: 'high-value', label: '高价值用户' },
  { key: 'at-risk', label: '流失风险用户' },
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
  return new Intl.NumberFormat('zh-CN', {
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
    return '从未';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '日期无效';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function formatNumber(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('zh-CN').format(Number.isFinite(amount) ? amount : 0);
}

function getSegmentLabel(segment) {
  return SEGMENT_FILTERS.find((item) => item.key === segment)?.label || '自定义分群';
}

function formatChurnRiskLabel(churnRisk) {
  switch (String(churnRisk || '').toLowerCase()) {
    case 'low':
      return '低';
    case 'medium':
      return '中';
    case 'high':
      return '高';
    default:
      return '未知';
  }
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

  useEffect(() => {
    setPage(1);
    setSelectedUserId('');
  }, [selectedSegment]);

  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
               <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">后台分析</p>
               <div className="space-y-2">
                 <h1 className="text-3xl font-semibold tracking-tight text-white">用户分析</h1>
                 <p className="max-w-3xl text-sm text-neutral-400">
                   在后台中直接查看用户价值、分群质量、流失风险和活跃信号。
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
              title="表现概览"
              description="跟踪当前活跃读者、付费表现和流失风险之间的平衡。"
            />

            {statsQuery.isError ? (
              <LoadingState.ErrorState
                error={getErrorMessage(statsQuery.error, '分析概览加载失败。')}
                onRetry={() => statsQuery.refetch()}
              />
            ) : (
              <AdminDataState
                isLoading={statsQuery.isLoading}
                hasData={Boolean(stats)}
                emptyMessage="暂无分析数据。"
                wrap={false}
              >
                {() => (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <StatCard title="总用户数" value={formatNumber(stats?.totalUsers)} tone="blue" helperText="全部注册账号。" />
                      <StatCard title="活跃用户数" value={formatNumber(stats?.activeUsers)} tone="emerald" helperText="当前统计窗口内活跃的用户。" />
                      <StatCard title="活跃率" value={formatPercent(stats?.activeRate)} tone="violet" helperText="全部用户中的活跃占比。" />
                      <StatCard title="高价值用户" value={formatNumber(stats?.highValueUsers)} tone="amber" helperText="达到 LTV 阈值的用户。" />
                      <StatCard title="风险用户" value={formatNumber(stats?.atRiskUsers)} tone="rose" helperText="被标记为需要挽回的用户。" />
                      <StatCard title="总收入" value={formatCurrency(stats?.totalRevenue)} tone="teal" helperText="归因到已跟踪用户的实际付费收入。" />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">留存预警</p>
                        <p className="mt-3 text-sm leading-7 text-neutral-300">
                          {Number(stats?.atRiskUsers || 0) > 0
                            ? `当前有 ${formatNumber(stats?.atRiskUsers)} 位用户需要重点留存干预。`
                            : '最新分析中暂无被标记的高风险流失用户。'}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">收入密度</p>
                        <p className="mt-3 text-sm leading-7 text-neutral-300">
                          {Number(stats?.highValueUsers || 0) > 0
                            ? `当前高价值用户的人均收入为 ${formatCurrency((Number(stats?.totalRevenue || 0)) / Number(stats?.highValueUsers || 1))}。`
                            : '出现符合条件的高价值用户后，这里会显示收入密度。'}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">活跃脉冲</p>
                        <p className="mt-3 text-sm leading-7 text-neutral-300">
                          {Number(stats?.activeUsers || 0) > 0
                            ? `当前周期内共有 ${formatNumber(stats?.activeUsers)} 位用户产生过活跃行为。`
                            : '当前分析快照中没有发现近期活跃行为。'}
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
              title="用户分群"
              description="按用户群体切片查看付费质量，并可在同页快速进入单个用户详情。"
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
                error={getErrorMessage(segmentsQuery.error, '用户分群加载失败。')}
                onRetry={() => segmentsQuery.refetch()}
              />
            ) : (
              <AdminDataState
                isLoading={segmentsQuery.isLoading}
                hasData={users.length > 0}
                emptyMessage="当前分群下暂无用户。"
                wrap={false}
              >
                {() => (
                  <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/80 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-neutral-800 text-sm">
                        <thead className="bg-neutral-950/80 text-left text-xs uppercase tracking-[0.16em] text-neutral-500">
                          <tr>
                            <th className="px-4 py-4">用户</th>
                            <th className="px-4 py-4">钱包</th>
                            <th className="px-4 py-4">LTV</th>
                            <th className="px-4 py-4">阅读量</th>
                            <th className="px-4 py-4">流失风险</th>
                            <th className="px-4 py-4">注册时间</th>
                            <th className="px-4 py-4">操作</th>
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
                                    <p className="font-medium text-white">{segmentUser.email || '未知邮箱'}</p>
                                    <p className="text-xs text-neutral-500">{segmentUser.id}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-neutral-300">{formatNumber(segmentUser.wallet?.coins)}</td>
                                <td className="px-4 py-4 text-neutral-300">{formatCurrency(metrics?.ltv)}</td>
                                <td className="px-4 py-4 text-neutral-300">{formatNumber(behavior?.seriesViewed)}</td>
                                <td className="px-4 py-4">
                                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getChurnTone(metrics?.churnRisk)}`}>
                                     {formatChurnRiskLabel(metrics?.churnRisk)}
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
                                    查看用户
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
              title="用户深度分析"
              description={`查看「${getSegmentLabel(selectedSegment)}」分群下单个账号的详细诊断信息。`}
              action={
                <button
                  type="button"
                  onClick={() => setViewMode('segments')}
                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
                >
                  返回分群列表
                </button>
              }
            />

            {userDetailQuery.isError ? (
              <LoadingState.ErrorState
                error={getErrorMessage(userDetailQuery.error, '用户分析加载失败。')}
                onRetry={() => userDetailQuery.refetch()}
              />
            ) : (
              <AdminDataState
                isLoading={userDetailQuery.isLoading}
                hasData={Boolean(analytics && user)}
                emptyMessage={selectedUserId ? '未找到该用户。' : '请先从分群表格中选择一个用户查看详情。'}
                wrap={false}
              >
                {() => (
                  <div className="grid gap-6 xl:grid-cols-[1.35fr,0.85fr]">
                    <div className="space-y-6 rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-6 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
                      <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">用户身份</p>
                          <h3 className="text-2xl font-semibold text-white">{user?.email || '未知邮箱'}</h3>
                        <p className="text-sm text-neutral-500">{user?.id}</p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <StatCard title="生命周期价值" value={formatCurrency(ltv?.ltv)} tone="blue" helperText={`平均订单金额：${formatCurrency(ltv?.avgOrderValue)}`} />
                        <StatCard title="总消费" value={formatCurrency(ltv?.totalSpent)} tone="emerald" helperText={`${formatNumber(ltv?.totalOrders)} 笔支付订单`} />
                        <StatCard title="钱包余额" value={formatNumber(user?.wallet?.coins)} tone="violet" helperText="当前金币库存。" />
                        <StatCard title="活跃分" value={formatNumber(userBehavior?.activityScore)} tone="amber" helperText="根据阅读与互动行为推导。" />
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 px-5 py-5">
                           <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">付费信息</p>
                           <div className="mt-4">
                             <DetailRow label="首单时间" value={formatDate(ltv?.firstOrderDate)} />
                             <DetailRow label="最近下单" value={formatDate(ltv?.lastOrderDate)} />
                             <DetailRow label="下单次数" value={formatNumber(ltv?.totalOrders)} />
                             <DetailRow label="当前分群" value={getSegmentLabel(selectedSegment)} />
                           </div>
                         </div>

                         <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 px-5 py-5">
                           <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">互动行为</p>
                           <div className="mt-4">
                             <DetailRow label="浏览作品数" value={formatNumber(userBehavior?.seriesViewed)} />
                             <DetailRow label="阅读分钟数" value={formatNumber(Math.round(Number(userBehavior?.readingTime || 0) / 60))} />
                             <DetailRow label="评论数" value={formatNumber(userBehavior?.commentsCount)} />
                             <DetailRow label="评分数" value={formatNumber(userBehavior?.ratingsCount)} />
                             <DetailRow label="收藏数" value={formatNumber(userBehavior?.bookmarksCount)} />
                           </div>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">留存状态</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getChurnTone(analytics?.churnRisk)}`}>
                            {formatChurnRiskLabel(analytics?.churnRisk)}
                          </span>
                          <span className="text-sm text-neutral-400">最近活跃：{formatDate(userBehavior?.lastActiveAt)}</span>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-neutral-300">
                          {String(analytics?.churnRisk || '').toLowerCase() === 'high'
                            ? '该账号存在明显流失风险，建议尽快触发召回动作。'
                            : String(analytics?.churnRisk || '').toLowerCase() === 'medium'
                              ? '活跃度正在走弱，可以考虑发放优惠或增加内容曝光。'
                              : '结合当前留存模型来看，该用户互动状态相对健康。'}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">快速信息</p>
                        <div className="mt-4">
                          <DetailRow label="注册时间" value={formatDate(user?.createdAt)} />
                          <DetailRow label="钱包金币" value={formatNumber(user?.wallet?.coins)} />
                          <DetailRow label="奖励金币" value={formatNumber(user?.wallet?.bonusCoins)} />
                          <DetailRow label="最近活跃" value={formatDate(userBehavior?.lastActiveAt)} />
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
