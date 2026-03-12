'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { Modal } from '@/components/admin/common/Modal';
import { adminFetchJson } from '@/lib/adminApiClient';

const VIEW_TABS = [
  { key: 'slots', label: 'Slots' },
  { key: 'rankings', label: 'Rankings' },
  { key: 'analytics', label: 'Analytics' },
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
  { value: 'all', label: 'All series' },
  { value: 'comic', label: 'Comic' },
  { value: 'novel', label: 'Novel' },
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
];

const EMPTY_FEEDBACK = { type: '', message: '' };

const INITIAL_SLOT_FORM = {
  name: '',
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
  return {
    name: String(form.name || '').trim(),
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

function formatDateTime(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat('en-US').format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  return `${numericValue.toFixed(2)}%`;
}

function ErrorPanel({ title, message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-red-50">{title}</h3>
          <p className="mt-1 text-red-100/80">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-red-400/30 px-4 py-2 font-medium text-red-50 transition hover:bg-red-400/10"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-neutral-50">{value}</p>
      {hint ? <p className="mt-2 text-sm text-neutral-400">{hint}</p> : null}
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex flex-col gap-4 border-b border-neutral-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function AnalyticsTable({ analytics }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-800 text-sm">
          <thead className="bg-neutral-900/80 text-left text-xs uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Slot</th>
              <th className="px-4 py-3 font-medium">Series</th>
              <th className="px-4 py-3 font-medium">Impressions</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th className="px-4 py-3 font-medium">Conversions</th>
              <th className="px-4 py-3 font-medium">CTR</th>
              <th className="px-4 py-3 font-medium">Conversion rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-neutral-200">
            {analytics.map((item) => (
              <tr key={item.id} className="bg-neutral-950/30 transition hover:bg-neutral-900/60">
                <td className="px-4 py-3">{formatDateTime(item.date)}</td>
                <td className="px-4 py-3 font-medium text-neutral-50">{item.slot || item.slotId || 'Unknown'}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-300">{item.seriesId || 'Unknown'}</td>
                <td className="px-4 py-3">{formatNumber(item.impressions)}</td>
                <td className="px-4 py-3">{formatNumber(item.views)}</td>
                <td className="px-4 py-3">{formatNumber(item.clicks)}</td>
                <td className="px-4 py-3">{formatNumber(item.conversions)}</td>
                <td className="px-4 py-3">{formatPercent(item.ctr)}</td>
                <td className="px-4 py-3">{formatPercent(item.conversionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminRecommendationsPage() {
  const [activeTab, setActiveTab] = useState('slots');
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const feedbackBannerRef = useRef(null);
  const [createTarget, setCreateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [slotForm, setSlotForm] = useState(INITIAL_SLOT_FORM);
  const [rankingForm, setRankingForm] = useState(INITIAL_RANKING_FORM);

  useEffect(() => {
    if (!feedbackBannerRef.current) {
      return;
    }

    const dismissButton = feedbackBannerRef.current.querySelector('button');
    if (dismissButton) {
      dismissButton.textContent = 'Dismiss';
      dismissButton.setAttribute('aria-label', 'Dismiss feedback');
    }
  }, [feedback]);

  const slotsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'slots'],
    staleTime: 60_000,
    queryFn: async () => {
      const { response, data } = await adminFetchJson('/api/admin/recommendations/slots?limit=100');

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to load recommendation slots.');
      }

      return {
        items: Array.isArray(data?.slots) ? data.slots : [],
        total: Number(data?.total || 0),
      };
    },
  });

  const rankingsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'rankings'],
    staleTime: 60_000,
    queryFn: async () => {
      const { response, data } = await adminFetchJson('/api/admin/recommendations/rankings?limit=100');

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to load ranking configs.');
      }

      return {
        items: Array.isArray(data?.configs) ? data.configs : [],
        total: Number(data?.total || 0),
      };
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ['admin', 'recommendations', 'analytics'],
    staleTime: 60_000,
    queryFn: async () => {
      const { response, data } = await adminFetchJson('/api/admin/recommendations/analytics?limit=50');

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to load recommendation analytics.');
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

      if (!payload.name) {
        throw new Error('Slot name is required.');
      }

      const { response, data } = await adminFetchJson('/api/admin/recommendations/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to create recommendation slot.');
      }

      return data?.slot || null;
    },
    onSuccess: async () => {
      setCreateTarget(null);
      setSlotForm(INITIAL_SLOT_FORM);
      setFeedback({ type: 'success', message: 'Recommendation slot created.' });
      await slotsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Failed to create recommendation slot.') });
    },
  });

  const createRankingMutation = useMutation({
    mutationFn: async () => {
      const payload = buildRankingPayload(rankingForm);

      if (!payload.name) {
        throw new Error('Ranking name is required.');
      }

      if (!Number.isInteger(payload.maxItems) || payload.maxItems < 1 || payload.maxItems > 200) {
        throw new Error('Max items must be between 1 and 200.');
      }

      const { response, data } = await adminFetchJson('/api/admin/recommendations/rankings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to create ranking config.');
      }

      return data?.config || null;
    },
    onSuccess: async () => {
      setCreateTarget(null);
      setRankingForm(INITIAL_RANKING_FORM);
      setFeedback({ type: 'success', message: 'Ranking config created.' });
      await rankingsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Failed to create ranking config.') });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId) => {
      const { response, data } = await adminFetchJson(`/api/admin/recommendations/slots/${slotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to delete recommendation slot.');
      }

      return data;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setFeedback({ type: 'success', message: 'Recommendation slot deleted.' });
      await slotsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Failed to delete recommendation slot.') });
    },
  });

  const deleteRankingMutation = useMutation({
    mutationFn: async (rankingId) => {
      const { response, data } = await adminFetchJson(`/api/admin/recommendations/rankings/${rankingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to delete ranking config.');
      }

      return data;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setFeedback({ type: 'success', message: 'Ranking config deleted.' });
      await rankingsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Failed to delete ranking config.') });
    },
  });

  const slots = slotsQuery.data?.items || [];
  const rankings = rankingsQuery.data?.items || [];
  const analytics = analyticsQuery.data?.items || [];

  const analyticsSummary = useMemo(() => {
    return analytics.reduce(
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
      }
    );
  }, [analytics]);

  const averageCtr = analyticsSummary.impressions > 0
    ? (analyticsSummary.clicks / analyticsSummary.impressions) * 100
    : 0;

  const averageConversionRate = analyticsSummary.clicks > 0
    ? (analyticsSummary.conversions / analyticsSummary.clicks) * 100
    : 0;

  const deleteBusy = deleteSlotMutation.isPending || deleteRankingMutation.isPending;

  const openCreateModal = (target) => {
    setFeedback(EMPTY_FEEDBACK);
    setCreateTarget(target);
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

  const renderSlots = () => {
    if (slotsQuery.isError) {
      return (
        <ErrorPanel
          title="Failed to load slots"
          message={getErrorMessage(slotsQuery.error, 'The slot list could not be loaded.')}
          onRetry={() => slotsQuery.refetch()}
        />
      );
    }

    return (
      <AdminDataState
        isLoading={slotsQuery.isLoading}
        hasData={slots.length > 0}
        emptyMessage="No recommendation slots have been created yet."
        wrap={false}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {slots.map((slot) => {
            const seriesIds = Array.isArray(slot.seriesIds) ? slot.seriesIds : [];

            return (
              <article key={slot.id} className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">Slot</p>
                    <h3 className="mt-2 text-lg font-semibold text-neutral-50">{slot.name || slot.slot || 'Unnamed slot'}</h3>
                    <p className="mt-2 font-mono text-xs text-neutral-400">{slot.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDeleteModal('slot', slot)}
                    className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10"
                  >
                    Delete slot
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <StatCard label="Series count" value={formatNumber(seriesIds.length)} hint="Linked series IDs" />
                  <StatCard label="Created" value={formatDateTime(slot.createdAt)} hint="Initial setup time" />
                  <StatCard label="Updated" value={formatDateTime(slot.updatedAt)} hint="Last saved change" />
                </div>

                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Series IDs</p>
                  {seriesIds.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {seriesIds.map((seriesId) => (
                        <span
                          key={seriesId}
                          className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 font-mono text-xs text-neutral-300"
                        >
                          {seriesId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-neutral-400">No series IDs are linked to this slot.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </AdminDataState>
    );
  };

  const renderRankings = () => {
    if (rankingsQuery.isError) {
      return (
        <ErrorPanel
          title="Failed to load ranking configs"
          message={getErrorMessage(rankingsQuery.error, 'The ranking config list could not be loaded.')}
          onRetry={() => rankingsQuery.refetch()}
        />
      );
    }

    return (
      <AdminDataState
        isLoading={rankingsQuery.isLoading}
        hasData={rankings.length > 0}
        emptyMessage="No ranking configs have been created yet."
        wrap={false}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {rankings.map((ranking) => (
            <article key={ranking.id} className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">Ranking</p>
                  <h3 className="mt-2 text-lg font-semibold text-neutral-50">
                    {ranking.name || ranking.ranking || 'Unnamed ranking'}
                  </h3>
                  <p className="mt-2 font-mono text-xs text-neutral-400">{ranking.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openDeleteModal('ranking', ranking)}
                  className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10"
                >
                  Delete ranking
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Type" value={ranking.rankingType || 'Unknown'} hint="Ordering signal" />
                <StatCard label="Range" value={ranking.timeRange || 'Unknown'} hint="Aggregation window" />
                <StatCard label="Series" value={ranking.seriesType || 'Unknown'} hint="Content filter" />
                <StatCard label="Max items" value={formatNumber(ranking.maxItems)} hint="Response size limit" />
                <StatCard label="Adult" value={ranking.adult ? 'Enabled' : 'Disabled'} hint="Audience filter" />
                <StatCard label="Active" value={ranking.active ? 'Enabled' : 'Disabled'} hint="Availability state" />
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-400">
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1">Created {formatDateTime(ranking.createdAt)}</span>
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1">Updated {formatDateTime(ranking.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </AdminDataState>
    );
  };

  const renderAnalytics = () => {
    if (analyticsQuery.isError) {
      return (
        <ErrorPanel
          title="Failed to load analytics"
          message={getErrorMessage(analyticsQuery.error, 'Analytics data could not be loaded.')}
          onRetry={() => analyticsQuery.refetch()}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Impressions" value={formatNumber(analyticsSummary.impressions)} hint="Across the loaded dataset" />
          <StatCard label="Views" value={formatNumber(analyticsSummary.views)} hint="Series detail visits" />
          <StatCard label="Clicks" value={formatNumber(analyticsSummary.clicks)} hint="Recommendation taps" />
          <StatCard label="Conversions" value={formatNumber(analyticsSummary.conversions)} hint="Completed actions" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard label="Average CTR" value={formatPercent(averageCtr)} hint="Clicks divided by impressions" />
          <StatCard
            label="Average conversion rate"
            value={formatPercent(averageConversionRate)}
            hint="Conversions divided by clicks"
          />
        </div>
        <AdminDataState
          isLoading={analyticsQuery.isLoading}
          hasData={analytics.length > 0}
          emptyMessage="No recommendation analytics are available yet."
          wrap={false}
        >
          <AnalyticsTable analytics={analytics} />
        </AdminDataState>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-6 text-neutral-100">
      <header className="rounded-[32px] border border-neutral-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(180deg,rgba(10,10,10,0.96),rgba(10,10,10,0.88))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Admin console</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Recommendations</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-300">
              Manage recommendation slots, ranking configs, and read the latest recommendation analytics from one stable page.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <StatCard label="Slots" value={formatNumber(slotsQuery.data?.total || 0)} hint="Recommendation placements" />
            <StatCard label="Rankings" value={formatNumber(rankingsQuery.data?.total || 0)} hint="Ranking config records" />
            <StatCard label="Analytics rows" value={formatNumber(analyticsQuery.data?.total || 0)} hint="Latest loaded records" />
          </div>
        </div>
      </header>

      <div ref={feedbackBannerRef}>
        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />
      </div>

      <div className="flex flex-wrap gap-3">
        {VIEW_TABS.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'rounded-full border px-4 py-2 text-sm font-medium transition',
                isActive
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-neutral-800 bg-neutral-950/70 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section className="space-y-6 rounded-[32px] border border-neutral-800 bg-neutral-950/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
        {activeTab === 'slots' ? (
          <>
            <SectionHeader
              title="Recommendation slots"
              description="Slots only send the fields the backend accepts: a slot name and an optional series ID list."
              action={
                <button
                  type="button"
                  onClick={() => openCreateModal('slot')}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
                >
                  Create slot
                </button>
              }
            />
            {renderSlots()}
          </>
        ) : null}

        {activeTab === 'rankings' ? (
          <>
            <SectionHeader
              title="Ranking configs"
              description="Ranking configs are sent using the backend contract only: name, ranking type, time range, series type, max items, adult flag, and active flag."
              action={
                <button
                  type="button"
                  onClick={() => openCreateModal('ranking')}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
                >
                  Create ranking
                </button>
              }
            />
            {renderRankings()}
          </>
        ) : null}

        {activeTab === 'analytics' ? (
          <>
            <SectionHeader
              title="Analytics"
              description="This view is read-only and shows the latest recommendation performance rows returned by the backend."
            />
            {renderAnalytics()}
          </>
        ) : null}
      </section>

      <Modal
        isOpen={createTarget === 'slot'}
        title="Create recommendation slot"
        subtitle="Only the supported backend fields are exposed on this form."
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
          <div>
            <label className="text-sm font-medium text-neutral-300" htmlFor="slot-name">
              Slot name
            </label>
            <input
              id="slot-name"
              type="text"
              value={slotForm.name}
              onChange={(event) => setSlotForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="homepage-featured"
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-300" htmlFor="slot-series-ids">
              Series IDs
            </label>
            <textarea
              id="slot-series-ids"
              rows={5}
              value={slotForm.seriesIdsText}
              onChange={(event) => setSlotForm((current) => ({ ...current, seriesIdsText: event.target.value }))}
              placeholder="series_001, series_002"
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
            />
            <p className="mt-2 text-xs text-neutral-500">Use commas or new lines to separate IDs.</p>
          </div>
          <button
            type="submit"
            disabled={createSlotMutation.isPending}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createSlotMutation.isPending ? 'Creating slot...' : 'Create slot'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={createTarget === 'ranking'}
        title="Create ranking config"
        subtitle="The payload matches the active backend DTO and validation rules."
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
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-name">
                Ranking name
              </label>
              <input
                id="ranking-name"
                type="text"
                value={rankingForm.name}
                onChange={(event) => setRankingForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="weekly-trending"
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-type">
                Ranking type
              </label>
              <select
                id="ranking-type"
                value={rankingForm.rankingType}
                onChange={(event) => setRankingForm((current) => ({ ...current, rankingType: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              >
                {RANKING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-range">
                Time range
              </label>
              <select
                id="ranking-range"
                value={rankingForm.timeRange}
                onChange={(event) => setRankingForm((current) => ({ ...current, timeRange: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              >
                {TIME_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-series-type">
                Series type
              </label>
              <select
                id="ranking-series-type"
                value={rankingForm.seriesType}
                onChange={(event) => setRankingForm((current) => ({ ...current, seriesType: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              >
                {SERIES_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="ranking-max-items">
                Max items
              </label>
              <input
                id="ranking-max-items"
                type="number"
                min="1"
                max="200"
                value={rankingForm.maxItems}
                onChange={(event) => setRankingForm((current) => ({ ...current, maxItems: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 outline-none transition focus:border-emerald-400"
              />
            </div>
            <div className="grid gap-3">
              <label className="flex items-center justify-between rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-neutral-200">
                <span>Adult content enabled</span>
                <input
                  type="checkbox"
                  checked={rankingForm.adult}
                  onChange={(event) => setRankingForm((current) => ({ ...current, adult: event.target.checked }))}
                  className="h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-neutral-200">
                <span>Config active</span>
                <input
                  type="checkbox"
                  checked={rankingForm.active}
                  onChange={(event) => setRankingForm((current) => ({ ...current, active: event.target.checked }))}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={createRankingMutation.isPending}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createRankingMutation.isPending ? 'Creating ranking...' : 'Create ranking'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        title="Delete item"
        subtitle="This action removes the selected record immediately."
        onClose={() => {
          if (!deleteBusy) {
            setDeleteTarget(null);
          }
        }}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-300">
            {deleteTarget?.kind === 'slot'
              ? `Delete slot "${deleteTarget?.item?.name || deleteTarget?.item?.slot || 'Unknown'}"?`
              : `Delete ranking "${deleteTarget?.item?.name || deleteTarget?.item?.ranking || 'Unknown'}"?`}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteBusy}
              className="flex-1 rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteBusy}
              className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteBusy ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

