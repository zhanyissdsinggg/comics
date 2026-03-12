'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { Modal } from '@/components/admin/common/Modal';
import { adminFetchJson } from '@/lib/adminApiClient';

const TABS = [
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'stats', label: 'Stats' },
  { key: 'by-segment', label: 'By segment' },
  { key: 'by-type', label: 'By type' },
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

function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatNumber(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US').format(Number.isFinite(amount) ? amount : 0);
}

function formatPercent(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(1)}%`;
}

function formatDate(value, fallback = 'Not scheduled') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-US', {
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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-200">Error</p>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="max-w-2xl text-sm text-red-100/85">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-400/20"
        >
          Retry
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
      setFeedback({ type: 'success', message: 'Campaign created.' });
      await refreshAll();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Failed to create campaign.') });
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
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Failed to delete campaign.') });
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
      setFeedback({ type: 'error', message: 'Campaign name is required.' });
      return;
    }

    if (budgetValue !== null && (!Number.isFinite(budgetValue) || budgetValue < 0)) {
      setFeedback({ type: 'error', message: 'Budget must be a valid non-negative number.' });
      return;
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      setFeedback({ type: 'error', message: 'End date must be on or after the start date.' });
      return;
    }

    createCampaignMutation.mutate(formData);
  };
  const handleDeleteCampaign = () => {
    if (!selectedCampaign?.id) {
      setFeedback({ type: 'error', message: 'Unable to resolve the selected campaign.' });
      setIsDeleteModalOpen(false);
      return;
    }
    deleteCampaignMutation.mutate(selectedCampaign.id);
  };

  let content = null;

  if (viewMode === 'campaigns') {
    if (campaignsQuery.isLoading) {
      content = <LoadingPanel message="Loading campaigns..." />;
    } else if (campaignsQuery.isError) {
      content = (
        <ErrorPanel
          title="Campaigns could not be loaded."
          message={getErrorMessage(campaignsQuery.error, 'Failed to load campaigns.')}
          onRetry={() => campaignsQuery.refetch()}
        />
      );
    } else {
      content = (
        <AdminDataState isLoading={false} hasData={campaigns.length > 0} emptyMessage="No campaigns yet." wrap={false}>
          <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/70 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-800 text-sm">
                <thead className="bg-neutral-950/60 text-left text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Campaign</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Audience</th>
                    <th className="px-5 py-4 font-semibold">Schedule</th>
                    <th className="px-5 py-4 font-semibold">Spend</th>
                    <th className="px-5 py-4 font-semibold">Outcome</th>
                    <th className="px-5 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {campaigns.map((campaign) => {
                    const metric = getCampaignMetrics(campaign);
                    const schedule = campaign.startDate || campaign.endDate
                      ? `${formatDate(campaign.startDate, 'Any time')} to ${formatDate(campaign.endDate, 'Open ended')}`
                      : 'Not scheduled';

                    return (
                      <tr key={campaign.id || campaign.name} className="align-top transition hover:bg-neutral-900/90">
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{campaign.name || 'Untitled campaign'}</p>
                              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                                {campaign.type || 'unknown'}
                              </span>
                            </div>
                            {campaign.description ? <p className="max-w-md text-sm text-neutral-400">{campaign.description}</p> : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusTone(campaign.status)}`}>
                            {campaign.status || 'draft'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-neutral-300">
                          <div className="space-y-1">
                            <p>{campaign.targetSegment || 'all'}</p>
                            <p className="text-xs text-neutral-500">Created {formatDate(campaign.createdAt, 'Unknown')}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-neutral-300">{schedule}</td>
                        <td className="px-5 py-4 text-neutral-300">
                          <div className="space-y-1">
                            <p>Budget {formatCurrency(campaign.budget)}</p>
                            <p className="text-xs text-neutral-500">Spent {formatCurrency(campaign.spent)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-neutral-300">
                          <div className="space-y-1">
                            <p>Revenue {formatCurrency(metric.revenue)}</p>
                            <p className="text-xs text-neutral-500">{formatNumber(metric.converted)} conversions and {formatPercent(metric.roi)} ROI</p>
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
                            {deleteCampaignMutation.isPending && selectedCampaign?.id === campaign.id ? 'Deleting...' : 'Delete'}
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
      content = <LoadingPanel message="Loading performance stats..." />;
    } else if (statsQuery.isError) {
      content = (
        <ErrorPanel
          title="Performance stats could not be loaded."
          message={getErrorMessage(statsQuery.error, 'Failed to load performance stats.')}
          onRetry={() => statsQuery.refetch()}
        />
      );
    } else {
      content = (
        <AdminDataState isLoading={false} hasData={Boolean(stats)} emptyMessage="No performance data for this range." wrap={false}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard title="Total campaigns" value={formatNumber(stats?.totalCampaigns)} helperText="All campaigns in range" />
            <StatCard title="Active campaigns" value={formatNumber(stats?.activeCampaigns)} helperText="Currently active" />
            <StatCard title="Total budget" value={formatCurrency(stats?.totalBudget)} helperText="Planned spend" />
            <StatCard title="Total spent" value={formatCurrency(stats?.totalSpent)} helperText="Actual spend" />
            <StatCard title="Total revenue" value={formatCurrency(stats?.totalRevenue)} helperText="Attributed revenue" />
            <StatCard title="Average ROI" value={formatPercent(stats?.avgRoi)} helperText={`${formatNumber(stats?.totalConverted)} total conversions`} />
          </div>
        </AdminDataState>
      );
    }
  } else if (viewMode === 'by-segment') {
    if (segmentsQuery.isLoading) {
      content = <LoadingPanel message="Loading segment totals..." />;
    } else if (segmentsQuery.isError) {
      content = (
        <ErrorPanel
          title="Segment totals could not be loaded."
          message={getErrorMessage(segmentsQuery.error, 'Failed to load segment totals.')}
          onRetry={() => segmentsQuery.refetch()}
        />
      );
    } else {
      content = (
        <AdminDataState isLoading={false} hasData={segments.length > 0} emptyMessage="No segment data for this range." wrap={false}>
          <div className="grid gap-4 xl:grid-cols-2">
            {segments.map((segment) => (
              <div key={segment.segment || 'unknown'} className="rounded-3xl border border-neutral-800 bg-neutral-900/75 px-5 py-5 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Segment</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{segment.segment || 'Unknown'}</h3>
                  </div>
                  <span className="rounded-full border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs text-neutral-300">
                    {formatNumber(segment.count)} campaigns
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <StatCard title="Budget" value={formatCurrency(segment.budget)} helperText="Planned" />
                  <StatCard title="Spent" value={formatCurrency(segment.spent)} helperText="Actual" />
                  <StatCard title="Revenue" value={formatCurrency(segment.revenue)} helperText="Attributed" />
                  <StatCard title="Conversions" value={formatNumber(segment.converted)} helperText="Completed actions" />
                </div>
              </div>
            ))}
          </div>
        </AdminDataState>
      );
    }
  } else if (typesQuery.isLoading) {
    content = <LoadingPanel message="Loading campaign type totals..." />;
  } else if (typesQuery.isError) {
    content = (
      <ErrorPanel
        title="Campaign type totals could not be loaded."
        message={getErrorMessage(typesQuery.error, 'Failed to load campaign type totals.')}
        onRetry={() => typesQuery.refetch()}
      />
    );
  } else {
    content = (
      <AdminDataState isLoading={false} hasData={types.length > 0} emptyMessage="No campaign type data for this range." wrap={false}>
        <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/70 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-800 text-sm">
              <thead className="bg-neutral-950/60 text-left text-xs uppercase tracking-[0.18em] text-neutral-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Campaigns</th>
                  <th className="px-5 py-4 font-semibold">Budget</th>
                  <th className="px-5 py-4 font-semibold">Spent</th>
                  <th className="px-5 py-4 font-semibold">Revenue</th>
                  <th className="px-5 py-4 font-semibold">Conversions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {types.map((typeRow) => (
                  <tr key={typeRow.type || 'unknown'} className="transition hover:bg-neutral-900/90">
                    <td className="px-5 py-4 font-medium text-white">{typeRow.type || 'unknown'}</td>
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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Marketing</h1>
          <p className="max-w-3xl text-sm text-neutral-400">
            Review live campaigns, compare rollups by segment and type, and launch or remove campaigns from one stable console.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => refreshAll()}
            className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
          >
            New campaign
          </button>
        </div>
      </div>

      <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Campaigns" value={campaignsQuery.isLoading ? '...' : formatNumber(stats?.totalCampaigns ?? campaigns.length)} helperText="Current campaign count" />
        <StatCard title="Active" value={statsQuery.isLoading ? '...' : statsQuery.isError ? '--' : formatNumber(stats?.activeCampaigns)} helperText="Campaigns running now" />
        <StatCard title="Budget" value={statsQuery.isLoading ? '...' : statsQuery.isError ? '--' : formatCurrency(stats?.totalBudget)} helperText="Budget across the selected range" />
        <StatCard title="Average ROI" value={statsQuery.isLoading ? '...' : statsQuery.isError ? '--' : formatPercent(stats?.avgRoi)} helperText="Latest aggregated ROI" />
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
            <Field label="Start date">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(event) => setRangeValue('startDate', event.target.value)}
                max={dateRange.endDate || undefined}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </Field>
            <Field label="End date">
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
          title={viewMode === 'campaigns' ? 'Campaign catalog' : viewMode === 'stats' ? 'Performance summary' : viewMode === 'by-segment' ? 'Performance by segment' : 'Performance by type'}
          description={viewMode === 'campaigns' ? 'Each row shows the latest campaign configuration, spend, revenue, and conversion snapshot.' : viewMode === 'stats' ? 'This rollup aggregates budgets, spend, revenue, and conversions for the selected date range.' : viewMode === 'by-segment' ? 'Compare audience segment performance across budgets, spend, and revenue.' : 'Compare delivery types so you can spot stronger channels quickly.'}
        />
        {content}
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !createCampaignMutation.isPending && setIsCreateModalOpen(false)}
        title="Create campaign"
        subtitle="Set the campaign basics now. Analytics will populate after delivery starts."
        size="xl"
      >
        <div className="space-y-5">
          {createCampaignMutation.isError ? <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{getErrorMessage(createCampaignMutation.error, 'Failed to create campaign.')}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Campaign name"><input type="text" value={formData.name} onChange={(event) => setFormValue('name', event.target.value)} placeholder="Summer launch" className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400" /></Field>
            <Field label="Budget" hint="Leave empty if the campaign does not have a fixed budget."><input type="number" min="0" step="0.01" value={formData.budget} onChange={(event) => setFormValue('budget', event.target.value)} placeholder="0.00" className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400" /></Field>
            <Field label="Type"><select value={formData.type} onChange={(event) => setFormValue('type', event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400">{TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="Status"><select value={formData.status} onChange={(event) => setFormValue('status', event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400">{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="Target segment"><select value={formData.targetSegment} onChange={(event) => setFormValue('targetSegment', event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400">{SEGMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="Start date"><input type="date" value={formData.startDate} onChange={(event) => setFormValue('startDate', event.target.value)} max={formData.endDate || undefined} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400" /></Field>
            <Field label="End date"><input type="date" value={formData.endDate} onChange={(event) => setFormValue('endDate', event.target.value)} min={formData.startDate || undefined} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400" /></Field>
          </div>
          <Field label="Description" hint="Optional internal context for operators."><textarea value={formData.description} onChange={(event) => setFormValue('description', event.target.value)} rows={4} placeholder="Short campaign summary" className="w-full rounded-3xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400" /></Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={createCampaignMutation.isPending} className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
            <button type="button" onClick={handleCreateCampaign} disabled={createCampaignMutation.isPending} className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">{createCampaignMutation.isPending ? 'Creating...' : 'Create campaign'}</button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleteCampaignMutation.isPending && setIsDeleteModalOpen(false)}
        title="Delete campaign"
        subtitle="This action cannot be undone."
        size="md"
      >
        <div className="space-y-5">
          <p className="text-sm text-neutral-300">{selectedCampaign?.name ? `Delete ${selectedCampaign.name}?` : 'Delete this campaign?'}</p>
          {deleteCampaignMutation.isError ? <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{getErrorMessage(deleteCampaignMutation.error, 'Failed to delete campaign.')}</div> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setIsDeleteModalOpen(false); setSelectedCampaign(null); }} disabled={deleteCampaignMutation.isPending} className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
            <button type="button" onClick={handleDeleteCampaign} disabled={deleteCampaignMutation.isPending} className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60">{deleteCampaignMutation.isPending ? 'Deleting...' : 'Delete campaign'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
