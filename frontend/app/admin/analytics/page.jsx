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
  { value: 'stats', label: '总览' },
  { value: 'segments', label: '读者分群' },
  { value: 'user-detail', label: '用户详情' },
];

const SEGMENT_FILTERS = [
  { key: 'all', label: '全部读者' },
  { key: 'vip', label: 'VIP' },
  { key: 'high-value', label: '高价值用户' },
  { key: 'at-risk', label: '流失风险用户' },
];

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
    return '暂无';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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
    throw new Error(data?.message || data?.error || `请求失败，状态码 ${response.status}。`);
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
      label: '读者总数',
      value: formatNumber(stats?.totalUsers),
      detail: '当前已注册的读者账号总量。',
      tone: 'accent',
    },
    {
      label: '活跃读者',
      value: formatNumber(stats?.activeUsers),
      detail: '当前分析窗口内仍有活跃行为的账号。',
    },
    {
      label: '活跃率',
      value: formatPercent(stats?.activeRate),
      detail: '最近仍有活跃行为的读者占比。',
    },
    {
      label: '高价值读者',
      value: formatNumber(stats?.highValueUsers),
      detail: '已经跨过 LTV 阈值的账号数量。',
    },
    {
      label: '流失风险读者',
      value: formatNumber(stats?.atRiskUsers),
      detail: '近期可能需要留存干预的读者。',
    },
    {
      label: '已归因收入',
      value: formatCurrency(stats?.totalRevenue),
      detail: '当前已追踪读者样本对应的收入。',
    },
  ];

  return (
    <AdminShell
      title="用户分析"
      subtitle="先看整体读者状态，再下钻到分群或单个账号，不把页面做成吵闹的 KPI 墙。"
    >
      <div className="space-y-6">
        <AdminTabs items={VIEW_TABS} value={viewMode} onChange={setViewMode} />

        {viewMode === 'stats' ? (
          <AdminPageSection
            title="读者总览"
            description="在一个克制、清楚的工作区里查看读者规模、活跃情况、价值和流失风险。"
          >
            {statsQuery.isError ? (
              <AdminDataState
                isLoading={false}
                hasData={false}
                emptyMessage={getErrorMessage(statsQuery.error, '分析数据加载失败。')}
              />
            ) : (
              <AdminDataState
                isLoading={statsQuery.isLoading}
                hasData={Boolean(stats)}
                emptyMessage="当前还没有可用的分析数据。"
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
                        <p className="text-sm font-semibold text-slate-950">留存观察</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {Number(stats?.atRiskUsers || 0) > 0
                            ? `当前有 ${formatNumber(stats?.atRiskUsers)} 位读者看起来需要尽快做留存处理。`
                            : '当前最新快照里还没有明显的高风险流失信号。'}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
                        <p className="text-sm font-semibold text-slate-950">收入密度</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {Number(stats?.highValueUsers || 0) > 0
                            ? `高价值读者的人均消费约为 ${formatCurrency((Number(stats?.totalRevenue || 0)) / Number(stats?.highValueUsers || 1))}。`
                            : '等当前数据里出现高价值读者后，这里会自动更新。'}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
                        <p className="text-sm font-semibold text-slate-950">活跃脉搏</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {Number(stats?.activeUsers || 0) > 0
                            ? `当前窗口内有 ${formatNumber(stats?.activeUsers)} 位读者产生了近期活跃行为。`
                            : '最新快照里还没有记录到近期活跃行为。'}
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
            title="读者分群"
            description="先从一个读者分群看起，只有在需要更深细节时再打开单个账号。"
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
              errorMessage={getErrorMessage(segmentsQuery.error, '读者分群加载失败。')}
              onRetry={() => segmentsQuery.refetch()}
              isLoading={segmentsQuery.isLoading}
              hasItems={users.length > 0}
              emptyMessage="当前分群下还没有匹配的用户。"
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
                      <th className="px-4 py-4">读者</th>
                      <th className="px-4 py-4">钱包</th>
                      <th className="px-4 py-4">LTV</th>
                      <th className="px-4 py-4">浏览作品数</th>
                      <th className="px-4 py-4">流失风险</th>
                      <th className="px-4 py-4">加入时间</th>
                      <th className="px-4 py-4">操作</th>
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
                                {segmentUser.email || '未填写邮箱'}
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
                              打开用户
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
            title="用户详情"
            description={`查看当前“${getSegmentLabel(selectedSegment)}”分群里这个账号的具体情况。`}
            action={
              <Button type="button" variant="outline" onClick={() => setViewMode('segments')}>
                返回分群
              </Button>
            }
          >
            {userDetailQuery.isError ? (
              <AdminDataState
                isLoading={false}
                hasData={false}
                emptyMessage={getErrorMessage(userDetailQuery.error, '用户详情加载失败。')}
              />
            ) : (
              <AdminDataState
                isLoading={userDetailQuery.isLoading}
                hasData={Boolean(analytics && user)}
                emptyMessage={
                  selectedUserId
                    ? '没有找到这条用户记录。'
                    : '先从上面的分群表格里选择一个读者，再打开深度视图。'
                }
                wrap={false}
              >
                {() => (
                  <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
                    <div className="space-y-6">
                      <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          用户画像
                        </p>
                        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                          {user?.email || '未填写邮箱'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">{user?.id}</p>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <AdminMetricCard
                            label="生命周期价值"
                            value={formatCurrency(ltv?.ltv)}
                            detail={`平均订单金额：${formatCurrency(ltv?.avgOrderValue)}`}
                            tone="accent"
                          />
                          <AdminMetricCard
                            label="累计消费"
                            value={formatCurrency(ltv?.totalSpent)}
                            detail={`共记录 ${formatNumber(ltv?.totalOrders)} 笔订单`}
                          />
                          <AdminMetricCard
                            label="钱包余额"
                            value={formatNumber(user?.wallet?.coins)}
                            detail="当前点数余额。"
                          />
                          <AdminMetricCard
                            label="活跃评分"
                            value={formatNumber(userBehavior?.activityScore)}
                            detail="根据阅读和互动信号计算。"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                          <p className="text-sm font-semibold text-slate-950">消费记录</p>
                          <AdminKeyValueList
                            className="mt-4"
                            items={[
                              { label: '首单时间', value: formatDate(ltv?.firstOrderDate) },
                              { label: '最近订单', value: formatDate(ltv?.lastOrderDate) },
                              { label: '订单数', value: formatNumber(ltv?.totalOrders) },
                              { label: '当前分群', value: getSegmentLabel(selectedSegment) },
                            ]}
                          />
                        </div>
                        <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                          <p className="text-sm font-semibold text-slate-950">阅读行为</p>
                          <AdminKeyValueList
                            className="mt-4"
                            items={[
                              { label: '浏览作品数', value: formatNumber(userBehavior?.seriesViewed) },
                              {
                                label: '阅读时长',
                                value: `${formatNumber(Math.round(Number(userBehavior?.readingTime || 0) / 60))} 分钟`,
                              },
                              { label: '评论数', value: formatNumber(userBehavior?.commentsCount) },
                              { label: '评分数', value: formatNumber(userBehavior?.ratingsCount) },
                              { label: '书签数', value: formatNumber(userBehavior?.bookmarksCount) },
                            ]}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">留存状态</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              保持描述直接，让运营一眼就能看出风险程度。
                            </p>
                          </div>
                          <AdminBadge tone={getChurnTone(analytics?.churnRisk)}>
                            {formatChurnRiskLabel(analytics?.churnRisk)}
                          </AdminBadge>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-slate-600">
                          {String(analytics?.churnRisk || '').toLowerCase() === 'high'
                            ? '这个账号已经出现明显流失信号，近期很可能需要重新唤回。'
                            : String(analytics?.churnRisk || '').toLowerCase() === 'medium'
                              ? '活跃度正在走软，适合补一点更有针对性的发现流或轻量触达。'
                              : '按当前留存模型看，近期互动还算健康。'}
                        </p>
                      </div>

                      <div className="rounded-[28px] border border-black/8 bg-white/88 p-6 shadow-[var(--gush-shadow-soft)]">
                        <p className="text-sm font-semibold text-slate-950">快速信息</p>
                        <AdminKeyValueList
                          className="mt-4"
                          items={[
                            { label: '加入时间', value: formatDate(user?.createdAt) },
                            { label: '钱包余额', value: formatNumber(user?.wallet?.coins) },
                            { label: '赠送余额', value: formatNumber(user?.wallet?.bonusCoins) },
                            { label: '最近活跃', value: formatDate(userBehavior?.lastActiveAt) },
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

