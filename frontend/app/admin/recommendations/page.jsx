'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { Modal } from '@/components/admin/common/Modal';
import {
  AdminBadge,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  AdminTabs,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminFetchJson } from '@/lib/adminApiClient';
import {
  STOREFRONT_SLOT_PRESETS,
  getStorefrontSlotDisplayMeta,
  getStorefrontSlotPreset,
} from '@/lib/storefrontSlots';

const VIEW_TABS = [
  { value: 'slots', label: 'Slots' },
  { value: 'rankings', label: 'Rankings' },
  { value: 'analytics', label: 'Analytics' },
];

const RANKING_TYPE_OPTIONS = [
  { value: 'views', label: 'Views' },
  { value: 'rating', label: 'Rating' },
  { value: 'trending', label: 'Trending' },
  { value: 'ratingCount', label: 'Rating count' },
];

const TIME_RANGE_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All time' },
];

const SERIES_TYPE_OPTIONS = [
  { value: 'all', label: 'All titles' },
  { value: 'comic', label: 'Comics' },
  { value: 'novel', label: 'Novels' },
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
];

const ANALYTICS_SLOT_FILTER_OPTIONS = [
  { value: 'all', label: 'All slots' },
  ...STOREFRONT_SLOT_PRESETS.filter((item) => item.token !== 'custom').map((item) => ({
    value: item.token,
    label: item.label,
  })),
];

const EMPTY_FEEDBACK = { type: '', message: '' };

const INITIAL_SLOT_FORM = {
  preset: 'library-return',
  slotToken: 'library-return',
  seriesIdsText: '',
};

const INITIAL_RANKING_FORM = {
  name: '',
  rankingType: 'views',
  timeRange: 'day',
  seriesType: 'all',
  maxItems: '20',
  adult: false,
  active: true,
};

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function parseSeriesIds(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildSlotPayload(form) {
  const presetToken = String(form.preset || '').trim();
  const slotToken = presetToken && presetToken !== 'custom' ? presetToken : String(form.slotToken || '').trim();

  return {
    slot: slotToken,
    seriesIds: parseSeriesIds(form.seriesIdsText),
  };
}

function buildRankingPayload(form) {
  return {
    name: String(form.name || '').trim(),
    rankingType: String(form.rankingType || 'views').trim(),
    timeRange: String(form.timeRange || 'day').trim(),
    seriesType: String(form.seriesType || 'all').trim(),
    maxItems: Number.parseInt(String(form.maxItems || '20'), 10),
    adult: Boolean(form.adult),
    active: Boolean(form.active),
  };
}

function formatRankingTypeLabel(value) {
  return RANKING_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Unknown';
}

function formatTimeRangeLabel(value) {
  return TIME_RANGE_OPTIONS.find((option) => option.value === value)?.label || 'Unknown';
}

function formatSeriesTypeLabel(value) {
  return SERIES_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Unknown';
}

function formatDateTime(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  return `${numericValue.toFixed(2)}%`;
}

function SlotIdentity({ slotKey, itemId = '', hint = '' }) {
  const slotMeta = getStorefrontSlotDisplayMeta(slotKey);
  const resolvedHint = hint || slotMeta.hint;

  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold text-slate-950">{slotMeta.label}</div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-3 py-1 font-mono text-slate-600">
          {slotMeta.token}
        </span>
        {itemId ? (
          <span className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-3 py-1 font-mono text-slate-500">
            {itemId}
          </span>
        ) : null}
      </div>
      {resolvedHint ? <p className="text-sm leading-6 text-slate-600">{resolvedHint}</p> : null}
    </div>
  );
}

function RecommendationCard({ title, description, meta = null, footer = null, children }) {
  return (
    <article className="rounded-[26px] border border-black/8 bg-white/86 p-5 shadow-[var(--gush-shadow-soft)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {meta}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? <div className="mt-4 border-t border-black/6 pt-4">{footer}</div> : null}
    </article>
  );
}

export default function AdminRecommendationsPage() {
  const [activeTab, setActiveTab] = useState('slots');
  const [loadedTabs, setLoadedTabs] = useState({
    slots: true,
    rankings: false,
    analytics: false,
  });
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [createTarget, setCreateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [slotForm, setSlotForm] = useState(INITIAL_SLOT_FORM);
  const [rankingForm, setRankingForm] = useState(INITIAL_RANKING_FORM);
  const [analyticsSlotFilter, setAnalyticsSlotFilter] = useState('all');

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setLoadedTabs((current) =>
      current[nextTab]
        ? current
        : {
            ...current,
            [nextTab]: true,
          },
    );
  };

  const slotsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'slots'],
    staleTime: 60_000,
    queryFn: async () => {
      const { response, data } = await adminFetchJson('/api/admin/recommendations/slots?limit=100');

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Recommendation slots could not be loaded.');
      }

      return {
        items: Array.isArray(data?.slots) ? data.slots : [],
        total: Number(data?.total || 0),
      };
    },
  });

  const rankingsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'rankings'],
    enabled: loadedTabs.rankings,
    staleTime: 60_000,
    queryFn: async () => {
      const { response, data } = await adminFetchJson('/api/admin/recommendations/rankings?limit=100');

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Ranking settings could not be loaded.');
      }

      return {
        items: Array.isArray(data?.configs) ? data.configs : [],
        total: Number(data?.total || 0),
      };
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'analytics', analyticsSlotFilter],
    enabled: loadedTabs.analytics,
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (analyticsSlotFilter !== 'all') {
        params.set('slot', analyticsSlotFilter);
      }

      const { response, data } = await adminFetchJson(`/api/admin/recommendations/analytics?${params.toString()}`);

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Recommendation analytics could not be loaded.');
      }

      return {
        items: Array.isArray(data?.analytics) ? data.analytics : [],
        total: Number(data?.total || 0),
      };
    },
  });

  const createSlotMutation = useMutation({
    mutationFn: async () => {
      const payload = buildSlotPayload(slotForm);

      if (!payload.slot) {
        throw new Error('A slot token is required.');
      }

      const { response, data } = await adminFetchJson('/api/admin/recommendations/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'The slot could not be created.');
      }

      return data?.slot || null;
    },
    onSuccess: async () => {
      setCreateTarget(null);
      setSlotForm(INITIAL_SLOT_FORM);
      setFeedback({ type: 'success', message: 'The recommendation slot was created.' });
      await slotsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'The slot could not be created.') });
    },
  });

  const createRankingMutation = useMutation({
    mutationFn: async () => {
      const payload = buildRankingPayload(rankingForm);

      if (!payload.name) {
        throw new Error('A ranking name is required.');
      }

      if (!Number.isInteger(payload.maxItems) || payload.maxItems < 1 || payload.maxItems > 200) {
        throw new Error('Max items must stay between 1 and 200.');
      }

      const { response, data } = await adminFetchJson('/api/admin/recommendations/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'The ranking could not be created.');
      }

      return data?.config || null;
    },
    onSuccess: async () => {
      setCreateTarget(null);
      setRankingForm(INITIAL_RANKING_FORM);
      setFeedback({ type: 'success', message: 'The ranking configuration was created.' });
      await rankingsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'The ranking could not be created.') });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId) => {
      const { response, data } = await adminFetchJson(`/api/admin/recommendations/slots/${slotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'The slot could not be removed.');
      }

      return data;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setFeedback({ type: 'success', message: 'The recommendation slot was removed.' });
      await slotsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'The slot could not be removed.') });
    },
  });

  const deleteRankingMutation = useMutation({
    mutationFn: async (rankingId) => {
      const { response, data } = await adminFetchJson(`/api/admin/recommendations/rankings/${rankingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'The ranking could not be removed.');
      }

      return data;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setFeedback({ type: 'success', message: 'The ranking configuration was removed.' });
      await rankingsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'The ranking could not be removed.') });
    },
  });

  const slots = slotsQuery.data?.items || [];
  const rankings = rankingsQuery.data?.items || [];
  const analytics = analyticsQuery.data?.items || [];
  const selectedSlotMeta = useMemo(
    () => getStorefrontSlotDisplayMeta(slotForm.preset === 'custom' ? slotForm.slotToken : slotForm.preset),
    [slotForm.preset, slotForm.slotToken],
  );
  const selectedAnalyticsSlotMeta = useMemo(
    () => (analyticsSlotFilter === 'all' ? null : getStorefrontSlotDisplayMeta(analyticsSlotFilter)),
    [analyticsSlotFilter],
  );

  const analyticsSummary = useMemo(
    () =>
      analytics.reduce(
        (summary, item) => ({
          impressions: summary.impressions + Number(item.impressions || 0),
          views: summary.views + Number(item.views || 0),
          clicks: summary.clicks + Number(item.clicks || 0),
          conversions: summary.conversions + Number(item.conversions || 0),
        }),
        {
          impressions: 0,
          views: 0,
          clicks: 0,
          conversions: 0,
        },
      ),
    [analytics],
  );

  const averageCtr = analyticsSummary.impressions > 0
    ? (analyticsSummary.clicks / analyticsSummary.impressions) * 100
    : 0;
  const averageConversionRate = analyticsSummary.clicks > 0
    ? (analyticsSummary.conversions / analyticsSummary.clicks) * 100
    : 0;

  const deleteBusy = deleteSlotMutation.isPending || deleteRankingMutation.isPending;

  const openCreateModal = (target) => {
    setFeedback(EMPTY_FEEDBACK);
    if (target === 'slot') {
      setSlotForm(INITIAL_SLOT_FORM);
    }
    if (target === 'ranking') {
      setRankingForm(INITIAL_RANKING_FORM);
    }
    setCreateTarget(target);
  };

  const handleSlotPresetChange = (nextPreset) => {
    const preset = getStorefrontSlotPreset(nextPreset);
    setSlotForm((current) => ({
      ...current,
      preset: nextPreset,
      slotToken: preset && preset.token !== 'custom' ? preset.token : current.slotToken,
    }));
  };

  const openDeleteModal = (kind, item) => {
    setFeedback(EMPTY_FEEDBACK);
    setDeleteTarget({ kind, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.item?.id) {
      return;
    }

    if (deleteTarget.kind === 'slot') {
      await deleteSlotMutation.mutateAsync(deleteTarget.item.id);
      return;
    }

    await deleteRankingMutation.mutateAsync(deleteTarget.item.id);
  };

  const statCards = [
    {
      label: 'Slots',
      value: formatNumber(slotsQuery.data?.total || 0),
      detail: 'Current recommendation placements under editorial control.',
      tone: 'accent',
    },
    {
      label: 'Rankings',
      value: loadedTabs.rankings ? formatNumber(rankingsQuery.data?.total || 0) : 'Open tab',
      detail: loadedTabs.rankings ? 'Configured ranking views.' : 'Loaded only when the rankings tab is opened.',
    },
    {
      label: 'Analytics rows',
      value: loadedTabs.analytics ? formatNumber(analyticsQuery.data?.total || 0) : 'Open tab',
      detail: loadedTabs.analytics ? 'Recent recommendation performance rows.' : 'Loaded only when the analytics tab is opened.',
    },
  ];

  return (
    <AdminShell
      title="Search & Discovery"
      subtitle="Treat discovery like editorial work. Manage recommendation slots, ranking rules, and slot performance without slipping into a noisy growth dashboard."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {statCards.map((card) => (
            <AdminMetricCard key={card.label} {...card} />
          ))}
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback(EMPTY_FEEDBACK)}
          dismissAriaLabel="Dismiss feedback"
        />

        <AdminTabs items={VIEW_TABS} value={activeTab} onChange={handleTabChange} />

        {activeTab === 'slots' ? (
          <AdminPageSection
            title="Recommendation slots"
            description="Slots are the stable editorial entry points that feed the storefront. Keep the machine token predictable and the title mix intentional."
            action={
              <Button type="button" onClick={() => openCreateModal('slot')}>
                <Plus className="size-4" />
                New slot
              </Button>
            }
          >
            <AdminDataState
              isLoading={slotsQuery.isLoading}
              hasData={slots.length > 0}
              emptyMessage={slotsQuery.isError ? getErrorMessage(slotsQuery.error, 'Recommendation slots could not be loaded.') : 'No recommendation slots exist yet.'}
              wrap={false}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                {slots.map((slot) => {
                  const seriesIds = Array.isArray(slot.seriesIds) ? slot.seriesIds : [];
                  const slotMeta = getStorefrontSlotDisplayMeta(slot.slot || slot.name);

                  return (
                    <RecommendationCard
                      key={slot.id}
                      title={slotMeta.label}
                      description={slotMeta.hint}
                      meta={<AdminBadge tone="accent">{seriesIds.length} title{seriesIds.length === 1 ? '' : 's'}</AdminBadge>}
                      footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            Updated {formatDateTime(slot.updatedAt)}
                          </p>
                          <Button type="button" variant="destructive" size="sm" onClick={() => openDeleteModal('slot', slot)}>
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </div>
                      }
                    >
                      <SlotIdentity slotKey={slotMeta.token} itemId={slot.id} hint="" />
                      <div className="mt-4 flex flex-wrap gap-2">
                        {seriesIds.length > 0 ? (
                          seriesIds.map((seriesId) => (
                            <span
                              key={`${slot.id}-${seriesId}`}
                              className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-3 py-1 text-xs text-slate-600"
                            >
                              {seriesId}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">No titles are assigned yet.</span>
                        )}
                      </div>
                    </RecommendationCard>
                  );
                })}
              </div>
            </AdminDataState>
          </AdminPageSection>
        ) : null}

        {activeTab === 'rankings' ? (
          <AdminPageSection
            title="Ranking rules"
            description="Keep ranking logic explicit. The page shows which rule runs, which titles it covers, and whether it is active."
            action={
              <Button type="button" onClick={() => openCreateModal('ranking')}>
                <Plus className="size-4" />
                New ranking
              </Button>
            }
          >
            <AdminDataState
              isLoading={rankingsQuery.isLoading}
              hasData={rankings.length > 0}
              emptyMessage={rankingsQuery.isError ? getErrorMessage(rankingsQuery.error, 'Ranking settings could not be loaded.') : 'No ranking configurations exist yet.'}
              wrap={false}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                {rankings.map((ranking) => (
                  <RecommendationCard
                    key={ranking.id}
                    title={ranking.name || 'Untitled ranking'}
                    description={`${formatRankingTypeLabel(ranking.rankingType)} · ${formatTimeRangeLabel(ranking.timeRange)} · ${formatSeriesTypeLabel(ranking.seriesType)}`}
                    meta={
                      <AdminBadge tone={ranking.active ? 'success' : 'default'}>
                        {ranking.active ? 'Active' : 'Paused'}
                      </AdminBadge>
                    }
                    footer={
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          Updated {formatDateTime(ranking.updatedAt)}
                        </p>
                        <Button type="button" variant="destructive" size="sm" onClick={() => openDeleteModal('ranking', ranking)}>
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.82)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Max items</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{ranking.maxItems || 0}</p>
                      </div>
                      <div className="rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.82)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Audience</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">
                          {ranking.adult ? 'Adult allowed' : 'General audience'}
                        </p>
                      </div>
                    </div>
                  </RecommendationCard>
                ))}
              </div>
            </AdminDataState>
          </AdminPageSection>
        ) : null}

        {activeTab === 'analytics' ? (
          <AdminPageSection
            title="Slot analytics"
            description="Filter by slot first, then compare impression, click, and conversion behavior without mixing unrelated storefront entries together."
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminMetricCard label="Impressions" value={formatNumber(analyticsSummary.impressions)} detail="Loaded analytics rows." tone="accent" />
                <AdminMetricCard label="Views" value={formatNumber(analyticsSummary.views)} detail="Story detail visits." />
                <AdminMetricCard label="Clicks" value={formatNumber(analyticsSummary.clicks)} detail="Slot click volume." />
                <AdminMetricCard label="Conversions" value={formatNumber(analyticsSummary.conversions)} detail="Tracked downstream actions." />
              </div>
              <div className="rounded-[26px] border border-black/8 bg-white/88 p-5 shadow-[var(--gush-shadow-soft)]">
                <AdminFormField label="Slot filter">
                  <select
                    id="analytics-slot-filter"
                    value={analyticsSlotFilter}
                    onChange={(event) => setAnalyticsSlotFilter(event.target.value)}
                    className={adminSelectClassName}
                  >
                    {ANALYTICS_SLOT_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </AdminFormField>
                {selectedAnalyticsSlotMeta ? (
                  <div className="mt-4">
                    <SlotIdentity slotKey={selectedAnalyticsSlotMeta.token} hint={selectedAnalyticsSlotMeta.hint} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    Choose a single slot to focus the analytics table on one reader entry point.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AdminMetricCard label="Average CTR" value={formatPercent(averageCtr)} detail="Clicks divided by impressions." />
              <AdminMetricCard label="Average conversion rate" value={formatPercent(averageConversionRate)} detail="Conversions divided by clicks." />
            </div>

            <div className="mt-6">
              <AdminDataState
                isLoading={analyticsQuery.isLoading}
                hasData={analytics.length > 0}
                emptyMessage={analyticsQuery.isError ? getErrorMessage(analyticsQuery.error, 'Recommendation analytics could not be loaded.') : 'No analytics rows are available for this filter.'}
                wrap={false}
              >
                <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white/92 shadow-[var(--gush-shadow-soft)]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-[rgba(250,247,241,0.9)] text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-4">Date</th>
                          <th className="px-4 py-4">Slot</th>
                          <th className="px-4 py-4">Series</th>
                          <th className="px-4 py-4">Impressions</th>
                          <th className="px-4 py-4">Views</th>
                          <th className="px-4 py-4">Clicks</th>
                          <th className="px-4 py-4">Conversions</th>
                          <th className="px-4 py-4">CTR</th>
                          <th className="px-4 py-4">Conversion rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.map((item) => {
                          const slotMeta = getStorefrontSlotDisplayMeta(item.slot || item.slotId);
                          return (
                            <tr
                              key={item.id}
                              className="border-t border-black/6 text-sm text-slate-700 transition hover:bg-[rgba(250,247,241,0.52)]"
                            >
                              <td className="px-4 py-4">{formatDateTime(item.date)}</td>
                              <td className="px-4 py-4">
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-950">{slotMeta.label}</p>
                                  <p className="text-xs text-slate-500">{slotMeta.token}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-mono text-xs text-slate-600">{item.seriesId || 'Unknown'}</td>
                              <td className="px-4 py-4">{formatNumber(item.impressions)}</td>
                              <td className="px-4 py-4">{formatNumber(item.views)}</td>
                              <td className="px-4 py-4">{formatNumber(item.clicks)}</td>
                              <td className="px-4 py-4">{formatNumber(item.conversions)}</td>
                              <td className="px-4 py-4">{formatPercent(item.ctr)}</td>
                              <td className="px-4 py-4">{formatPercent(item.conversionRate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </AdminDataState>
            </div>
          </AdminPageSection>
        ) : null}
      </div>

      <Modal
        isOpen={createTarget === 'slot'}
        title="New recommendation slot"
        subtitle="Slots should stay stable and readable so storefront wiring remains predictable."
        onClose={() => {
          if (!createSlotMutation.isPending) {
            setCreateTarget(null);
          }
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createSlotMutation.mutate();
          }}
        >
          <AdminFormField label="Slot preset" helperText={selectedSlotMeta.hint || 'Start from a known storefront slot pattern to reduce wiring mistakes.'}>
            <select
              id="slot-preset"
              value={slotForm.preset}
              onChange={(event) => handleSlotPresetChange(event.target.value)}
              className={adminSelectClassName}
            >
              {STOREFRONT_SLOT_PRESETS.map((preset) => (
                <option key={preset.token} value={preset.token}>
                  {preset.label}
                </option>
              ))}
            </select>
          </AdminFormField>

          <AdminFormField
            label="Machine token"
            helperText={
              slotForm.preset === 'custom'
                ? 'Use lowercase letters, numbers, and hyphens only.'
                : 'This token is filled from the preset automatically.'
            }
          >
            <input
              id="slot-token"
              type="text"
              value={slotForm.slotToken}
              readOnly={slotForm.preset !== 'custom'}
              onChange={(event) => setSlotForm((current) => ({ ...current, slotToken: event.target.value }))}
              placeholder="for example: library-return"
              className={adminInputClassName}
            />
          </AdminFormField>

          <AdminFormField label="Series IDs" helperText="Use commas or line breaks between series IDs.">
            <textarea
              id="slot-series-ids"
              rows={5}
              value={slotForm.seriesIdsText}
              onChange={(event) => setSlotForm((current) => ({ ...current, seriesIdsText: event.target.value }))}
              placeholder="series_001&#10;series_002"
              className={adminTextareaClassName}
            />
          </AdminFormField>

          <Button type="submit" disabled={createSlotMutation.isPending}>
            {createSlotMutation.isPending ? 'Creating...' : 'Create slot'}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={createTarget === 'ranking'}
        title="New ranking"
        subtitle="Keep ranking rules explicit so discovery remains truthful and maintainable."
        onClose={() => {
          if (!createRankingMutation.isPending) {
            setCreateTarget(null);
          }
        }}
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createRankingMutation.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Ranking name">
              <input
                id="ranking-name"
                type="text"
                value={rankingForm.name}
                onChange={(event) => setRankingForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="for example: weekly-trending"
                className={adminInputClassName}
              />
            </AdminFormField>
            <AdminFormField label="Ranking type">
              <select
                id="ranking-type"
                value={rankingForm.rankingType}
                onChange={(event) => setRankingForm((current) => ({ ...current, rankingType: event.target.value }))}
                className={adminSelectClassName}
              >
                {RANKING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label="Time range">
              <select
                id="ranking-range"
                value={rankingForm.timeRange}
                onChange={(event) => setRankingForm((current) => ({ ...current, timeRange: event.target.value }))}
                className={adminSelectClassName}
              >
                {TIME_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label="Series type">
              <select
                id="ranking-series-type"
                value={rankingForm.seriesType}
                onChange={(event) => setRankingForm((current) => ({ ...current, seriesType: event.target.value }))}
                className={adminSelectClassName}
              >
                {SERIES_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label="Max items">
              <input
                id="ranking-max-items"
                type="number"
                min="1"
                max="200"
                value={rankingForm.maxItems}
                onChange={(event) => setRankingForm((current) => ({ ...current, maxItems: event.target.value }))}
                className={adminInputClassName}
              />
            </AdminFormField>
            <div className="grid gap-3">
              <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-3 text-sm text-slate-700">
                <span>Adult content allowed</span>
                <input
                  type="checkbox"
                  checked={rankingForm.adult}
                  onChange={(event) => setRankingForm((current) => ({ ...current, adult: event.target.checked }))}
                  className="h-4 w-4 rounded border-black/20 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-3 text-sm text-slate-700">
                <span>Rule is active</span>
                <input
                  type="checkbox"
                  checked={rankingForm.active}
                  onChange={(event) => setRankingForm((current) => ({ ...current, active: event.target.checked }))}
                  className="h-4 w-4 rounded border-black/20 bg-transparent"
                />
              </label>
            </div>
          </div>
          <Button type="submit" disabled={createRankingMutation.isPending}>
            {createRankingMutation.isPending ? 'Creating...' : 'Create ranking'}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        title="Delete item"
        subtitle="This will remove the selected discovery record immediately."
        onClose={() => {
          if (!deleteBusy) {
            setDeleteTarget(null);
          }
        }}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            {deleteTarget?.kind === 'slot'
              ? `Delete slot "${deleteTarget?.item?.name || deleteTarget?.item?.slot || 'Unknown'}"?`
              : `Delete ranking "${deleteTarget?.item?.name || deleteTarget?.item?.ranking || 'Unknown'}"?`}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
