'use client';

export const dynamic = 'force-dynamic';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronDown, ChevronUp, Plus, Upload } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { BulkUploadModal } from '@/components/admin/episodes/BulkUploadModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { Modal } from '@/components/admin/common/Modal';
import {
  AdminBadge,
  AdminDataTable,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  adminInputClassName,
  adminSelectClassName,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminFetch, adminFetchJson, readAdminResponseMessage } from '@/lib/adminApiClient';

const EMPTY_FEEDBACK = { type: '', message: '' };
const EMPTY_NEW_EPISODE = {
  number: '',
  title: '',
  pricePts: '0',
  previewFreePages: '0',
  ttfEligible: false,
};
const EMPTY_BULK_FORM = {
  pricePts: '',
  previewFreePages: '',
  ttfEligible: 'unchanged',
};
const QUICK_FILTERS = [
  { id: 'all', label: 'All episodes', filters: { priceType: 'all', previewStatus: 'all', ttfEligible: 'all' } },
  { id: 'paid', label: 'Paid', filters: { priceType: 'paid', previewStatus: 'all', ttfEligible: 'all' } },
  { id: 'free', label: 'Free', filters: { priceType: 'free', previewStatus: 'all', ttfEligible: 'all' } },
  { id: 'preview', label: 'Has preview', filters: { priceType: 'all', previewStatus: 'enabled', ttfEligible: 'all' } },
  { id: 'ttf', label: 'Free-pass on', filters: { priceType: 'all', previewStatus: 'all', ttfEligible: 'true' } },
];
const SORT_OPTIONS = [
  { value: 'number', label: 'Episode number' },
  { value: 'updatedAt', label: 'Updated time' },
  { value: 'title', label: 'Title' },
  { value: 'pricePts', label: 'Price' },
  { value: 'previewFreePages', label: 'Preview pages' },
  { value: 'releasedAt', label: 'Release time' },
];

function normalizeParam(value) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isNonNegativeIntegerString(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return allowEmpty;
  }

  return /^\d+$/.test(normalized);
}

function formatDateTime(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function buildEpisodesQuery({
  searchTerm,
  sortBy,
  sortOrder,
  page,
  pageSize,
  filters,
}) {
  const params = new URLSearchParams();

  if (searchTerm) {
    params.set('search', searchTerm);
  }

  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  if (filters.priceType && filters.priceType !== 'all') {
    params.set('priceType', filters.priceType);
  }
  if (filters.previewStatus && filters.previewStatus !== 'all') {
    params.set('previewStatus', filters.previewStatus);
  }
  if (filters.ttfEligible && filters.ttfEligible !== 'all') {
    params.set('ttfEligible', filters.ttfEligible);
  }

  return params.toString();
}

async function fetchSeriesDetail(seriesId) {
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}`, { cache: 'no-store' });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Series details could not be loaded.');
  }

  return data?.series || null;
}

async function fetchEpisodes(seriesId, options) {
  const query = buildEpisodesQuery(options);
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}/episodes?${query}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Episode list could not be loaded.');
  }

  return {
    episodes: Array.isArray(data?.episodes) ? data.episodes : [],
    pagination: data?.pagination || {
      page: options.page,
      pageSize: options.pageSize,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}

export default function AdminEpisodesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const seriesId = normalizeParam(params?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [sortBy, setSortBy] = useState('number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState({
    priceType: 'all',
    previewStatus: 'all',
    ttfEligible: 'all',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const [newEpisode, setNewEpisode] = useState(EMPTY_NEW_EPISODE);
  const [bulkForm, setBulkForm] = useState(EMPTY_BULK_FORM);
  const [episodeDrafts, setEpisodeDrafts] = useState({});

  const seriesQuery = useQuery({
    queryKey: ['admin', 'series', seriesId, 'detail'],
    enabled: Boolean(seriesId),
    staleTime: 60_000,
    queryFn: () => fetchSeriesDetail(seriesId),
  });

  const episodesQuery = useQuery({
    queryKey: ['admin', 'series', seriesId, 'episodes', deferredSearchTerm, sortBy, sortOrder, filters, page, pageSize],
    enabled: Boolean(seriesId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () =>
      fetchEpisodes(seriesId, {
        searchTerm: deferredSearchTerm,
        sortBy,
        sortOrder,
        page,
        pageSize,
        filters,
      }),
  });

  const series = seriesQuery.data;
  const episodes = episodesQuery.data?.episodes || [];
  const pagination = episodesQuery.data?.pagination || {
    page,
    pageSize,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allCurrentPageSelected = episodes.length > 0 && episodes.every((episode) => selectedSet.has(episode.id));
  const isCanonicalNumberSort = sortBy === 'number' && sortOrder === 'asc';

  useEffect(() => {
    setPage(1);
  }, [deferredSearchTerm, filters, sortBy, sortOrder]);

  useEffect(() => {
    setSelectedIds([]);
  }, [page, pageSize, deferredSearchTerm, filters, sortBy, sortOrder]);

  const invalidateEpisodeData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'series', seriesId, 'episodes'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'series', seriesId, 'detail'] }),
    ]);
  };

  const createEpisodeMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await adminFetch(`/api/admin/series/${seriesId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, 'Could not create the episode.'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setIsAddModalOpen(false);
      setNewEpisode(EMPTY_NEW_EPISODE);
      setFeedback({ type: 'success', message: 'The episode was created.' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Could not create the episode.') });
    },
  });

  const updateEpisodeMutation = useMutation({
    mutationFn: async ({ episodeId, payload }) => {
      const response = await adminFetch(`/api/admin/series/${seriesId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, 'Could not update the episode.'));
      }

      return response.json();
    },
    onSuccess: async (_data, variables) => {
      setEpisodeDrafts((current) => {
        const next = { ...current };
        delete next[variables.episodeId];
        return next;
      });
      setFeedback({ type: 'success', message: 'Episode changes were saved.' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Could not update the episode.') });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }) => {
      const response = await adminFetch(`/api/admin/series/${seriesId}/episodes/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, 'Could not update the selected episodes.'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setIsBulkModalOpen(false);
      setBulkForm(EMPTY_BULK_FORM);
      setSelectedIds([]);
      setFeedback({ type: 'success', message: 'The selected episodes were updated.' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Could not update the selected episodes.') });
    },
  });

  const deleteEpisodesMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        const response = await adminFetch(`/api/admin/series/${seriesId}/episodes/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(await readAdminResponseMessage(response, 'Could not delete the episode.'));
        }
      }
    },
    onSuccess: async () => {
      setIsDeleteConfirmOpen(false);
      setPendingDeleteIds([]);
      setSelectedIds([]);
      setFeedback({ type: 'success', message: 'The selected episodes were deleted.' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Could not delete the episode.') });
    },
  });

  const reorderEpisodesMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await adminFetch(`/api/admin/series/${seriesId}/episodes/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, 'Could not update episode order.'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Episode order was updated.' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Could not update episode order.') });
    },
  });

  const setEpisodeDraftValue = (episodeId, field, value) => {
    setEpisodeDrafts((current) => ({
      ...current,
      [episodeId]: {
        ...current[episodeId],
        [field]: value,
      },
    }));
  };

  const getEpisodeDraftValue = (episode, field) => {
    const draftValue = episodeDrafts[episode.id]?.[field];
    if (draftValue !== undefined) {
      return draftValue;
    }

    return String(episode[field] ?? '');
  };

  const clearEpisodeDraftField = (episodeId, field) => {
    setEpisodeDrafts((current) => {
      const next = { ...current };
      if (!next[episodeId]) {
        return current;
      }
      delete next[episodeId][field];
      if (Object.keys(next[episodeId]).length === 0) {
        delete next[episodeId];
      }
      return next;
    });
  };

  const commitEpisodeField = (episode, field, { type = 'string' } = {}) => {
    const draftValue = episodeDrafts[episode.id]?.[field];
    if (draftValue === undefined) {
      return;
    }

    if (type === 'number') {
      if (!isNonNegativeIntegerString(draftValue, { allowEmpty: true })) {
        setFeedback({ type: 'error', message: 'Please enter a valid non-negative integer.' });
        return;
      }

      const nextValue = toInteger(draftValue, 0);
      const currentValue = toInteger(episode[field], 0);
      if (nextValue === currentValue) {
        clearEpisodeDraftField(episode.id, field);
        return;
      }

      updateEpisodeMutation.mutate({
        episodeId: episode.id,
        payload: { [field]: nextValue },
      });
      return;
    }

    const nextValue = String(draftValue ?? '').trim();
    const currentValue = String(episode[field] ?? '').trim();
    if (!nextValue) {
      setFeedback({ type: 'error', message: 'Episode titles cannot be empty.' });
      return;
    }
    if (nextValue === currentValue) {
      clearEpisodeDraftField(episode.id, field);
      return;
    }

    updateEpisodeMutation.mutate({
      episodeId: episode.id,
      payload: { [field]: nextValue },
    });
  };

  const handleCreateEpisode = () => {
    if (!isNonNegativeIntegerString(newEpisode.number) || !String(newEpisode.title || '').trim()) {
      setFeedback({ type: 'error', message: 'Episode number and title are required.' });
      return;
    }
    if (!isNonNegativeIntegerString(newEpisode.pricePts, { allowEmpty: true }) || !isNonNegativeIntegerString(newEpisode.previewFreePages, { allowEmpty: true })) {
      setFeedback({ type: 'error', message: 'Price and preview pages must be non-negative integers.' });
      return;
    }

    createEpisodeMutation.mutate({
      number: toInteger(newEpisode.number, 1),
      title: newEpisode.title.trim(),
      pricePts: toInteger(newEpisode.pricePts, 0),
      previewFreePages: toInteger(newEpisode.previewFreePages, 0),
      ttfEligible: Boolean(newEpisode.ttfEligible),
    });
  };

  const handleBulkUpdate = () => {
    const updates = {};

    if (bulkForm.pricePts !== '') {
      if (!isNonNegativeIntegerString(bulkForm.pricePts)) {
        setFeedback({ type: 'error', message: 'Bulk price must be a non-negative integer.' });
        return;
      }
      updates.pricePts = toInteger(bulkForm.pricePts, 0);
    }

    if (bulkForm.previewFreePages !== '') {
      if (!isNonNegativeIntegerString(bulkForm.previewFreePages)) {
        setFeedback({ type: 'error', message: 'Bulk preview pages must be a non-negative integer.' });
        return;
      }
      updates.previewFreePages = toInteger(bulkForm.previewFreePages, 0);
    }

    if (bulkForm.ttfEligible === 'true') {
      updates.ttfEligible = true;
    } else if (bulkForm.ttfEligible === 'false') {
      updates.ttfEligible = false;
    }

    if (Object.keys(updates).length === 0) {
      setFeedback({ type: 'error', message: 'Choose at least one field to update.' });
      return;
    }

    bulkUpdateMutation.mutate({ ids: selectedIds, updates });
  };

  const handleSelectAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(episodes.map((episode) => episode.id));
  };

  const handleToggleSelect = (episodeId) => {
    setSelectedIds((current) =>
      current.includes(episodeId)
        ? current.filter((item) => item !== episodeId)
        : [...current, episodeId],
    );
  };

  const handleQuickFilter = (quickFilter) => {
    setFilters(quickFilter.filters);
  };

  const openDeleteConfirm = (ids) => {
    setPendingDeleteIds(ids);
    setIsDeleteConfirmOpen(true);
  };

  const handleMoveEpisode = (episode, direction) => {
    const currentIndex = episodes.findIndex((item) => item.id === episode.id);
    if (currentIndex < 0) {
      return;
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const target = episodes[swapIndex];
    if (!target) {
      return;
    }

    reorderEpisodesMutation.mutate({
      items: [
        { id: episode.id, number: target.number },
        { id: target.id, number: episode.number },
      ],
    });
  };

  const handleAutoRenumber = () => {
    reorderEpisodesMutation.mutate({ compact: true, startNumber: 1 });
  };

  const pageStats = useMemo(() => {
    const paidCount = episodes.filter((episode) => Number(episode.pricePts) > 0).length;
    const previewCount = episodes.filter((episode) => Number(episode.previewFreePages) > 0).length;
    const ttfCount = episodes.filter((episode) => Boolean(episode.ttfEligible)).length;

    return { paidCount, previewCount, ttfCount };
  }, [episodes]);

  const quickFilterId = useMemo(() => {
    const matched = QUICK_FILTERS.find(
      (item) =>
        item.filters.priceType === filters.priceType &&
        item.filters.previewStatus === filters.previewStatus &&
        item.filters.ttfEligible === filters.ttfEligible,
    );

    return matched?.id || 'custom';
  }, [filters]);

  if (seriesQuery.isLoading || (episodesQuery.isLoading && !episodesQuery.data)) {
    return (
      <AdminShell title="Episodes" subtitle="Loading the episode workspace...">
        <AdminDataTable className="p-6">
          <p className="text-sm text-slate-600">Loading episodes...</p>
        </AdminDataTable>
      </AdminShell>
    );
  }

  if (seriesQuery.isError) {
    return (
      <AdminShell title="Episodes" subtitle="The episode workspace could not be loaded.">
        <AdminPageSection title="Load error" description={getErrorMessage(seriesQuery.error, 'Series details could not be loaded.')} />
      </AdminShell>
    );
  }

  if (!series) {
    return (
      <AdminShell title="Episodes" subtitle="The requested title could not be found.">
        <AdminPageSection title="Missing series" description="This series record does not exist." />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={series.title || 'Episodes'}
      subtitle="Manage numbering, release timing, preview access, and batch updates without crowding the table."
      actions={
        <>
          <Button type="button" variant="outline" onClick={() => router.push(`/admin/series/${seriesId}`)}>
            <ArrowLeft className="size-4" />
            Series detail
          </Button>
          <Button type="button" variant="outline" onClick={() => window.open(`/series/${seriesId}`, '_blank')}>
            <ArrowUpRight className="size-4" />
            View live page
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="size-4" />
            Bulk upload
          </Button>
          <Button type="button" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="size-4" />
            Add episode
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <AdminMetricCard label="Total episodes" value={String(pagination.total)} detail="The current result set after filters." tone="accent" />
          <AdminMetricCard label="Paid episodes" value={String(pageStats.paidCount)} detail="Episodes with a point price above zero." />
          <AdminMetricCard label="Preview enabled" value={String(pageStats.previewCount)} detail="Episodes with preview pages configured." />
          <AdminMetricCard label="Free-pass enabled" value={String(pageStats.ttfCount)} detail="Episodes currently eligible for free-pass." />
        </div>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <AdminPageSection
          title="Episode workspace"
          description="Search by title, trim the view with quick filters, then make small edits directly in the table."
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(true)} disabled={selectedIds.length === 0}>
                Bulk edit
              </Button>
              <Button type="button" variant="outline" onClick={handleAutoRenumber} disabled={reorderEpisodesMutation.isPending}>
                Auto-renumber
              </Button>
            </div>
          }
        >
          <div className="mb-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by episode title or ID..."
              className={adminInputClassName}
            />
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className={adminSelectClassName}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? 'Oldest first' : 'Newest first'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => openDeleteConfirm(selectedIds)}
              disabled={selectedIds.length === 0}
            >
              Delete selected
            </Button>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => handleQuickFilter(filter)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  quickFilterId === filter.id
                    ? 'border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]'
                    : 'border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {episodesQuery.isError ? (
            <AdminPageSection title="Load error" description={getErrorMessage(episodesQuery.error, 'Episode list could not be loaded.')} />
          ) : episodes.length === 0 ? (
            <AdminPageSection title="No episodes in this view" description="Try a different filter or add the first episode to get started." />
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white/92 shadow-[var(--gush-shadow-soft)]">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <AdminTableHeader>
                    <tr>
                      <th className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          onChange={handleSelectAllCurrentPage}
                          className="h-4 w-4 rounded border-black/20 bg-transparent"
                          aria-label="Select the current page"
                        />
                      </th>
                      <th className="px-4 py-4">Number</th>
                      <th className="px-4 py-4">Title</th>
                      <th className="px-4 py-4">Price</th>
                      <th className="px-4 py-4">Preview</th>
                      <th className="px-4 py-4">Free-pass</th>
                      <th className="px-4 py-4">Updated</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </AdminTableHeader>
                  <tbody>
                    {episodes.map((episode) => (
                      <AdminTableRow key={episode.id}>
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedSet.has(episode.id)}
                            onChange={() => handleToggleSelect(episode.id)}
                            className="h-4 w-4 rounded border-black/20 bg-transparent"
                            aria-label={`Select episode ${episode.number}`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <p className="font-semibold text-slate-950">#{episode.number}</p>
                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline" size="xs" onClick={() => handleMoveEpisode(episode, 'up')} disabled={!isCanonicalNumberSort || reorderEpisodesMutation.isPending}>
                                <ChevronUp className="size-4" />
                              </Button>
                              <Button type="button" variant="outline" size="xs" onClick={() => handleMoveEpisode(episode, 'down')} disabled={!isCanonicalNumberSort || reorderEpisodesMutation.isPending}>
                                <ChevronDown className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={getEpisodeDraftValue(episode, 'title')}
                              onChange={(event) => setEpisodeDraftValue(episode.id, 'title', event.target.value)}
                              onBlur={() => commitEpisodeField(episode, 'title')}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.currentTarget.blur();
                                }
                              }}
                              className={`${adminInputClassName} min-w-[220px]`}
                            />
                            <p className="text-xs text-slate-500">{episode.id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            value={getEpisodeDraftValue(episode, 'pricePts')}
                            onChange={(event) => setEpisodeDraftValue(episode.id, 'pricePts', event.target.value)}
                            onBlur={() => commitEpisodeField(episode, 'pricePts', { type: 'number' })}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.currentTarget.blur();
                              }
                            }}
                            className={`${adminInputClassName} w-28`}
                            aria-label={`Episode ${episode.number} price`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            value={getEpisodeDraftValue(episode, 'previewFreePages')}
                            onChange={(event) => setEpisodeDraftValue(episode.id, 'previewFreePages', event.target.value)}
                            onBlur={() => commitEpisodeField(episode, 'previewFreePages', { type: 'number' })}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.currentTarget.blur();
                              }
                            }}
                            className={`${adminInputClassName} w-28`}
                            aria-label={`Episode ${episode.number} preview pages`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <label className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[rgba(250,247,241,0.88)] px-3 py-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(episode.ttfEligible)}
                              onChange={(event) =>
                                updateEpisodeMutation.mutate({
                                  episodeId: episode.id,
                                  payload: { ttfEligible: event.target.checked },
                                })
                              }
                              className="h-4 w-4 rounded border-black/20 bg-transparent"
                            />
                            <span>{episode.ttfEligible ? 'On' : 'Off'}</span>
                          </label>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>{formatDateTime(episode.updatedAt)}</p>
                            <p className="text-xs text-slate-500">Released: {formatDateTime(episode.releasedAt)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => window.open(`/read/${seriesId}/${episode.id}`, '_blank')}>
                              <BookOpen className="size-4" />
                              Read page
                            </Button>
                            <Button type="button" variant="destructive" size="sm" onClick={() => openDeleteConfirm([episode.id])}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </AdminTableRow>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-black/6 bg-[rgba(250,247,241,0.72)] px-5 py-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  Page <span className="font-medium text-slate-950">{pagination.page}</span> of {pagination.totalPages} ·{' '}
                  <span className="font-medium text-slate-950">{pagination.total}</span> total episodes
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span>Per page</span>
                    <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 rounded-full border border-black/8 bg-white px-3 text-sm text-slate-700 outline-none">
                      {[20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={!pagination.hasPrevPage}>
                      Previous
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={!pagination.hasNextPage}>
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AdminPageSection>
      </div>

      <Modal isOpen={isAddModalOpen} title="New episode" subtitle="Create the episode shell first, then keep editing in the table." onClose={() => setIsAddModalOpen(false)} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Episode number">
              <input type="number" min="1" value={newEpisode.number} onChange={(event) => setNewEpisode((current) => ({ ...current, number: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
            <AdminFormField label="Title">
              <input type="text" value={newEpisode.title} onChange={(event) => setNewEpisode((current) => ({ ...current, title: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
            <AdminFormField label="Price">
              <input type="number" min="0" value={newEpisode.pricePts} onChange={(event) => setNewEpisode((current) => ({ ...current, pricePts: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
            <AdminFormField label="Preview pages">
              <input type="number" min="0" value={newEpisode.previewFreePages} onChange={(event) => setNewEpisode((current) => ({ ...current, previewFreePages: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
          </div>
          <label className="flex items-center justify-between rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-4 text-sm text-slate-700">
            <span>Enable free-pass immediately</span>
            <input type="checkbox" checked={newEpisode.ttfEligible} onChange={(event) => setNewEpisode((current) => ({ ...current, ttfEligible: event.target.checked }))} className="h-4 w-4 rounded border-black/20 bg-transparent" />
          </label>
          <Button type="button" onClick={handleCreateEpisode} disabled={createEpisodeMutation.isPending}>
            {createEpisodeMutation.isPending ? 'Creating...' : 'Create episode'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isBulkModalOpen} title="Bulk edit episodes" subtitle={`Apply the same change to ${selectedIds.length} selected episode${selectedIds.length === 1 ? '' : 's'}.`} onClose={() => setIsBulkModalOpen(false)} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Bulk price">
              <input type="number" min="0" value={bulkForm.pricePts} onChange={(event) => setBulkForm((current) => ({ ...current, pricePts: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
            <AdminFormField label="Bulk preview pages">
              <input type="number" min="0" value={bulkForm.previewFreePages} onChange={(event) => setBulkForm((current) => ({ ...current, previewFreePages: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
          </div>
          <AdminFormField label="Bulk free-pass">
            <select value={bulkForm.ttfEligible} onChange={(event) => setBulkForm((current) => ({ ...current, ttfEligible: event.target.value }))} className={adminSelectClassName}>
              <option value="unchanged">Keep current value</option>
              <option value="true">Turn on</option>
              <option value="false">Turn off</option>
            </select>
          </AdminFormField>
          <Button type="button" onClick={handleBulkUpdate} disabled={bulkUpdateMutation.isPending}>
            {bulkUpdateMutation.isPending ? 'Applying...' : 'Apply bulk update'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete episodes"
        message={`Delete ${pendingDeleteIds.length} episode${pendingDeleteIds.length === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText={deleteEpisodesMutation.isPending ? 'Deleting...' : 'Delete episodes'}
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleteEpisodesMutation.isPending}
        onConfirm={() => deleteEpisodesMutation.mutate(pendingDeleteIds)}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      <BulkUploadModal
        isOpen={isUploadModalOpen}
        seriesId={seriesId}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={async () => {
          setFeedback({ type: 'success', message: 'Bulk upload finished and the episode list was refreshed.' });
          await invalidateEpisodeData();
        }}
      />
    </AdminShell>
  );
}
