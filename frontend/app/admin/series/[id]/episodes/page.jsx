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
import {
  adminFetch,
  adminFetchJson,
  normalizeAdminErrorMessage,
  readAdminResponseMessage,
} from '@/lib/adminApiClient';

const EMPTY_FEEDBACK = { type: '', message: '' };
const EMPTY_NEW_EPISODE = {
  number: '',
  title: '',
  previewFreePages: '0',
  pricePts: '0',
  ttfEligible: false,
};
const EMPTY_BULK_FORM = {
  previewFreePages: '',
  pricePts: '',
  ttfEligible: 'unchanged',
};
const QUICK_FILTERS = [
  { id: 'all', label: '全部章节', filters: { priceType: 'all', previewStatus: 'all', ttfEligible: 'all' } },
  { id: 'preview', label: '含试看页', filters: { priceType: 'all', previewStatus: 'enabled', ttfEligible: 'all' } },
  { id: 'free', label: '免费章节', filters: { priceType: 'free', previewStatus: 'all', ttfEligible: 'all' } },
  { id: 'paid', label: '付费章节', filters: { priceType: 'paid', previewStatus: 'all', ttfEligible: 'all' } },
];
const SORT_OPTIONS = [
  { value: 'number', label: '章节号' },
  { value: 'updatedAt', label: '更新时间' },
  { value: 'releasedAt', label: '发布时间' },
  { value: 'title', label: '标题' },
  { value: 'previewFreePages', label: '试看页数' },
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
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getErrorMessage(error, fallbackMessage) {
  return normalizeAdminErrorMessage(error, fallbackMessage);
}

function getDateValue(value) {
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isRecentlyUpdated(value, days = 30) {
  const dateValue = getDateValue(value);
  if (!dateValue) {
    return false;
  }

  return dateValue >= Date.now() - days * 24 * 60 * 60 * 1000;
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
    throw new Error(data?.message || data?.error || '作品详情加载失败。');
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
  const [showCreateCommercialFields, setShowCreateCommercialFields] = useState(false);
  const [showBulkCommercialFields, setShowBulkCommercialFields] = useState(false);

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
        throw new Error(await readAdminResponseMessage(response, '创建章节失败。'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setIsAddModalOpen(false);
      setNewEpisode(EMPTY_NEW_EPISODE);
      setShowCreateCommercialFields(false);
      setFeedback({ type: 'success', message: '章节已创建。' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '创建章节失败。') });
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
        delete next[variables.episodeId];
        return next;
      });
      setFeedback({ type: 'success', message: '章节修改已保存。' });
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
      setShowBulkCommercialFields(false);
      setSelectedIds([]);
      setFeedback({ type: 'success', message: '已更新所选章节。' });
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
      setFeedback({ type: 'success', message: '已删除所选章节。' });
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
        throw new Error(await readAdminResponseMessage(response, '更新章节顺序失败。'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: '章节顺序已更新。' });
      await invalidateEpisodeData();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error, '更新章节顺序失败。') });
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
        setFeedback({ type: 'error', message: '请输入有效的非负整数。' });
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
      setFeedback({ type: 'error', message: '章节号和标题不能为空。' });
      return;
    }

    if (
      !isNonNegativeIntegerString(newEpisode.previewFreePages, { allowEmpty: true }) ||
      !isNonNegativeIntegerString(newEpisode.pricePts, { allowEmpty: true })
    ) {
      setFeedback({ type: 'error', message: '试看页数和次级发行设置必须是非负整数。' });
      return;
    }

    createEpisodeMutation.mutate({
      number: toInteger(newEpisode.number, 1),
      title: newEpisode.title.trim(),
      previewFreePages: toInteger(newEpisode.previewFreePages, 0),
      pricePts: toInteger(newEpisode.pricePts, 0),
      ttfEligible: Boolean(newEpisode.ttfEligible),
    });
  };

  const handleBulkUpdate = () => {
    const updates = {};

    if (bulkForm.previewFreePages !== '') {
      if (!isNonNegativeIntegerString(bulkForm.previewFreePages)) {
        setFeedback({ type: 'error', message: '批量试看页数必须是非负整数。' });
        return;
      }
      updates.previewFreePages = toInteger(bulkForm.previewFreePages, 0);
    }

    if (showBulkCommercialFields && bulkForm.pricePts !== '') {
      if (!isNonNegativeIntegerString(bulkForm.pricePts)) {
        setFeedback({ type: 'error', message: '批量点数价格必须是非负整数。' });
        return;
      }
      updates.pricePts = toInteger(bulkForm.pricePts, 0);
    }

    if (showBulkCommercialFields) {
      if (bulkForm.ttfEligible === 'true') {
        updates.ttfEligible = true;
      } else if (bulkForm.ttfEligible === 'false') {
        updates.ttfEligible = false;
      }
    }

    if (Object.keys(updates).length === 0) {
      setFeedback({ type: 'error', message: '至少选择一项要更新的内容。' });
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
    const previewCount = episodes.filter((episode) => toInteger(episode.previewFreePages, 0) > 0).length;
    const recentUpdateCount = episodes.filter((episode) => isRecentlyUpdated(episode.updatedAt || episode.releasedAt, 30)).length;

    return {
      previewCount,
      recentUpdateCount,
      selectedCount: selectedIds.length,
    };
  }, [episodes, selectedIds.length]);

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
      <AdminShell title="章节管理" subtitle="正在加载章节工作台...">
        <AdminDataTable className="p-6">
          <p className="text-sm text-slate-600">正在加载章节列表...</p>
        </AdminDataTable>
      </AdminShell>
    );
  }

  if (seriesQuery.isError) {
    return (
      <AdminShell title="章节管理" subtitle="章节工作台加载失败。">
        <AdminPageSection title="加载失败" description={getErrorMessage(seriesQuery.error, '作品详情加载失败。')} />
      </AdminShell>
    );
  }

  if (!series) {
    return (
      <AdminShell title="章节管理" subtitle="没有找到对应作品。">
        <AdminPageSection title="作品不存在" description="这条作品记录不存在。" />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={series.title || '章节管理'}
      subtitle="按内容优先方式维护章节号、标题、试看页数和发布时间；旧商业设置保留在次级入口。"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white/78 p-1.5">
            <Button type="button" variant="ghost" onClick={() => router.push(`/admin/series/${seriesId}`)}>
              <ArrowLeft className="size-4" />
              返回作品详情
            </Button>
            <Button type="button" variant="ghost" onClick={() => window.open(`/series/${seriesId}`, '_blank', 'noopener,noreferrer')}>
              <ArrowUpRight className="size-4" />
              查看前台页
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white/88 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
            <Button type="button" variant="secondary" onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="size-4" />
              批量上传
            </Button>
            <Button type="button" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="size-4" />
              新增章节
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <AdminMetricCard label="当前章节数" value={String(pagination.total)} detail="当前筛选条件下的章节总数。" tone="accent" />
          <AdminMetricCard label="已开试看" value={String(pageStats.previewCount)} detail="已经配置试看页数的章节。" />
          <AdminMetricCard label="近期更新" value={String(pageStats.recentUpdateCount)} detail="近 30 天内更新或发布的章节。" />
          <AdminMetricCard label="已选章节" value={String(pageStats.selectedCount)} detail="当前勾选、可用于批量操作的章节数。" />
        </div>

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <AdminPageSection
          title="章节工作台"
          description="先按标题搜索，再用轻量筛选收窄范围，最后直接在表格里完成标题、试看页数和章节顺序调整。"
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(true)} disabled={selectedIds.length === 0}>
                批量修改
              </Button>
              <Button type="button" variant="outline" onClick={handleAutoRenumber} disabled={reorderEpisodesMutation.isPending}>
                自动重排章节号
              </Button>
            </div>
          }
        >
          <div className="mb-6 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-3 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_220px_180px]">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="搜索章节标题或章节 ID..."
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
                  {sortOrder === 'asc' ? '当前升序' : '当前降序'}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  已选 {selectedIds.length} 章
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => openDeleteConfirm(selectedIds)}
                  disabled={selectedIds.length === 0}
                >
                  删除所选章节
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => handleQuickFilter(filter)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  quickFilterId === filter.id
                    ? 'border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950'
                    : 'border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {episodesQuery.isError ? (
            <AdminPageSection title="加载失败" description={getErrorMessage(episodesQuery.error, '章节列表加载失败。')} />
          ) : episodes.length === 0 ? (
            <AdminPageSection title="当前视图下还没有章节" description="换一个筛选条件，或者先新增第一章开始处理。" />
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-[color:var(--gush-border)] bg-white/92 shadow-[var(--gush-shadow-soft)]">
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
                          aria-label="选择当前页全部章节"
                        />
                      </th>
                      <th className="px-4 py-4">章节号</th>
                      <th className="px-4 py-4">标题</th>
                      <th className="px-4 py-4">试看页数</th>
                      <th className="px-4 py-4">更新时间</th>
                      <th className="px-4 py-4">操作</th>
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
                            aria-label={`选择章节 ${episode.number}`}
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
                            id={`preview-free-pages-${episode.id}`}
                            value={getEpisodeDraftValue(episode, 'previewFreePages')}
                            onChange={(event) => setEpisodeDraftValue(episode.id, 'previewFreePages', event.target.value)}
                            onBlur={() => commitEpisodeField(episode, 'previewFreePages', { type: 'number' })}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.currentTarget.blur();
                              }
                            }}
                            className={`${adminInputClassName} w-32`}
                            aria-label={`章节 ${episode.number} 试看页数`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>更新于：{formatDateTime(episode.updatedAt)}</p>
                            <p className="text-xs text-slate-500">发布于：{formatDateTime(episode.releasedAt)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => window.open(`/read/${seriesId}/${episode.id}`, '_blank', 'noopener,noreferrer')}>
                              <BookOpen className="size-4" />
                              阅读页
                            </Button>
                            <Button type="button" variant="destructive" size="sm" onClick={() => openDeleteConfirm([episode.id])}>
                              删除
                            </Button>
                          </div>
                        </td>
                      </AdminTableRow>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-5 py-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  第 <span className="font-medium text-slate-950">{pagination.page}</span> 页，共 {pagination.totalPages} 页，
                  当前共 <span className="font-medium text-slate-950">{pagination.total}</span> 章
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span>每页</span>
                    <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 rounded-full border border-[color:var(--gush-border)] bg-white px-3 text-sm text-slate-700 outline-none">
                      {[20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={!pagination.hasPrevPage}>
                      上一页
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={!pagination.hasNextPage}>
                      下一页
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AdminPageSection>
      </div>

      <Modal isOpen={isAddModalOpen} title="新增章节" subtitle="先把章节号、标题和试看入口补好，次级发行设置默认收起。" onClose={() => setIsAddModalOpen(false)} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="章节号">
              <input id="new-episode-number" type="number" min="1" value={newEpisode.number} onChange={(event) => setNewEpisode((current) => ({ ...current, number: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
            <AdminFormField label="标题">
              <input id="new-episode-title" type="text" value={newEpisode.title} onChange={(event) => setNewEpisode((current) => ({ ...current, title: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
            <AdminFormField label="试看页数">
              <input id="new-episode-preview-free-pages" type="number" min="0" value={newEpisode.previewFreePages} onChange={(event) => setNewEpisode((current) => ({ ...current, previewFreePages: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateCommercialFields((current) => !current)}
            className="rounded-full border border-[color:var(--gush-border)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
          >
            {showCreateCommercialFields ? '收起次级发行设置' : '显示次级发行设置'}
          </button>

          {showCreateCommercialFields ? (
            <div className="grid gap-4 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4 md:grid-cols-2">
              <AdminFormField label="点数价格">
                <input id="new-episode-price-pts" type="number" min="0" value={newEpisode.pricePts} onChange={(event) => setNewEpisode((current) => ({ ...current, pricePts: event.target.value }))} className={adminInputClassName} />
              </AdminFormField>
              <label className="flex items-center justify-between rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4 text-sm text-slate-700">
                <span>启用免费券</span>
                <input id="new-episode-ttf-eligible" type="checkbox" checked={newEpisode.ttfEligible} onChange={(event) => setNewEpisode((current) => ({ ...current, ttfEligible: event.target.checked }))} className="h-4 w-4 rounded border-black/20 bg-transparent" />
              </label>
            </div>
          ) : null}

          <Button type="button" onClick={handleCreateEpisode} disabled={createEpisodeMutation.isPending}>
            {createEpisodeMutation.isPending ? '创建中...' : '创建章节'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isBulkModalOpen} title="批量修改章节" subtitle={`把统一内容修改应用到 ${selectedIds.length} 个已选章节。`} onClose={() => setIsBulkModalOpen(false)} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="批量试看页数">
              <input id="bulk-preview-free-pages" type="number" min="0" value={bulkForm.previewFreePages} onChange={(event) => setBulkForm((current) => ({ ...current, previewFreePages: event.target.value }))} className={adminInputClassName} />
            </AdminFormField>
          </div>

          <button
            type="button"
            onClick={() => setShowBulkCommercialFields((current) => !current)}
            className="rounded-full border border-[color:var(--gush-border)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
          >
            {showBulkCommercialFields ? '收起次级发行设置' : '显示次级发行设置'}
          </button>

          {showBulkCommercialFields ? (
            <div className="grid gap-4 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4 md:grid-cols-2">
              <AdminFormField label="批量点数价格">
                <input id="bulk-price-pts" type="number" min="0" value={bulkForm.pricePts} onChange={(event) => setBulkForm((current) => ({ ...current, pricePts: event.target.value }))} className={adminInputClassName} />
              </AdminFormField>
              <AdminFormField label="批量免费券">
                <select id="bulk-ttf-eligible" value={bulkForm.ttfEligible} onChange={(event) => setBulkForm((current) => ({ ...current, ttfEligible: event.target.value }))} className={adminSelectClassName}>
                  <option value="unchanged">保持当前值</option>
                  <option value="true">统一开启</option>
                  <option value="false">统一关闭</option>
                </select>
              </AdminFormField>
            </div>
          ) : null}

          <Button type="button" onClick={handleBulkUpdate} disabled={bulkUpdateMutation.isPending}>
            {bulkUpdateMutation.isPending ? '应用中...' : '应用批量修改'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="删除章节"
        message={`确定删除 ${pendingDeleteIds.length} 个章节吗？此操作无法撤销。`}
        confirmText={deleteEpisodesMutation.isPending ? '删除中...' : '删除章节'}
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
          setFeedback({ type: 'success', message: '批量上传已完成，章节列表已刷新。' });
          await invalidateEpisodeData();
        }}
      />
    </AdminShell>
  );
}
