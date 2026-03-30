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
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'stats', label: 'Overview' },
  { value: 'by-segment', label: 'By segment' },
  { value: 'by-type', label: 'By type' },
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
  if (value === 'push') return 'Push';
  if (value === 'banner') return 'Banner';
  if (value === 'discount') return 'Discount';
  return 'Email';
}

function formatCampaignStatusLabel(value) {
  if (value === 'active') return 'Active';
  if (value === 'paused') return 'Paused';
  if (value === 'completed') return 'Completed';
  return 'Draft';
}

function formatSegmentLabel(value) {
  if (value === 'vip') return 'VIP readers';
  if (value === 'new') return 'New readers';
  if (value === 'at-risk') return 'At-risk readers';
  if (value === 'high-value') return 'High-value readers';
  return 'All readers';
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

function formatDate(value, fallback = 'Not scheduled') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
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
    throw new Error(data?.message || data?.error || `Request failed with status ${response.status}.`);
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
        title: 'Performance overview',
        description: 'A compact snapshot of budget, spend, revenue, and conversions inside the selected date range.',
      };
    case 'by-segment':
      return {
        title: 'Segment performance',
        description: 'Compare audience segments without turning the page into an analytics dashboard wall.',
      };
    case 'by-type':
      return {
        title: 'Type performance',
        description: 'See which delivery types are doing the work before you add more campaign noise.',
      };
    default:
      return {
        title: 'Campaign directory',
        description: 'Review live and draft campaigns with just the details operators actually need: scope, timing, spend, and outcome.',
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
      setFeedback({ type: 'success', message: 'Campaign created.' });
      await refreshAll();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Campaign creation failed.') });
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
      setFeedback({ type: 'success', message: 'Campaign deleted.' });
      await refreshAll();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Campaign deletion failed.') });
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
      setFeedback({ type: 'error', message: 'Campaign name is required.' });
      return;
    }

    if (budgetValue !== null && (!Number.isFinite(budgetValue) || budgetValue < 0)) {
      setFeedback({ type: 'error', message: 'Budget must be a valid non-negative number.' });
      return;
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      setFeedback({ type: 'error', message: 'End date cannot be earlier than the start date.' });
      return;
    }

    createCampaignMutation.mutate(formData);
  };

  const handleDeleteCampaign = () => {
    if (!selectedCampaign?.id) {
      setFeedback({ type: 'error', message: 'The selected campaign could not be identified.' });
      setIsDeleteModalOpen(false);
      return;
    }

    deleteCampaignMutation.mutate(selectedCampaign.id);
  };

  const tabContentMeta = tabMeta(viewMode);

  return (
    <AdminLayout
      title="Marketing"
      subtitle="Manage campaign planning and read the outcome without letting the page drift back into a noisy growth console."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Campaigns"
            value={formatNumber(metricSnapshot.totalCampaigns)}
            detail="The total number of campaigns currently in this workspace."
            tone="accent"
          />
          <AdminMetricCard
            label="Active now"
            value={formatNumber(metricSnapshot.activeCampaigns)}
            detail="Campaigns still running or scheduled to stay live."
          />
          <AdminMetricCard
            label="Budget in range"
            value={formatCurrency(metricSnapshot.totalBudget)}
            detail="Planned spend inside the selected reporting window."
          />
          <AdminMetricCard
            label="Average ROI"
            value={formatPercent(metricSnapshot.avgRoi)}
            detail="A quick directional read on the current portfolio."
          />
        </div>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <AdminPageSection
          title="Campaign controls"
          description="Switch views, update the reporting window, and create a new campaign from one calm control row."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => refreshAll()}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              <Button type="button" onClick={openCreateModal}>
                <Plus className="size-4" />
                New campaign
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
              <AdminFormField label="Start date">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(event) => setRangeValue('startDate', event.target.value)}
                  max={dateRange.endDate || undefined}
                  className={adminInputClassName}
                />
              </AdminFormField>
              <AdminFormField label="End date">
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
              emptyMessage="No campaigns are available for this view."
              wrap={false}
            >
              <AdminDataTable>
                <table className="min-w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">Campaign</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Audience</th>
                      <th className="px-4 py-4">Schedule</th>
                      <th className="px-4 py-4">Budget</th>
                      <th className="px-4 py-4">Outcome</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </AdminTableHeader>
                  <tbody>
                    {campaigns.map((campaign) => {
                      const metric = getCampaignMetrics(campaign);
                      const schedule =
                        campaign.startDate || campaign.endDate
                          ? `${formatDate(campaign.startDate, 'Any time')} to ${formatDate(campaign.endDate, 'Open ended')}`
                          : 'Not scheduled';

                      return (
                        <AdminTableRow key={campaign.id || campaign.name}>
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-950">
                                  {campaign.name || 'Untitled campaign'}
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
                                Created {formatDate(campaign.createdAt, 'Unknown')}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{schedule}</td>
                          <td className="px-4 py-4 text-slate-700">
                            <div className="space-y-1">
                              <p>Budget {formatCurrency(campaign.budget)}</p>
                              <p className="text-xs text-slate-500">
                                Spent {formatCurrency(campaign.spent)}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            <div className="space-y-1">
                              <p>Revenue {formatCurrency(metric.revenue)}</p>
                              <p className="text-xs text-slate-500">
                                {formatNumber(metric.converted)} conversions, ROI {formatPercent(metric.roi)}
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
                                ? 'Deleting...'
                                : 'Delete'}
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
              emptyMessage="No marketing performance summary is available for this range."
              wrap={false}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AdminMetricCard label="Total campaigns" value={formatNumber(stats?.totalCampaigns)} detail="Campaigns counted inside the selected window." tone="accent" />
                <AdminMetricCard label="Active campaigns" value={formatNumber(stats?.activeCampaigns)} detail="Campaigns currently active in the selected window." />
                <AdminMetricCard label="Total budget" value={formatCurrency(stats?.totalBudget)} detail="Planned campaign spend." />
                <AdminMetricCard label="Total spent" value={formatCurrency(stats?.totalSpent)} detail="Actual spend captured so far." />
                <AdminMetricCard label="Attributed revenue" value={formatCurrency(stats?.totalRevenue)} detail="Revenue currently attributed to these campaigns." />
                <AdminMetricCard label="Average ROI" value={formatPercent(stats?.avgRoi)} detail={`${formatNumber(stats?.totalConverted)} total conversions`} />
              </div>
            </AdminDataState>
          ) : null}

          {viewMode === 'by-segment' ? (
            <AdminDataState
              isLoading={segmentsQuery.isLoading}
              hasData={segments.length > 0}
              emptyMessage="No segment performance is available for this range."
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
                          Segment
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">
                          {formatSegmentLabel(segment.segment)}
                        </h3>
                      </div>
                      <AdminBadge tone="default">{formatNumber(segment.count)} campaigns</AdminBadge>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <AdminMetricCard label="Budget" value={formatCurrency(segment.budget)} detail="Planned spend." />
                      <AdminMetricCard label="Spent" value={formatCurrency(segment.spent)} detail="Actual spend." />
                      <AdminMetricCard label="Revenue" value={formatCurrency(segment.revenue)} detail="Attributed revenue." tone="accent" />
                      <AdminMetricCard label="Conversions" value={formatNumber(segment.converted)} detail="Completed outcomes." />
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
              emptyMessage="No type-level marketing performance is available for this range."
              wrap={false}
            >
              <AdminDataTable>
                <table className="min-w-full text-sm">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">Type</th>
                      <th className="px-4 py-4">Campaigns</th>
                      <th className="px-4 py-4">Budget</th>
                      <th className="px-4 py-4">Spent</th>
                      <th className="px-4 py-4">Revenue</th>
                      <th className="px-4 py-4">Conversions</th>
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
        title="New campaign"
        subtitle="Keep campaign setup direct: what it is, who it targets, and when it should run."
        onClose={() => setIsCreateModalOpen(false)}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Campaign name">
              <input
                value={formData.name}
                onChange={(event) => setFormValue('name', event.target.value)}
                className={adminInputClassName}
                placeholder="Spring comeback campaign"
              />
            </AdminFormField>

            <AdminFormField label="Audience segment">
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

            <AdminFormField label="Campaign type">
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

            <AdminFormField label="Status">
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

            <AdminFormField label="Budget">
              <input
                value={formData.budget}
                onChange={(event) => setFormValue('budget', event.target.value)}
                className={adminInputClassName}
                inputMode="decimal"
                placeholder="1500"
              />
            </AdminFormField>

            <AdminFormField label="Start date">
              <input
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormValue('startDate', event.target.value)}
                className={adminInputClassName}
              />
            </AdminFormField>

            <AdminFormField label="End date">
              <input
                type="date"
                value={formData.endDate}
                onChange={(event) => setFormValue('endDate', event.target.value)}
                className={adminInputClassName}
              />
            </AdminFormField>
          </div>

          <AdminFormField label="Notes">
            <textarea
              value={formData.description}
              onChange={(event) => setFormValue('description', event.target.value)}
              rows={5}
              className={adminTextareaClassName}
              placeholder="What this campaign is trying to change, and what operators should watch."
            />
          </AdminFormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateCampaign}
              disabled={createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? 'Creating...' : 'Create campaign'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title="Delete campaign"
        message={`Delete "${selectedCampaign?.name || 'this campaign'}"? This cannot be undone.`}
        confirmText={deleteCampaignMutation.isPending ? 'Deleting...' : 'Delete campaign'}
        cancelText="Cancel"
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

