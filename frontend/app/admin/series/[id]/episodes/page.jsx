'use client';

export const dynamic = 'force-dynamic';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';

import { BulkUploadModal } from '@/components/admin/episodes/BulkUploadModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
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
  { id: 'all', label: '全部章节', filters: { priceType: 'all', previewStatus: 'all', ttfEligible: 'all' } },
  { id: 'paid', label: '收费章', filters: { priceType: 'paid', previewStatus: 'all', ttfEligible: 'all' } },
  { id: 'free', label: '免费章', filters: { priceType: 'free', previewStatus: 'all', ttfEligible: 'all' } },
  { id: 'preview', label: '有预览', filters: { priceType: 'all', previewStatus: 'enabled', ttfEligible: 'all' } },
  { id: 'ttf', label: 'TTF 开启', filters: { priceType: 'all', previewStatus: 'all', ttfEligible: 'true' } },
];
const SORT_OPTIONS = [
  { value: 'number', label: '章节号' },
  { value: 'updatedAt', label: '最近更新' },
  { value: 'title', label: '标题' },
  { value: 'pricePts', label: '金币价格' },
  { value: 'previewFreePages', label: '预览页数' },
  { value: 'releasedAt', label: '发布时间' },
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
    return '暂无';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
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
    throw new Error(data?.message || data?.error || '作品信息加载失败。');
  }

  return data?.series || null;
}

async function fetchEpisodes(seriesId, options) {
  const query = buildEpisodesQuery(options);
  const { response, data } = await adminFetchJson(`/api/admin/series/${seriesId}/episodes?${query}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(data?.message || data?.error || '章节列表加载失败。');
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

function SummaryCard({ label, value, helper }) {
  return (
    <article className="rounded-[28px] border border-neutral-800 bg-neutral-900/75 px-5 py-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.75)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-neutral-400">{helper}</p>
    </article>
  );
}

function ToolbarButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-2xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900 ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
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
        throw new Error(await readAdminResponseMessage(response, '新增章节失败。'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setIsAddModalOpen(false);
      setNewEpisode(EMPTY_NEW_EPISODE);
      setFeedback({ type: 'success', message: '章节已创建。' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '新增章节失败。') });
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
        throw new Error(await readAdminResponseMessage(response, '更新章节失败。'));
      }

      return response.json();
    },
    onSuccess: async (_data, variables) => {
      setEpisodeDrafts((current) => {
        const next = { ...current };
        if (next[variables.episodeId]) {
          delete next[variables.episodeId];
        }
        return next;
      });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '更新章节失败。') });
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
        throw new Error(await readAdminResponseMessage(response, '批量更新章节失败。'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setIsBulkModalOpen(false);
      setBulkForm(EMPTY_BULK_FORM);
      setSelectedIds([]);
      setFeedback({ type: 'success', message: '选中章节已批量更新。' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '批量更新章节失败。') });
    },
  });

  const deleteEpisodesMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        const response = await adminFetch(`/api/admin/series/${seriesId}/episodes/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(await readAdminResponseMessage(response, '删除章节失败。'));
        }
      }
    },
    onSuccess: async () => {
      setIsDeleteConfirmOpen(false);
      setPendingDeleteIds([]);
      setSelectedIds([]);
      setFeedback({ type: 'success', message: '章节已删除。' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '删除章节失败。') });
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
        throw new Error(await readAdminResponseMessage(response, '章节排序更新失败。'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: '章节顺序已更新。' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '章节排序更新失败。') });
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
        setFeedback({ type: 'error', message: '请输入合法的非负整数。' });
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
      setFeedback({ type: 'error', message: '章节标题不能为空。' });
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
      setFeedback({ type: 'error', message: '请填写章节号和标题。' });
      return;
    }
    if (!isNonNegativeIntegerString(newEpisode.pricePts, { allowEmpty: true }) || !isNonNegativeIntegerString(newEpisode.previewFreePages, { allowEmpty: true })) {
      setFeedback({ type: 'error', message: '金币价格和预览页数必须是非负整数。' });
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
        setFeedback({ type: 'error', message: '批量价格必须是非负整数。' });
        return;
      }
      updates.pricePts = toInteger(bulkForm.pricePts, 0);
    }

    if (bulkForm.previewFreePages !== '') {
      if (!isNonNegativeIntegerString(bulkForm.previewFreePages)) {
        setFeedback({ type: 'error', message: '批量预览页数必须是非负整数。' });
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
      setFeedback({ type: 'error', message: '请至少填写一个要批量更新的字段。' });
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
        item.filters.priceType === filters.priceType
        && item.filters.previewStatus === filters.previewStatus
        && item.filters.ttfEligible === filters.ttfEligible,
    );

    return matched?.id || 'custom';
  }, [filters]);

  if (seriesQuery.isLoading || (episodesQuery.isLoading && !episodesQuery.data)) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-16">
          <LoadingState.Spinner size="md" text="正在加载章节管理台..." />
        </div>
      </div>
    );
  }

  if (seriesQuery.isError) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-16">
          <LoadingState.ErrorState error={getErrorMessage(seriesQuery.error, '作品信息加载失败。')} onRetry={() => seriesQuery.refetch()} />
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-neutral-800 bg-neutral-900/80 px-6 py-16">
          <LoadingState.EmptyState
            message="未找到该作品。"
            action={(
              <button
                type="button"
                onClick={() => router.push('/admin/series')}
                className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                返回作品库
              </button>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-neutral-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(180deg,rgba(23,23,23,0.96),rgba(10,10,10,0.94))] px-6 py-6 shadow-[0_28px_90px_-40px_rgba(0,0,0,0.85)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => router.push(`/admin/series/${seriesId}`)}
                className="inline-flex w-fit items-center gap-2 rounded-2xl border border-neutral-700 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300 transition hover:border-neutral-500 hover:text-white"
              >
                返回作品详情
              </button>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                    章节管理
                  </span>
                  <span className="rounded-full border border-neutral-700 bg-neutral-900/80 px-3 py-1 text-neutral-300">
                    最新章节 {series.latestEpisodeId || '暂无'}
                  </span>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {series.title || '未命名作品'}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-neutral-400">
                  在这里集中处理章节创建、金币价格、预览页数、TTF 和排序调整，适合连续整理漫画或小说的章节库。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <ToolbarButton onClick={() => router.push(`/series/${seriesId}`)}>
                <ArrowUpRight size={16} />
                前台详情
              </ToolbarButton>
              <ToolbarButton onClick={() => setIsUploadModalOpen(true)}>
                <Upload size={16} />
                批量上传
              </ToolbarButton>
              <ToolbarButton onClick={() => setIsAddModalOpen(true)} className="border-cyan-500/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20">
                <Plus size={16} />
                新建章节
              </ToolbarButton>
            </div>
          </div>
        </header>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="总章节数" value={String(pagination.total)} helper={series.latestEpisodeId ? `最新章节 ${series.latestEpisodeId}` : '还没有任何章节'} />
          <SummaryCard label="本页收费章" value={String(pageStats.paidCount)} helper="当前页金币价格大于 0 的章节数量" />
          <SummaryCard label="本页可预览" value={String(pageStats.previewCount)} helper="当前页已配置预览页数的章节数量" />
          <SummaryCard label="本页 TTF" value={String(pageStats.ttfCount)} helper="当前页已开启 TTF 的章节数量" />
        </section>

        <section className="rounded-[32px] border border-neutral-800 bg-neutral-900/75 p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.75)]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="搜索章节号、章节标题或章节 ID"
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-11 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <ToolbarButton
                  onClick={handleAutoRenumber}
                  disabled={reorderEpisodesMutation.isPending || pagination.total === 0}
                >
                  <RotateCcw size={16} />
                  自动重排章节号
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ priceType: 'all', previewStatus: 'all', ttfEligible: 'all' });
                    setSortBy('number');
                    setSortOrder('asc');
                  }}
                >
                  重置视图
                </ToolbarButton>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((quickFilter) => {
                const active = quickFilterId === quickFilter.id;
                return (
                  <button
                    key={quickFilter.id}
                    type="button"
                    onClick={() => handleQuickFilter(quickFilter)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      active
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
                        : 'border-neutral-700 bg-neutral-950/70 text-neutral-300 hover:border-neutral-500 hover:text-white'
                    }`}
                  >
                    {quickFilter.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">价格筛选</span>
                <select
                  value={filters.priceType}
                  onChange={(event) => setFilters((current) => ({ ...current, priceType: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="all">全部价格</option>
                  <option value="paid">收费章节</option>
                  <option value="free">免费章节</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">预览筛选</span>
                <select
                  value={filters.previewStatus}
                  onChange={(event) => setFilters((current) => ({ ...current, previewStatus: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="all">全部预览状态</option>
                  <option value="enabled">有预览页</option>
                  <option value="disabled">无预览页</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">TTF 筛选</span>
                <select
                  value={filters.ttfEligible}
                  onChange={(event) => setFilters((current) => ({ ...current, ttfEligible: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="all">全部 TTF 状态</option>
                  <option value="true">仅显示已开启</option>
                  <option value="false">仅显示已关闭</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">排序字段</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">排序方向</span>
                <button
                  type="button"
                  onClick={() => setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
                >
                  {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {sortOrder === 'asc' ? '升序' : '降序'}
                </button>
              </label>
            </div>
          </div>
        </section>

        {selectedIds.length ? (
          <section className="rounded-[28px] border border-cyan-500/20 bg-cyan-500/10 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-cyan-100">
                已选择 <span className="font-semibold">{selectedIds.length}</span> 个章节，可批量处理金币、预览页数、TTF 或删除。
              </p>

              <div className="flex flex-wrap gap-2">
                <ToolbarButton onClick={() => setIsBulkModalOpen(true)}>
                  <Save size={16} />
                  批量编辑
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, updates: { ttfEligible: true } })}
                  disabled={bulkUpdateMutation.isPending}
                >
                  开启 TTF
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, updates: { ttfEligible: false } })}
                  disabled={bulkUpdateMutation.isPending}
                >
                  关闭 TTF
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => openDeleteConfirm(selectedIds)}
                  disabled={deleteEpisodesMutation.isPending}
                  className="border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                >
                  <Trash2 size={16} />
                  删除所选
                </ToolbarButton>
              </div>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[32px] border border-neutral-800 bg-neutral-900/80 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.75)]">
          {episodesQuery.isError ? (
            <div className="px-6 py-16">
              <LoadingState.ErrorState error={getErrorMessage(episodesQuery.error, '章节列表加载失败。')} onRetry={() => episodesQuery.refetch()} />
            </div>
          ) : episodes.length === 0 ? (
            <div className="px-6 py-16">
              <LoadingState.EmptyState
                message="当前筛选条件下没有章节。"
                action={(
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900"
                  >
                    新建第一章
                  </button>
                )}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-950/80 text-left text-neutral-400">
                    <tr>
                      <th className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          onChange={handleSelectAllCurrentPage}
                          className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                          aria-label="选择当前页全部章节"
                        />
                      </th>
                      <th className="px-5 py-4">章节号</th>
                      <th className="px-5 py-4">标题</th>
                      <th className="px-5 py-4">金币价格</th>
                      <th className="px-5 py-4">预览页数</th>
                      <th className="px-5 py-4">TTF</th>
                      <th className="px-5 py-4">更新时间</th>
                      <th className="px-5 py-4">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {episodes.map((episode) => (
                      <tr key={episode.id} className="border-t border-neutral-800 text-neutral-200">
                        <td className="px-5 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={selectedSet.has(episode.id)}
                            onChange={() => handleToggleSelect(episode.id)}
                            className="mt-2 h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                            aria-label={`选择章节 ${episode.number}`}
                          />
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="space-y-3">
                            <div className="text-base font-semibold text-white">#{episode.number}</div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleMoveEpisode(episode, 'up')}
                                disabled={!isCanonicalNumberSort || reorderEpisodesMutation.isPending}
                                className="rounded-xl border border-neutral-700 px-2.5 py-1.5 text-xs transition hover:border-neutral-500 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                上移
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveEpisode(episode, 'down')}
                                disabled={!isCanonicalNumberSort || reorderEpisodesMutation.isPending}
                                className="rounded-xl border border-neutral-700 px-2.5 py-1.5 text-xs transition hover:border-neutral-500 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                下移
                              </button>
                            </div>
                            {!isCanonicalNumberSort ? (
                              <p className="text-xs text-neutral-500">切换到“章节号 + 升序”后可直接调整顺序。</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
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
                              className="w-full min-w-[240px] rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                            />
                            <p className="text-xs text-neutral-500">{episode.id}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
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
                            className="w-28 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                            aria-label={`章节 ${episode.number} 金币价格`}
                          />
                        </td>
                        <td className="px-5 py-4 align-top">
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
                            className="w-28 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                            aria-label={`章节 ${episode.number} 预览页数`}
                          />
                        </td>
                        <td className="px-5 py-4 align-top">
                          <label className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(episode.ttfEligible)}
                              onChange={(event) =>
                                updateEpisodeMutation.mutate({
                                  episodeId: episode.id,
                                  payload: { ttfEligible: event.target.checked },
                                })
                              }
                              className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                            />
                            <span>{episode.ttfEligible ? '已开启' : '已关闭'}</span>
                          </label>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="space-y-1 text-sm text-neutral-300">
                            <p>{formatDateTime(episode.updatedAt)}</p>
                            <p className="text-xs text-neutral-500">发布时间：{formatDateTime(episode.releasedAt)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <a
                              href={`/read/${seriesId}/${episode.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700 px-3 py-2 text-sm transition hover:border-neutral-500 hover:bg-neutral-900"
                            >
                              <BookOpen size={15} />
                              阅读页
                            </a>
                            <button
                              type="button"
                              onClick={() => openDeleteConfirm([episode.id])}
                              className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
                            >
                              <Trash2 size={15} />
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-neutral-800 bg-neutral-950/60 px-5 py-4 text-sm text-neutral-400 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  第 <span className="font-medium text-white">{pagination.page}</span> / {pagination.totalPages} 页，共{' '}
                  <span className="font-medium text-white">{pagination.total}</span> 章
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span>每页</span>
                    <select
                      value={pageSize}
                      onChange={(event) => setPageSize(Number(event.target.value))}
                      className="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none"
                    >
                      {[20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={!pagination.hasPrevPage}
                      className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((current) => current + 1)}
                      disabled={!pagination.hasNextPage}
                      className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        title="新建章节"
        subtitle="快速创建新章节，创建后就可以继续上传内容或补价格。"
        onClose={() => setIsAddModalOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-neutral-300">章节号</span>
              <input
                type="number"
                min="1"
                value={newEpisode.number}
                onChange={(event) => setNewEpisode((current) => ({ ...current, number: event.target.value }))}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-neutral-300">章节标题</span>
              <input
                type="text"
                value={newEpisode.title}
                onChange={(event) => setNewEpisode((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-neutral-300">金币价格</span>
              <input
                type="number"
                min="0"
                value={newEpisode.pricePts}
                onChange={(event) => setNewEpisode((current) => ({ ...current, pricePts: event.target.value }))}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-neutral-300">预览页数</span>
              <input
                type="number"
                min="0"
                value={newEpisode.previewFreePages}
                onChange={(event) => setNewEpisode((current) => ({ ...current, previewFreePages: event.target.value }))}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-3 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-200">
            <input
              type="checkbox"
              checked={newEpisode.ttfEligible}
              onChange={(event) => setNewEpisode((current) => ({ ...current, ttfEligible: event.target.checked }))}
              className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
            />
            <span>创建时直接开启 TTF</span>
          </label>

          <button
            type="button"
            onClick={handleCreateEpisode}
            disabled={createEpisodeMutation.isPending}
            className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createEpisodeMutation.isPending ? '创建中...' : '创建章节'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isBulkModalOpen}
        title="批量编辑章节"
        subtitle={`当前已选 ${selectedIds.length} 个章节。留空表示保持原值不变。`}
        onClose={() => setIsBulkModalOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-neutral-300">批量金币价格</span>
              <input
                type="number"
                min="0"
                value={bulkForm.pricePts}
                onChange={(event) => setBulkForm((current) => ({ ...current, pricePts: event.target.value }))}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-neutral-300">批量预览页数</span>
              <input
                type="number"
                min="0"
                value={bulkForm.previewFreePages}
                onChange={(event) => setBulkForm((current) => ({ ...current, previewFreePages: event.target.value }))}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-neutral-300">批量 TTF</span>
            <select
              value={bulkForm.ttfEligible}
              onChange={(event) => setBulkForm((current) => ({ ...current, ttfEligible: event.target.value }))}
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
            >
              <option value="unchanged">保持不变</option>
              <option value="true">全部开启</option>
              <option value="false">全部关闭</option>
            </select>
          </label>

          <button
            type="button"
            onClick={handleBulkUpdate}
            disabled={bulkUpdateMutation.isPending}
            className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkUpdateMutation.isPending ? '批量保存中...' : '应用批量更新'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="删除章节"
        message={`确定要删除 ${pendingDeleteIds.length} 个章节吗？删除后无法恢复。`}
        confirmText={deleteEpisodesMutation.isPending ? '删除中...' : '确认删除'}
        cancelText="取消"
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
          setFeedback({ type: 'success', message: '批量上传完成，章节列表已刷新。' });
          await invalidateEpisodeData();
        }}
      />
    </div>
  );
}
