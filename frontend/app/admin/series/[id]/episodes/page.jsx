'use client';

export const dynamic = 'force-dynamic';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import AdminShell from '@/components/admin/AdminShell';
import { BulkUploadModal } from '@/components/admin/episodes/BulkUploadModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminDataState } from '@/components/admin/common/AdminDataState';
import { Modal } from '@/components/admin/common/Modal';
import {
  BulkUpdateModalContent,
  CreateEpisodeModalContent,
  EpisodesHeaderActions,
  EpisodesSummaryCards,
  EpisodesWorkspaceSection,
} from '@/components/admin/episodes-workspace/sections';
import {
  buildBulkUpdatePayload,
  buildCreateEpisodePayload,
  EMPTY_BULK_FORM,
  EMPTY_FEEDBACK,
  EMPTY_NEW_EPISODE,
  fetchEpisodes,
  fetchSeriesDetail,
  getErrorMessage,
  getPageStats,
  getQuickFilterId,
  isNonNegativeIntegerString,
  normalizeParam,
  QUICK_FILTERS,
  SORT_OPTIONS,
  toInteger,
  validateNewEpisodeDraft,
} from '@/components/admin/episodes-workspace/utils';
import {
  adminFetch,
  readAdminResponseMessage,
} from '@/lib/adminApiClient';

const DEFAULT_FILTERS = {
  priceType: 'all',
  previewStatus: 'all',
  ttfEligible: 'all',
};

export default function AdminEpisodesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const seriesId = normalizeParam(params?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [sortBy, setSortBy] = useState('number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
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
    queryKey: [
      'admin',
      'series',
      seriesId,
      'episodes',
      deferredSearchTerm,
      sortBy,
      sortOrder,
      filters,
      page,
      pageSize,
    ],
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
  const allCurrentPageSelected =
    episodes.length > 0 && episodes.every((episode) => selectedSet.has(episode.id));
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
    const validationMessage = validateNewEpisodeDraft(newEpisode);
    if (validationMessage) {
      setFeedback({ type: 'error', message: validationMessage });
      return;
    }

    createEpisodeMutation.mutate(buildCreateEpisodePayload(newEpisode));
  };

  const handleBulkUpdate = () => {
    const { updates, errorMessage } = buildBulkUpdatePayload({
      bulkForm,
      showBulkCommercialFields,
    });

    if (errorMessage) {
      setFeedback({ type: 'error', message: errorMessage });
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

  const pageStats = useMemo(
    () => getPageStats(episodes, selectedIds.length),
    [episodes, selectedIds.length],
  );
  const quickFilterId = useMemo(() => getQuickFilterId(filters), [filters]);

  if (seriesQuery.isLoading || (episodesQuery.isLoading && !episodesQuery.data)) {
    return (
      <AdminShell title="章节管理" subtitle="正在加载章节工作台...">
        <AdminDataState isLoading={true} hasData={false} />
      </AdminShell>
    );
  }

  if (seriesQuery.isError) {
    return (
      <AdminShell title="章节管理" subtitle="章节工作台加载失败。">
        <AdminDataState
          isLoading={false}
          hasData={false}
          emptyMessage={getErrorMessage(seriesQuery.error, '作品详情加载失败。')}
        />
      </AdminShell>
    );
  }

  if (!series) {
    return (
      <AdminShell title="章节管理" subtitle="没有找到对应作品。">
        <AdminDataState isLoading={false} hasData={false} emptyMessage="这条作品记录不存在。" />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={series.title || '章节管理'}
      subtitle="按内容优先方式维护章节号、标题、试看页数和发布时间；旧商业设置保留在次级入口。"
      actions={
        <EpisodesHeaderActions
          onBackToSeries={() => router.push(`/admin/series/${seriesId}`)}
          onOpenStorefront={() =>
            window.open(`/series/${seriesId}`, '_blank', 'noopener,noreferrer')
          }
          onOpenBulkUpload={() => setIsUploadModalOpen(true)}
          onOpenCreateEpisode={() => setIsAddModalOpen(true)}
        />
      }
    >
      <div className="space-y-6">
        <EpisodesSummaryCards pagination={pagination} pageStats={pageStats} />

        <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(EMPTY_FEEDBACK)} />

        <EpisodesWorkspaceSection
          searchTerm={searchTerm}
          sortBy={sortBy}
          sortOrder={sortOrder}
          pageSize={pageSize}
          selectedIds={selectedIds}
          quickFilters={QUICK_FILTERS}
          sortOptions={SORT_OPTIONS}
          quickFilterId={quickFilterId}
          episodesQueryErrorMessage={
            episodesQuery.isError
              ? getErrorMessage(episodesQuery.error, '章节列表加载失败。')
              : ''
          }
          episodes={episodes}
          pagination={pagination}
          onSearchChange={setSearchTerm}
          onSortByChange={setSortBy}
          onSortOrderToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          onOpenBulkUpdate={() => setIsBulkModalOpen(true)}
          onAutoRenumber={handleAutoRenumber}
          onOpenDeleteSelected={() => openDeleteConfirm(selectedIds)}
          onQuickFilter={handleQuickFilter}
          tableProps={{
            seriesId,
            episodes,
            selectedSet,
            allCurrentPageSelected,
            isCanonicalNumberSort,
            reorderPending: reorderEpisodesMutation.isPending,
            getEpisodeDraftValue,
            setEpisodeDraftValue,
            commitEpisodeField,
            handleSelectAllCurrentPage,
            handleToggleSelect,
            handleMoveEpisode,
            openDeleteConfirm,
          }}
          onPageSizeChange={setPageSize}
          onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setPage((current) => current + 1)}
          reorderPending={reorderEpisodesMutation.isPending}
        />
      </div>

      <Modal
        isOpen={isAddModalOpen}
        title="新增章节"
        subtitle="先把章节号、标题和试看入口补好，次级发行设置默认收起。"
        onClose={() => setIsAddModalOpen(false)}
        size="lg"
      >
        <CreateEpisodeModalContent
          newEpisode={newEpisode}
          setNewEpisode={setNewEpisode}
          showCreateCommercialFields={showCreateCommercialFields}
          setShowCreateCommercialFields={setShowCreateCommercialFields}
          isPending={createEpisodeMutation.isPending}
          onCreate={handleCreateEpisode}
        />
      </Modal>

      <Modal
        isOpen={isBulkModalOpen}
        title="批量修改章节"
        subtitle={`把统一内容修改应用到 ${selectedIds.length} 个已选章节。`}
        onClose={() => setIsBulkModalOpen(false)}
        size="lg"
      >
        <BulkUpdateModalContent
          selectedCount={selectedIds.length}
          bulkForm={bulkForm}
          setBulkForm={setBulkForm}
          showBulkCommercialFields={showBulkCommercialFields}
          setShowBulkCommercialFields={setShowBulkCommercialFields}
          isPending={bulkUpdateMutation.isPending}
          onApply={handleBulkUpdate}
        />
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
