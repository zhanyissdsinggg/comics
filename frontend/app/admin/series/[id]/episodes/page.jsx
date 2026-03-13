'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { BulkUploadModal } from '@/components/admin/episodes/BulkUploadModal';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkMutation } from '@/lib/hooks/useBulkMutation';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';

const searchFields = [
  { field: 'number', type: 'number' },
  { field: 'title', type: 'string' },
];

const sortFields = [
  { field: 'number', type: 'number' },
  { field: 'title', type: 'string' },
  { field: 'pricePts', type: 'number' },
];

const sortOptions = [
  { value: 'number', label: '章节号' },
  { value: 'title', label: '标题' },
  { value: 'pricePts', label: '价格' },
];

function normalizeParam(value) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasInput(value) {
  return String(value ?? '').trim() !== '';
}

export default function AdminEpisodesPage() {
  const params = useParams();
  const seriesId = normalizeParam(params?.id);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [newEpisode, setNewEpisode] = useState({
    number: '',
    title: '',
    pricePts: '0',
    previewFreePages: '0',
    ttfEligible: false,
  });
  const [bulkActionData, setBulkActionData] = useState({
    pricePts: '',
    previewFreePages: '',
  });
  const [episodeDrafts, setEpisodeDrafts] = useState({});

  const {
    items: episodes,
    pagination,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    isError,
    error,
    refetch,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedIds,
    setSelectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useAdminList(`series/${seriesId}/episodes`, searchFields, sortFields, 'number', 'asc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const addEpisodeMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await adminFetch(`/api/admin/series/${seriesId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '添加章节失败。'));
      }

      return response.json();
    },
    onSuccess: () => {
      setIsAddModalOpen(false);
      setNewEpisode({
        number: '',
        title: '',
        pricePts: '0',
        previewFreePages: '0',
        ttfEligible: false,
      });
      setFeedback({ type: 'success', message: '章节添加成功。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `添加失败：${mutationError.message}` });
    },
  });

  const bulkUpdateMutation = useBulkMutation(
    {
      endpoint: `series/${seriesId}/episodes`,
      method: 'PATCH',
      bodyBuilder: (episodeId) => {
        const episode = episodes.find((item) => item.id === episodeId);
        if (!episode) {
          return {};
        }

        return {
          ...episode,
          pricePts: hasInput(bulkActionData.pricePts)
            ? toInteger(bulkActionData.pricePts, episode.pricePts || 0)
            : episode.pricePts,
          previewFreePages: hasInput(bulkActionData.previewFreePages)
            ? toInteger(bulkActionData.previewFreePages, episode.previewFreePages || 0)
            : episode.previewFreePages,
        };
      },
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsBulkActionModalOpen(false);
        setBulkActionData({ pricePts: '', previewFreePages: '' });
        setFeedback({ type: 'success', message: '已更新所选章节。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `批量更新失败：${mutationError.message}` });
      },
    }
  );

  const bulkDeleteMutation = useBulkMutation(
    {
      endpoint: `series/${seriesId}/episodes`,
      method: 'DELETE',
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsDeleteConfirmOpen(false);
        setFeedback({ type: 'success', message: '已删除所选章节。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `删除失败：${mutationError.message}` });
      },
    }
  );

  const updateEpisodeMutation = useMutation({
    mutationFn: async ({ episodeId, field, value }) => {
      const episode = episodes.find((item) => item.id === episodeId);
      if (!episode) {
        throw new Error('未找到章节。');
      }

      const response = await adminFetch(`/api/admin/series/${seriesId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...episode,
          [field]: field === 'ttfEligible' ? Boolean(value) : toInteger(value, 0),
        }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '更新章节失败。'));
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setEpisodeDrafts((current) => {
        const next = { ...current };
        if (next[variables.episodeId]) {
          next[variables.episodeId] = {
            ...next[variables.episodeId],
            [variables.field]: undefined,
          };
        }
        return next;
      });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `更新失败：${mutationError.message}` });
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

  const clearEpisodeDraftValue = (episodeId, field) => {
    setEpisodeDrafts((current) => {
      if (!current[episodeId]) {
        return current;
      }

      const nextEpisodeDraft = { ...current[episodeId] };
      delete nextEpisodeDraft[field];

      if (Object.keys(nextEpisodeDraft).length === 0) {
        const next = { ...current };
        delete next[episodeId];
        return next;
      }

      return {
        ...current,
        [episodeId]: nextEpisodeDraft,
      };
    });
  };

  const getEpisodeDraftValue = (episode, field, fallback = 0) => {
    const draftValue = episodeDrafts[episode.id]?.[field];
    if (draftValue !== undefined) {
      return draftValue;
    }

    return String(episode[field] ?? fallback);
  };

  const commitEpisodeDraft = (episode, field) => {
    const draftValue = episodeDrafts[episode.id]?.[field];
    if (draftValue === undefined) {
      return;
    }

    const normalizedDraft = toInteger(draftValue, 0);
    const currentValue = toInteger(episode[field], 0);

    if (normalizedDraft === currentValue) {
      clearEpisodeDraftValue(episode.id, field);
      return;
    }

    updateEpisodeMutation.mutate({
      episodeId: episode.id,
      field,
      value: normalizedDraft,
    });
  };

  const handleAddEpisode = () => {
    if (!hasInput(newEpisode.number) || !hasInput(newEpisode.title)) {
      setFeedback({ type: 'error', message: '章节号和标题不能为空。' });
      return;
    }

    addEpisodeMutation.mutate({
      number: toInteger(newEpisode.number),
      title: newEpisode.title.trim(),
      pricePts: toInteger(newEpisode.pricePts),
      previewFreePages: toInteger(newEpisode.previewFreePages),
      ttfEligible: Boolean(newEpisode.ttfEligible),
    });
  };

  const handleBulkUpdate = () => {
    if (!hasInput(bulkActionData.pricePts) && !hasInput(bulkActionData.previewFreePages)) {
      setFeedback({ type: 'error', message: '请至少填写一个需要更新的字段。' });
      return;
    }

    bulkUpdateMutation.mutate(selectedIds);
  };

  const handleSingleDelete = (episodeId) => {
    setSelectedIds([episodeId]);
    setIsDeleteConfirmOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">章节管理</h1>
          <p className="mt-2 text-neutral-400">在这里管理当前作品的章节信息、定价、预览页和批量上传。</p>
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          className="mb-6"
        />

        <AdminListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="搜索章节号或标题"
          onOpenFilters={() => setIsSortModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          extraActions={
            <>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
              >
                批量上传
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                新增章节
              </button>
            </>
          }
        />

        <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <button
            type="button"
            onClick={() => setIsBulkActionModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
          >
            批量编辑
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={bulkDeleteMutation.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? '删除中...' : '删除'}
          </button>
        </AdminSelectionBar>

        <AdminTableShell
          isError={isError}
          errorMessage={error?.message || '章节加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={episodes.length > 0}
          emptyMessage="暂无章节。"
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 bg-neutral-900">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === episodes.length && episodes.length > 0}
                    onChange={(event) => {
                      if (event.target.checked) {
                        selectAll(episodes);
                        return;
                      }

                      clearSelection();
                    }}
                    className="rounded"
                      aria-label="选择全部章节"
                  />
                </th>
                <th className="px-4 py-3 text-left text-neutral-400">章节号</th>
                <th className="px-4 py-3 text-left text-neutral-400">标题</th>
                <th className="px-4 py-3 text-left text-neutral-400">价格</th>
                <th className="px-4 py-3 text-left text-neutral-400">免费预览页数</th>
                <th className="px-4 py-3 text-left text-neutral-400">TTF</th>
                <th className="px-4 py-3 text-left text-neutral-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((episode) => (
                <tr key={episode.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIdsSet.has(episode.id)}
                      onChange={() => toggleSelect(episode.id)}
                      className="rounded"
                      aria-label={`选择章节 ${episode.number}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-300">{episode.number}</td>
                  <td className="px-4 py-3 text-neutral-300">{episode.title}</td>
                  <td className="px-4 py-3 text-neutral-300">
                    <input
                      type="number"
                      value={getEpisodeDraftValue(episode, 'pricePts')}
                      onChange={(event) => setEpisodeDraftValue(episode.id, 'pricePts', event.target.value)}
                      onBlur={() => commitEpisodeDraft(episode, 'pricePts')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.currentTarget.blur();
                        }
                      }}
                      className="w-24 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
                       aria-label={`章节 ${episode.number} 的价格`}
                    />
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    <input
                      type="number"
                      value={getEpisodeDraftValue(episode, 'previewFreePages')}
                      onChange={(event) => setEpisodeDraftValue(episode.id, 'previewFreePages', event.target.value)}
                      onBlur={() => commitEpisodeDraft(episode, 'previewFreePages')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.currentTarget.blur();
                        }
                      }}
                      className="w-24 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
                       aria-label={`章节 ${episode.number} 的免费预览页数`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={Boolean(episode.ttfEligible)}
                      onChange={(event) =>
                        updateEpisodeMutation.mutate({
                          episodeId: episode.id,
                          field: 'ttfEligible',
                          value: event.target.checked,
                        })
                      }
                      className="rounded"
                       aria-label={`切换章节 ${episode.number} 的 TTF 可用状态`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSingleDelete(episode.id)}
                      className="text-sm font-medium text-red-400 transition hover:text-red-300"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="章节排序"
          label="排序字段"
          actionLabel="应用"
        />
      </div>

      <Modal isOpen={isAddModalOpen} title="新增章节" onClose={() => setIsAddModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400">章节号</label>
            <input
              type="number"
              value={newEpisode.number}
              onChange={(event) => setNewEpisode((current) => ({ ...current, number: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">标题</label>
            <input
              type="text"
              value={newEpisode.title}
              onChange={(event) => setNewEpisode((current) => ({ ...current, title: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">价格</label>
            <input
              type="number"
              value={newEpisode.pricePts}
              onChange={(event) => setNewEpisode((current) => ({ ...current, pricePts: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">免费预览页数</label>
            <input
              type="number"
              value={newEpisode.previewFreePages}
              onChange={(event) => setNewEpisode((current) => ({ ...current, previewFreePages: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ttf-eligible"
              checked={newEpisode.ttfEligible}
              onChange={(event) => setNewEpisode((current) => ({ ...current, ttfEligible: event.target.checked }))}
              className="rounded"
            />
            <label htmlFor="ttf-eligible" className="text-sm text-neutral-400">
              允许使用 TTF
            </label>
          </div>

          <button
            type="button"
            onClick={handleAddEpisode}
            disabled={addEpisodeMutation.isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {addEpisodeMutation.isPending ? '添加中...' : '新增章节'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isBulkActionModalOpen}
        title="批量编辑章节"
        onClose={() => setIsBulkActionModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400">价格</label>
            <input
              type="number"
              value={bulkActionData.pricePts}
              onChange={(event) => setBulkActionData((current) => ({ ...current, pricePts: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
            <p className="mt-1 text-xs text-neutral-500">留空则保持当前值不变。</p>
          </div>

          <div>
            <label className="text-sm text-neutral-400">免费预览页数</label>
            <input
              type="number"
              value={bulkActionData.previewFreePages}
              onChange={(event) =>
                setBulkActionData((current) => ({ ...current, previewFreePages: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
            <p className="mt-1 text-xs text-neutral-500">留空则保持当前值不变。</p>
          </div>

          <button
            type="button"
            onClick={handleBulkUpdate}
            disabled={bulkUpdateMutation.isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {bulkUpdateMutation.isPending ? '更新中...' : '应用更新'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="删除章节"
        message={`确定删除 ${selectedIds.length} 个选中章节吗？此操作无法撤销。`}
        confirmText={bulkDeleteMutation.isPending ? '删除中...' : '删除'}
        cancelText="取消"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      <BulkUploadModal
        isOpen={isUploadModalOpen}
        seriesId={seriesId}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
