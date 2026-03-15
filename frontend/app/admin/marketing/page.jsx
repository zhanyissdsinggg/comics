'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { Modal } from '@/components/admin/common/Modal';
import { adminFetchJson } from '@/lib/adminApiClient';

const TABS = [
  { key: 'campaigns', label: '活动列表' },
  { key: 'stats', label: '统计概览' },
  { key: 'by-segment', label: '按人群' },
  { key: 'by-type', label: '按类型' },
];

const INITIAL_FORM = {
  name: '',
  description: '',
  type: 'email',
  status: 'draft',
  targetSegment: 'all',
  budget: '',
  startDate: '',
  endDate: '',
};

const EMPTY_FEEDBACK = { type: '', message: '' };

const TYPE_OPTIONS = ['email', 'push', 'banner', 'discount'];
const STATUS_OPTIONS = ['draft', 'active', 'paused', 'completed'];
const SEGMENT_OPTIONS = ['all', 'vip', 'new', 'at-risk', 'high-value'];

function formatCampaignTypeLabel(value) {
  if (value === 'push') return '推送';
  if (value === 'banner') return '横幅';
  if (value === 'discount') return '折扣';
  return '邮件';
}

function formatCampaignStatusLabel(value) {
  if (value === 'active') return '进行中';
  if (value === 'paused') return '已暂停';
  if (value === 'completed') return '已完成';
  return '草稿';
}

function formatSegmentLabel(value) {
  if (value === 'vip') return 'VIP 用户';
  if (value === 'new') return '新用户';
  if (value === 'at-risk') return '流失风险';
  if (value === 'high-value') return '高价值用户';
  return '全部用户';
}

function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatNumber(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('zh-CN').format(Number.isFinite(amount) ? amount : 0);
}

function formatPercent(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(1)}%`;
}

function formatDate(value, fallback = '未安排') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '日期无效';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function getStatusTone(status) {
  switch (String(status || '').toLowerCase()) {
    case 'active':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    case 'paused':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'completed':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
    default:
      return 'border-neutral-700 bg-neutral-900 text-neutral-300';
  }
}

function getCampaignMetrics(campaign) {
  const latest = Array.isArray(campaign?.analytics) ? campaign.analytics[0] : null;
  return {
    revenue: Number(latest?.revenue || 0),
    converted: Number(latest?.converted || 0),
    roi: Number(latest?.roi || 0),
  };
}

async function requestPayload(path, init = {}) {
  const { response, data } = await adminFetchJson(path, init);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `请求失败，状态码 ${response.status}。`);
  }
  return data || {};
}

function buildDateQuery(dateRange) {
  const params = new URLSearchParams();
  if (dateRange.startDate) params.set('startDate', dateRange.startDate);
  if (dateRange.endDate) params.set('endDate', dateRange.endDate);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildCampaignPayload(formData) {
  return {
    name: formData.name.trim(),
    description: formData.description.trim() || undefined,
    type: formData.type || 'email',
    status: formData.status || 'draft',
    targetSegment: formData.targetSegment || 'all',
    budget: formData.budget === '' ? undefined : Number(formData.budget),
    startDate: formData.startDate || undefined,
    endDate: formData.endDate || undefined,
  };
}

function StatCard({ title, value, helperText }) {
  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 px-5 py-5 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
      <p className="text-sm text-neutral-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {helperText ? <p className="mt-2 text-xs text-neutral-500">{helperText}</p> : null}
    </div>
  );
}

function SectionHeader({ title, description, action = null }) {
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
function LoadingPanel({ message }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-neutral-800 bg-neutral-900/60 px-6 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        <p className="text-sm text-neutral-400">{message}</p>
      </div>
    </div>
  );
}

function ErrorPanel({ title, message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/25 bg-red-500/10 px-5 py-5 text-red-100 shadow-[0_24px_80px_-36px_rgba(127,29,29,0.9)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-200">错误</p>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="max-w-2xl text-sm text-red-100/85">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-400/20"
        >
          重试
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, hint = '' }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</span>
      {children}
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </label>
  );
}

export default function AdminMarketingPage() {
  const [viewMode, setViewMode] = useState('campaigns');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const dateQuery = buildDateQuery(dateRange);

  const campaignsQuery = useQuery({
    queryKey: ['admin', 'marketing', 'campaigns'],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await requestPayload('/api/admin/marketing/campaigns', { cache: 'no-store' });
      return Array.isArray(data?.campaigns) ? data.campaigns : [];
    },
  });

  const statsQuery = useQuery({
    queryKey: ['admin', 'marketing', 'stats', dateQuery],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await requestPayload(`/api/admin/marketing/stats${dateQuery}`, { cache: 'no-store' });
      return data?.stats || null;
    },
  });

  const segmentsQuery = useQuery({
    queryKey: ['admin', 'marketing', 'segments', dateQuery],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await requestPayload(`/api/admin/marketing/stats/by-segment${dateQuery}`, { cache: 'no-store' });
      return Array.isArray(data?.segments) ? data.segments : [];
    },
  });

  const typesQuery = useQuery({
    queryKey: ['admin', 'marketing', 'types', dateQuery],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await requestPayload(`/api/admin/marketing/stats/by-type${dateQuery}`, { cache: 'no-store' });
      return Array.isArray(data?.types) ? data.types : [];
    },
  });

  const refreshAll = () =>
    Promise.all([
      campaignsQuery.refetch(),
      statsQuery.refetch(),
      segmentsQuery.refetch(),
      typesQuery.refetch(),
    ]);

  const createCampaignMutation = useMutation({
    mutationFn: async (draft) =>
      requestPayload('/api/admin/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCampaignPayload(draft)),
      }),
    onSuccess: async () => {
      setViewMode('campaigns');
      setIsCreateModalOpen(false);
      setFormData(INITIAL_FORM);
      setFeedback({ type: 'success', message: '活动已创建。' });
      await refreshAll();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '创建活动失败。') });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId) =>
      requestPayload(`/api/admin/marketing/campaigns/${campaignId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      setIsDeleteModalOpen(false);
      setSelectedCampaign(null);
      setFeedback({ type: 'success', message: '活动已删除。' });
      await refreshAll();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '删除活动失败。') });
    },
  });

  const campaigns = Array.isArray(campaignsQuery.data) ? campaignsQuery.data : [];
  const stats = statsQuery.data;
  const segments = Array.isArray(segmentsQuery.data) ? segmentsQuery.data : [];
  const types = Array.isArray(typesQuery.data) ? typesQuery.data : [];

  const setFormValue = (key, value) => setFormData((current) => ({ ...current, [key]: value }));
  const setRangeValue = (key, value) => setDateRange((current) => ({ ...current, [key]: value }));

  const openCreateModal = () => {
    setFeedback(EMPTY_FEEDBACK);
    setFormData(INITIAL_FORM);
    setIsCreateModalOpen(true);
  };

  const handleCreateCampaign = () => {
    const budgetValue = formData.budget === '' ? null : Number(formData.budget);

    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: '活动名称不能为空。' });
      return;
    }

    if (budgetValue !== null && (!Number.isFinite(budgetValue) || budgetValue < 0)) {
      setFeedback({ type: 'error', message: '预算必须是合法的非负数。' });
      return;
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      setFeedback({ type: 'error', message: '结束日期不能早于开始日期。' });
      return;
    }

    createCampaignMutation.mutate(formData);
  };
  const handleDeleteCampaign = () => {
    if (!selectedCampaign?.id) {
      setFeedback({ type: 'error', message: '无法识别当前选中的活动。' });
      setIsDeleteModalOpen(false);
      return;
    }
    deleteCampaignMutation.mutate(selectedCampaign.id);
  };

  let content = null;

  if (viewMode === 'campaigns') {
    if (campaignsQuery.isLoading) {
      content = <LoadingPanel message="活动加载中..." />;
    } else if (campaignsQuery.isError) {
      content = (
        <ErrorPanel
          title="活动列表加载失败"
          message={getErrorMessage(campaignsQuery.error, '活动加载失败。')}
          onRetry={() => campaignsQuery.refetch()}
        />
      );
    } else {
      content = (
        <AdminDataState isLoading={false} hasData={campaigns.length > 0} emptyMessage="暂无活动。" wrap={false}>
          <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/70 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-800 text-sm">
                <thead className="bg-neutral-950/60 text-left text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">活动</th>
                    <th className="px-5 py-4 font-semibold">状态</th>
                    <th className="px-5 py-4 font-semibold">目标人群</th>
                    <th className="px-5 py-4 font-semibold">排期</th>
                    <th className="px-5 py-4 font-semibold">花费</th>
                    <th className="px-5 py-4 font-semibold">结果</th>
                    <th className="px-5 py-4 font-semibold text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {campaigns.map((campaign) => {
                    const metric = getCampaignMetrics(campaign);
                    const schedule = campaign.startDate || campaign.endDate
                      ? `${formatDate(campaign.startDate, '任意时间')} 至 ${formatDate(campaign.endDate, '长期有效')}`
                      : '未安排';

                    return (
                      <tr key={campaign.id || campaign.name} className="align-top transition hover:bg-neutral-900/90">
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{campaign.name || '未命名活动'}</p>
                              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                                {formatCampaignTypeLabel(campaign.type)}
                              </span>
                            </div>
                            {campaign.description ? <p className="max-w-md text-sm text-neutral-400">{campaign.description}</p> : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusTone(campaign.status)}`}>
                            {formatCampaignStatusLabel(campaign.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-neutral-300">
                          <div className="space-y-1">
                            <p>{formatSegmentLabel(campaign.targetSegment)}</p>
                            <p className="text-xs text-neutral-500">创建于 {formatDate(campaign.createdAt, '未知')}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-neutral-300">{schedule}</td>
                        <td className="px-5 py-4 text-neutral-300">
                          <div className="space-y-1">
                            <p>预算 {formatCurrency(campaign.budget)}</p>
                            <p className="text-xs text-neutral-500">已花费 {formatCurrency(campaign.spent)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-neutral-300">
                          <div className="space-y-1">
                            <p>收入 {formatCurrency(metric.revenue)}</p>
                            <p className="text-xs text-neutral-500">{formatNumber(metric.converted)} 次转化，ROI {formatPercent(metric.roi)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setIsDeleteModalOpen(true);
                            }}
                            disabled={deleteCampaignMutation.isPending}
                            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deleteCampaignMutation.isPending && selectedCampaign?.id === campaign.id ? '删除中...' : '删除'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </AdminDataState>
      );
    }
  } else if (viewMode === 'stats') {
    if (statsQuery.isLoading) {
      content = <LoadingPanel message="统计数据加载中..." />;
    } else if (statsQuery.isError) {
      content = (
        <ErrorPanel
          title="统计概览加载失败"
          message={getErrorMessage(statsQuery.error, '统计数据加载失败。')}
          onRetry={() => statsQuery.refetch()}
        />
      );
    } else {
      content = (
        <AdminDataState isLoading={false} hasData={Boolean(stats)} emptyMessage="当前时间范围暂无统计数据。" wrap={false}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard title="活动总数" value={formatNumber(stats?.totalCampaigns)} helperText="当前范围内的全部活动" />
            <StatCard title="进行中活动" value={formatNumber(stats?.activeCampaigns)} helperText="当前仍在运行" />
            <StatCard title="总预算" value={formatCurrency(stats?.totalBudget)} helperText="计划投入" />
            <StatCard title="总花费" value={formatCurrency(stats?.totalSpent)} helperText="实际消耗" />
            <StatCard title="总收入" value={formatCurrency(stats?.totalRevenue)} helperText="归因收入" />
            <StatCard title="平均 ROI" value={formatPercent(stats?.avgRoi)} helperText={`${formatNumber(stats?.totalConverted)} 次总转化`} />
          </div>
        </AdminDataState>
      );
    }
  } else if (viewMode === 'by-segment') {
    if (segmentsQuery.isLoading) {
      content = <LoadingPanel message="人群数据加载中..." />;
    } else if (segmentsQuery.isError) {
      content = (
        <ErrorPanel
          title="人群统计加载失败"
          message={getErrorMessage(segmentsQuery.error, '人群统计加载失败。')}
          onRetry={() => segmentsQuery.refetch()}
        />
      );
    } else {
      content = (
        <AdminDataState isLoading={false} hasData={segments.length > 0} emptyMessage="当前时间范围暂无人群数据。" wrap={false}>
          <div className="grid gap-4 xl:grid-cols-2">
            {segments.map((segment) => (
              <div key={segment.segment || 'unknown'} className="rounded-3xl border border-neutral-800 bg-neutral-900/75 px-5 py-5 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">人群</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{formatSegmentLabel(segment.segment)}</h3>
                  </div>
                  <span className="rounded-full border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs text-neutral-300">
                    {formatNumber(segment.count)} 个活动
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <StatCard title="预算" value={formatCurrency(segment.budget)} helperText="计划投入" />
                  <StatCard title="花费" value={formatCurrency(segment.spent)} helperText="实际消耗" />
                  <StatCard title="收入" value={formatCurrency(segment.revenue)} helperText="归因结果" />
                  <StatCard title="转化" value={formatNumber(segment.converted)} helperText="已完成动作" />
                </div>
              </div>
            ))}
          </div>
        </AdminDataState>
      );
    }
  } else if (typesQuery.isLoading) {
    content = <LoadingPanel message="活动类型数据加载中..." />;
  } else if (typesQuery.isError) {
    content = (
      <ErrorPanel
        title="活动类型统计加载失败"
        message={getErrorMessage(typesQuery.error, '活动类型统计加载失败。')}
        onRetry={() => typesQuery.refetch()}
      />
    );
  } else {
    content = (
      <AdminDataState isLoading={false} hasData={types.length > 0} emptyMessage="当前时间范围暂无活动类型数据。" wrap={false}>
        <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/70 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-800 text-sm">
              <thead className="bg-neutral-950/60 text-left text-xs uppercase tracking-[0.18em] text-neutral-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">类型</th>
                  <th className="px-5 py-4 font-semibold">活动数</th>
                  <th className="px-5 py-4 font-semibold">预算</th>
                  <th className="px-5 py-4 font-semibold">花费</th>
                  <th className="px-5 py-4 font-semibold">收入</th>
                  <th className="px-5 py-4 font-semibold">转化</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {types.map((typeRow) => (
                  <tr key={typeRow.type || 'unknown'} className="transition hover:bg-neutral-900/90">
                    <td className="px-5 py-4 font-medium text-white">{formatCampaignTypeLabel(typeRow.type)}</td>
                    <td className="px-5 py-4 text-neutral-300">{formatNumber(typeRow.count)}</td>
                    <td className="px-5 py-4 text-neutral-300">{formatCurrency(typeRow.budget)}</td>
                    <td className="px-5 py-4 text-neutral-300">{formatCurrency(typeRow.spent)}</td>
                    <td className="px-5 py-4 text-neutral-300">{formatCurrency(typeRow.revenue)}</td>
                    <td className="px-5 py-4 text-neutral-300">{formatNumber(typeRow.converted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminDataState>
    );
  }
  return (
    <div className="space-y-6 p-6 text-neutral-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">后台</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">营销中心</h1>
          <p className="max-w-3xl text-sm text-neutral-400">
            在一个稳定的后台页面里查看活动、对比人群与类型汇总，并完成创建和删除。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => refreshAll()}
            className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800"
          >
            刷新
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
          >
            新建活动
          </button>
        </div>
      </div>

      <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="活动总数" value={campaignsQuery.isLoading ? '...' : formatNumber(stats?.totalCampaigns ?? campaigns.length)} helperText="当前活动数量" />
        <StatCard title="进行中" value={statsQuery.isLoading ? '...' : statsQuery.isError ? '--' : formatNumber(stats?.activeCampaigns)} helperText="当前在运行的活动" />
        <StatCard title="预算" value={statsQuery.isLoading ? '...' : statsQuery.isError ? '--' : formatCurrency(stats?.totalBudget)} helperText="当前范围内预算" />
        <StatCard title="平均 ROI" value={statsQuery.isLoading ? '...' : statsQuery.isError ? '--' : formatPercent(stats?.avgRoi)} helperText="最新汇总 ROI" />
      </div>

      <div className="rounded-3xl border border-neutral-800 bg-neutral-950/60 p-4 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const active = viewMode === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setViewMode(tab.key)}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${active ? 'bg-white text-neutral-950' : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600 hover:text-white'}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[340px]">
            <Field label="开始日期">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(event) => setRangeValue('startDate', event.target.value)}
                max={dateRange.endDate || undefined}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </Field>
            <Field label="结束日期">
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(event) => setRangeValue('endDate', event.target.value)}
                min={dateRange.startDate || undefined}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </Field>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <SectionHeader
          title={viewMode === 'campaigns' ? '活动列表' : viewMode === 'stats' ? '表现概览' : viewMode === 'by-segment' ? '按人群表现' : '按类型表现'}
          description={viewMode === 'campaigns' ? '每一行展示活动的最新配置、花费、收入和转化快照。' : viewMode === 'stats' ? '这里会汇总所选日期范围内的预算、花费、收入和转化。' : viewMode === 'by-segment' ? '对比不同用户人群在预算、花费和收入上的表现。' : '对比不同投放类型，快速发现更强的渠道。'}
        />
        {content}
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !createCampaignMutation.isPending && setIsCreateModalOpen(false)}
        title="新建活动"
        subtitle="先配置活动基础信息，数据开始回流后再补充分析。"
        size="xl"
      >
        <div className="space-y-5">
          {createCampaignMutation.isError ? <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{getErrorMessage(createCampaignMutation.error, '创建活动失败。')}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="活动名称"><input type="text" value={formData.name} onChange={(event) => setFormValue('name', event.target.value)} placeholder="暑期活动" className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400" /></Field>
            <Field label="预算" hint="如果活动没有固定预算，可以留空。"><input type="number" min="0" step="0.01" value={formData.budget} onChange={(event) => setFormValue('budget', event.target.value)} placeholder="0.00" className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400" /></Field>
            <Field label="类型"><select value={formData.type} onChange={(event) => setFormValue('type', event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400">{TYPE_OPTIONS.map((option) => <option key={option} value={option}>{formatCampaignTypeLabel(option)}</option>)}</select></Field>
            <Field label="状态"><select value={formData.status} onChange={(event) => setFormValue('status', event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400">{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{formatCampaignStatusLabel(option)}</option>)}</select></Field>
            <Field label="目标人群"><select value={formData.targetSegment} onChange={(event) => setFormValue('targetSegment', event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400">{SEGMENT_OPTIONS.map((option) => <option key={option} value={option}>{formatSegmentLabel(option)}</option>)}</select></Field>
            <Field label="开始日期"><input type="date" value={formData.startDate} onChange={(event) => setFormValue('startDate', event.target.value)} max={formData.endDate || undefined} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400" /></Field>
            <Field label="结束日期"><input type="date" value={formData.endDate} onChange={(event) => setFormValue('endDate', event.target.value)} min={formData.startDate || undefined} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400" /></Field>
          </div>
          <Field label="描述" hint="给后台操作员看的内部备注，可选。"><textarea value={formData.description} onChange={(event) => setFormValue('description', event.target.value)} rows={4} placeholder="简短活动说明" className="w-full rounded-3xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400" /></Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={createCampaignMutation.isPending} className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">取消</button>
            <button type="button" onClick={handleCreateCampaign} disabled={createCampaignMutation.isPending} className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">{createCampaignMutation.isPending ? '创建中...' : '创建活动'}</button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleteCampaignMutation.isPending && setIsDeleteModalOpen(false)}
        title="删除活动"
        subtitle="此操作无法撤销。"
        size="md"
      >
        <div className="space-y-5">
          <p className="text-sm text-neutral-300">{selectedCampaign?.name ? `确定删除 ${selectedCampaign.name} 吗？` : '确定删除这个活动吗？'}</p>
          {deleteCampaignMutation.isError ? <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{getErrorMessage(deleteCampaignMutation.error, '删除活动失败。')}</div> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setIsDeleteModalOpen(false); setSelectedCampaign(null); }} disabled={deleteCampaignMutation.isPending} className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">取消</button>
            <button type="button" onClick={handleDeleteCampaign} disabled={deleteCampaignMutation.isPending} className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60">{deleteCampaignMutation.isPending ? '删除中...' : '删除活动'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
