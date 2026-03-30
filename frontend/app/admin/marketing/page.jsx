'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';

import { AdminLayout } from '../../../components/admin/AdminLayout';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { Modal } from '@/components/admin/common/Modal';
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
  adminSelectClassName,
  adminTextareaClassName,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminFetchJson } from '@/lib/adminApiClient';

const MARKETING_TABS = [
  { value: 'campaigns', label: '活动目录' },
  { value: 'stats', label: '总览' },
  { value: 'by-segment', label: '分人群' },
  { value: 'by-type', label: '分类型' },
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
  if (value === 'vip') return 'VIP 读者';
  if (value === 'new') return '新读者';
  if (value === 'at-risk') return '流失风险读者';
  if (value === 'high-value') return '高价值读者';
  return '全部读者';
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
      return 'success';
    case 'paused':
      return 'warning';
    case 'completed':
      return 'accent';
    default:
      return 'default';
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

function tabMeta(tabKey) {
  switch (tabKey) {
    case 'stats':
      return {
        title: '表现总览',
        description: '用紧凑视图看清所选时间范围内的预算、花费、收入和转化。',
      };
    case 'by-segment':
      return {
        title: '人群表现',
        description: '对比不同读者人群的效果，但别把页面做成一堵分析面板墙。',
      };
    case 'by-type':
      return {
        title: '类型表现',
        description: '先看哪种投放类型真正有效，再决定要不要继续增加活动噪音。',
      };
    default:
      return {
        title: '活动目录',
        description: '查看在线和草稿活动时，只保留运营真正需要的事实：范围、排期、花费和结果。',
      };
  }
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

  const metricSnapshot = useMemo(() => {
    const activeCampaigns = campaigns.filter(
      (campaign) => String(campaign?.status || '').toLowerCase() === 'active',
    ).length;

    return {
      totalCampaigns: stats?.totalCampaigns ?? campaigns.length,
      activeCampaigns: stats?.activeCampaigns ?? activeCampaigns,
      totalBudget: stats?.totalBudget ?? 0,
      avgRoi: stats?.avgRoi ?? 0,
    };
  }, [campaigns, stats]);

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
      setFeedback({ type: 'error', message: '请填写活动名称。' });
      return;
    }

    if (budgetValue !== null && (!Number.isFinite(budgetValue) || budgetValue < 0)) {
      setFeedback({ type: 'error', message: '预算必须是有效的非负数字。' });
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

  const tabContentMeta = tabMeta(viewMode);

  return (
    <AdminLayout
      title="营销活动"
      subtitle="在不让页面重新滑回吵闹增长后台的前提下，管理活动规划并读取结果。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="当前活动"
            value={formatNumber(metricSnapshot.totalCampaigns)}
            detail="当前工作区内活动总数。"
            tone="accent"
          />
          <AdminMetricCard
            label="进行中"
            value={formatNumber(metricSnapshot.activeCampaigns)}
            detail="仍在运行或排期内保持在线的活动。"
          />
          <AdminMetricCard
            label="当前预算"
            value={formatCurrency(metricSnapshot.totalBudget)}
            detail="所选统计时间范围内的计划预算。"
          />
          <AdminMetricCard
            label="平均 ROI"
            value={formatPercent(metricSnapshot.avgRoi)}
            detail="当前活动组合效果的快速方向判断。"
          />
        </div>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <AdminPageSection
          title="活动控制"
          description="用一行克制的控制区完成视图切换、时间范围调整和新建活动。"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => refreshAll()}>
                <RefreshCw className="size-4" />
                刷新
              </Button>
              <Button type="button" onClick={openCreateModal}>
                <Plus className="size-4" />
                新建活动
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
            <div className="space-y-3">
              <AdminTabs items={MARKETING_TABS} value={viewMode} onChange={setViewMode} />
              <p className="text-sm leading-6 text-slate-500">{tabContentMeta.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminFormField label="开始日期">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(event) => setRangeValue('startDate', event.target.value)}
                  max={dateRange.endDate || undefined}
                  className={adminInputClassName}
                />
              </AdminFormField>
              <AdminFormField label="结束日期">
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(event) => setRangeValue('endDate', event.target.value)}
                  min={dateRange.startDate || undefined}
                  className={adminInputClassName}
                />
              </AdminFormField>
            </div>
          </div>
        </AdminPageSection>

        <AdminPageSection title={tabContentMeta.title} description={tabContentMeta.description}>
          {viewMode === 'campaigns' ? (
            <AdminDataState
              isLoading={campaignsQuery.isLoading}
              hasData={campaigns.length > 0}
              emptyMessage="当前视图下还没有可用的活动。"
              wrap={false}
            >
              <AdminDataTable>
                <table className="min-w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">活动</th>
                      <th className="px-4 py-4">状态</th>
                      <th className="px-4 py-4">受众</th>
                      <th className="px-4 py-4">排期</th>
                      <th className="px-4 py-4">预算</th>
                      <th className="px-4 py-4">结果</th>
                      <th className="px-4 py-4 text-right">操作</th>
                    </tr>
                  </AdminTableHeader>
                  <tbody>
                    {campaigns.map((campaign) => {
                      const metric = getCampaignMetrics(campaign);
                      const schedule =
                        campaign.startDate || campaign.endDate
                          ? `${formatDate(campaign.startDate, '任意时间')} 至 ${formatDate(campaign.endDate, '未结束')}`
                          : '未安排';

                      return (
                        <AdminTableRow key={campaign.id || campaign.name}>
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-950">
                                  {campaign.name || '未命名活动'}
                                </p>
                                <AdminBadge tone="default">
                                  {formatCampaignTypeLabel(campaign.type)}
                                </AdminBadge>
                              </div>
                              {campaign.description ? (
                                <p className="max-w-md text-sm leading-6 text-slate-600">
                                  {campaign.description}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <AdminBadge tone={getStatusTone(campaign.status)}>
                              {formatCampaignStatusLabel(campaign.status)}
                            </AdminBadge>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            <div className="space-y-1">
                              <p>{formatSegmentLabel(campaign.targetSegment)}</p>
                              <p className="text-xs text-slate-500">
                                创建于 {formatDate(campaign.createdAt, '未知')}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{schedule}</td>
                          <td className="px-4 py-4 text-slate-700">
                            <div className="space-y-1">
                              <p>预算 {formatCurrency(campaign.budget)}</p>
                              <p className="text-xs text-slate-500">
                                已花费 {formatCurrency(campaign.spent)}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            <div className="space-y-1">
                              <p>收入 {formatCurrency(metric.revenue)}</p>
                              <p className="text-xs text-slate-500">
                                {formatNumber(metric.converted)} 次转化，ROI {formatPercent(metric.roi)}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setIsDeleteModalOpen(true);
                              }}
                              disabled={deleteCampaignMutation.isPending}
                            >
                              {deleteCampaignMutation.isPending && selectedCampaign?.id === campaign.id
                                ? '正在删除...'
                                : '删除'}
                            </Button>
                          </td>
                        </AdminTableRow>
                      );
                    })}
                  </tbody>
                </table>
              </AdminDataTable>
            </AdminDataState>
          ) : null}

          {viewMode === 'stats' ? (
            <AdminDataState
              isLoading={statsQuery.isLoading}
              hasData={Boolean(stats)}
              emptyMessage="当前时间范围内还没有可用的营销表现汇总。"
              wrap={false}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AdminMetricCard label="活动总数" value={formatNumber(stats?.totalCampaigns)} detail="当前时间窗口内统计到的活动数量。" tone="accent" />
                <AdminMetricCard label="进行中活动" value={formatNumber(stats?.activeCampaigns)} detail="当前时间窗口内仍在进行的活动。" />
                <AdminMetricCard label="总预算" value={formatCurrency(stats?.totalBudget)} detail="计划投入预算。" />
                <AdminMetricCard label="已花费" value={formatCurrency(stats?.totalSpent)} detail="目前已实际发生的花费。" />
                <AdminMetricCard label="归因收入" value={formatCurrency(stats?.totalRevenue)} detail="当前已归因到活动的收入。" />
                <AdminMetricCard label="平均 ROI" value={formatPercent(stats?.avgRoi)} detail={`累计 ${formatNumber(stats?.totalConverted)} 次转化`} />
              </div>
            </AdminDataState>
          ) : null}

          {viewMode === 'by-segment' ? (
            <AdminDataState
              isLoading={segmentsQuery.isLoading}
              hasData={segments.length > 0}
              emptyMessage="当前时间范围内还没有人群表现数据。"
              wrap={false}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                {segments.map((segment) => (
                  <div
                    key={segment.segment || 'unknown'}
                    className="rounded-[28px] border border-black/8 bg-white/88 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          人群
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">
                          {formatSegmentLabel(segment.segment)}
                        </h3>
                      </div>
                      <AdminBadge tone="default">{formatNumber(segment.count)} 个活动</AdminBadge>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <AdminMetricCard label="预算" value={formatCurrency(segment.budget)} detail="计划投入。" />
                      <AdminMetricCard label="已花费" value={formatCurrency(segment.spent)} detail="实际花费。" />
                      <AdminMetricCard label="收入" value={formatCurrency(segment.revenue)} detail="已归因收入。" tone="accent" />
                      <AdminMetricCard label="转化" value={formatNumber(segment.converted)} detail="完成结果数。" />
                    </div>
                  </div>
                ))}
              </div>
            </AdminDataState>
          ) : null}

          {viewMode === 'by-type' ? (
            <AdminDataState
              isLoading={typesQuery.isLoading}
              hasData={types.length > 0}
              emptyMessage="当前时间范围内还没有类型级别的营销表现数据。"
              wrap={false}
            >
              <AdminDataTable>
                <table className="min-w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">类型</th>
                      <th className="px-4 py-4">活动数</th>
                      <th className="px-4 py-4">预算</th>
                      <th className="px-4 py-4">已花费</th>
                      <th className="px-4 py-4">收入</th>
                      <th className="px-4 py-4">转化</th>
                    </tr>
                  </AdminTableHeader>
                  <tbody>
                    {types.map((typeRow) => (
                      <AdminTableRow key={typeRow.type || 'unknown'}>
                        <td className="px-4 py-4 font-medium text-slate-950">
                          {formatCampaignTypeLabel(typeRow.type)}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{formatNumber(typeRow.count)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(typeRow.budget)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(typeRow.spent)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(typeRow.revenue)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatNumber(typeRow.converted)}</td>
                      </AdminTableRow>
                    ))}
                  </tbody>
                </table>
              </AdminDataTable>
            </AdminDataState>
          ) : null}
        </AdminPageSection>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        title="新建活动"
        subtitle="把活动设置说清楚就够了：它是什么、面向谁、什么时候开始跑。"
        onClose={() => setIsCreateModalOpen(false)}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="活动名称">
              <input
                value={formData.name}
                onChange={(event) => setFormValue('name', event.target.value)}
                className={adminInputClassName}
                placeholder="春季回流活动"
              />
            </AdminFormField>

            <AdminFormField label="受众人群">
              <select
                value={formData.targetSegment}
                onChange={(event) => setFormValue('targetSegment', event.target.value)}
                className={adminSelectClassName}
              >
                {SEGMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatSegmentLabel(option)}
                  </option>
                ))}
              </select>
            </AdminFormField>

            <AdminFormField label="活动类型">
              <select
                value={formData.type}
                onChange={(event) => setFormValue('type', event.target.value)}
                className={adminSelectClassName}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatCampaignTypeLabel(option)}
                  </option>
                ))}
              </select>
            </AdminFormField>

            <AdminFormField label="状态">
              <select
                value={formData.status}
                onChange={(event) => setFormValue('status', event.target.value)}
                className={adminSelectClassName}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatCampaignStatusLabel(option)}
                  </option>
                ))}
              </select>
            </AdminFormField>

            <AdminFormField label="预算">
              <input
                value={formData.budget}
                onChange={(event) => setFormValue('budget', event.target.value)}
                className={adminInputClassName}
                inputMode="decimal"
                placeholder="1500"
              />
            </AdminFormField>

            <AdminFormField label="开始日期">
              <input
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormValue('startDate', event.target.value)}
                className={adminInputClassName}
              />
            </AdminFormField>

            <AdminFormField label="结束日期">
              <input
                type="date"
                value={formData.endDate}
                onChange={(event) => setFormValue('endDate', event.target.value)}
                className={adminInputClassName}
              />
            </AdminFormField>
          </div>

          <AdminFormField label="备注">
            <textarea
              value={formData.description}
              onChange={(event) => setFormValue('description', event.target.value)}
              rows={5}
              className={adminTextareaClassName}
              placeholder="简要写清这次活动想推动什么，以及运营需要重点观察什么。"
            />
          </AdminFormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              onClick={handleCreateCampaign}
              disabled={createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? '正在创建...' : '创建活动'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title="删除活动"
        message={`确定删除“${selectedCampaign?.name || '当前活动'}”吗？删除后无法恢复。`}
        confirmText={deleteCampaignMutation.isPending ? '正在删除...' : '删除活动'}
        cancelText="取消"
        isDangerous={true}
        isLoading={deleteCampaignMutation.isPending}
        onConfirm={handleDeleteCampaign}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedCampaign(null);
        }}
      />
    </AdminLayout>
  );
}
