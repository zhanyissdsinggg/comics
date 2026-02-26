'use client';

export const dynamic = 'error';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { BulkUploadModal } from '@/components/admin/episodes/BulkUploadModal';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkMutation } from '@/lib/hooks/useBulkMutation';
import { adminFetch } from '@/lib/adminApiClient';

// 定义可搜索的字段
const searchFields = [
  { field: 'number', type: 'number' },
  { field: 'title', type: 'string' },
];

// 定义可排序的字段
const sortFields = [
  { field: 'number', type: 'number' },
  { field: 'title', type: 'string' },
  { field: 'pricePts', type: 'number' },
];

export default function AdminEpisodesPage() {
  const params = useParams();
  const seriesId = params.id;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newEpisode, setNewEpisode] = useState({
    number: '',
    title: '',
    pricePts: 0,
    previewFreePages: 0,
    ttfEligible: false,
  });
  const [bulkActionData, setBulkActionData] = useState({
    pricePts: '',
    previewFreePages: '',
  });

  // 用 useAdminList Hook 替代所有搜索、排序、筛选逻辑
  const {
    items: episodes,
    isLoading,
    refetch,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useAdminList(`series/${seriesId}/episodes`, searchFields, sortFields, 'number', 'asc');

  // 添加剧集 mutation
  const addEpisodeMutation = useMutation({
    mutationFn: async (data) => {
      const response = await adminFetch(`/api/admin/series/${seriesId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: parseInt(data.number),
          title: data.title,
          pricePts: parseInt(data.pricePts) || 0,
          previewFreePages: parseInt(data.previewFreePages) || 0,
          ttfEligible: data.ttfEligible,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '添加剧集失败');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsAddModalOpen(false);
      setNewEpisode({
        number: '',
        title: '',
        pricePts: 0,
        previewFreePages: 0,
        ttfEligible: false,
      });
      refetch();
    },
    onError: (error) => {
      alert(`添加失败: ${error.message}`);
    },
  });

  // 批量更新 mutation - 用 useBulkMutation
  const bulkUpdateMutation = useBulkMutation(
    {
      endpoint: `series/${seriesId}/episodes`,
      method: 'PATCH',
      bodyBuilder: (id) => {
        const episode = episodes.find((ep) => ep.id === id);
        if (!episode) return {};
        return {
          ...episode,
          pricePts: bulkActionData.pricePts ? parseInt(bulkActionData.pricePts) : episode.pricePts,
          previewFreePages: bulkActionData.previewFreePages
            ? parseInt(bulkActionData.previewFreePages)
            : episode.previewFreePages,
        };
      },
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsBulkActionModalOpen(false);
        setBulkActionData({ pricePts: '', previewFreePages: '' });
        refetch();
      },
      onError: (error) => {
        alert(`批量更新失败: ${error.message}`);
      },
    }
  );

  // 批量删除 mutation - 用 useBulkMutation
  const bulkDeleteMutation = useBulkMutation(
    {
      endpoint: `series/${seriesId}/episodes`,
      method: 'DELETE',
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsDeleteConfirmOpen(false);
        refetch();
      },
      onError: (error) => {
        alert(`批量删除失败: ${error.message}`);
      },
    }
  );

  // 单个剧集更新 mutation
  const updateEpisodeMutation = useMutation({
    mutationFn: async ({ episodeId, field, value }) => {
      const episode = episodes.find((ep) => ep.id === episodeId);
      if (!episode) throw new Error('剧集不存在');

      const response = await adminFetch(`/api/admin/series/${seriesId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...episode,
          [field]: field === 'ttfEligible' ? value : field.includes('Pts') || field.includes('Pages') ? parseInt(value) || 0 : value,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新剧集失败');
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`);
    },
  });

  const handleAddEpisode = () => {
    if (!newEpisode.number || !newEpisode.title) {
      alert('请填写剧集号和标题');
      return;
    }
    addEpisodeMutation.mutate(newEpisode);
  };

  const handleBulkUpdate = () => {
    if (!bulkActionData.pricePts && !bulkActionData.previewFreePages) {
      alert('请至少填写一个要更新的字段');
      return;
    }
    bulkUpdateMutation.mutate(selectedIds);
  };

  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);
  const handleEpisodeUpdate = (episodeId, field, value) => updateEpisodeMutation.mutate({ episodeId, field, value });

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">剧集管理</h1>
          <p className="text-neutral-400 mt-2">管理作品的所有剧集</p>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="搜索剧集..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100 placeholder-neutral-500"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100"
          >
            <option value="number">按剧集号排序</option>
            <option value="title">按标题排序</option>
            <option value="pricePts">按价格排序</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          >
            {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="ml-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + 添加剧集
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
          >
            📦 批量上传
          </button>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-blue-900/20 border border-blue-700 flex items-center justify-between">
            <span className="text-blue-300">已选择 {selectedIds.length} 项</span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsBulkActionModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
              >
                批量编辑
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
              >
                删除
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 rounded-lg bg-neutral-700 text-neutral-300 hover:bg-neutral-600 text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 剧集列表 */}
        {isLoading ? (
          <LoadingState.Spinner size="md" />
        ) : episodes.length > 0 ? (
          <div className="rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === episodes.length && episodes.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll(episodes);
                          } else {
                            clearSelection();
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">剧集号</th>
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
                          checked={selectedIds.includes(episode.id)}
                          onChange={() => toggleSelect(episode.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-300 font-medium">{episode.number}</td>
                      <td className="px-4 py-3 text-neutral-300">{episode.title}</td>
                      <td className="px-4 py-3 text-neutral-300">
                        <input
                          type="number"
                          value={episode.pricePts || 0}
                          onChange={(e) => handleEpisodeUpdate(episode.id, 'pricePts', e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-100"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-300">
                        <input
                          type="number"
                          value={episode.previewFreePages || 0}
                          onChange={(e) => handleEpisodeUpdate(episode.id, 'previewFreePages', e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-100"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={episode.ttfEligible || false}
                          onChange={(e) => handleEpisodeUpdate(episode.id, 'ttfEligible', e.target.checked)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            clearSelection();
                            toggleSelect(episode.id);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <LoadingState.EmptyState message="暂无剧集" />
        )}
      </div>

      {/* 添加剧集模态框 */}
      <Modal
        isOpen={isAddModalOpen}
        title="添加剧集"
        onClose={() => setIsAddModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400">剧集号</label>
            <input
              type="number"
              value={newEpisode.number}
              onChange={(e) => setNewEpisode({ ...newEpisode, number: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">标题</label>
            <input
              type="text"
              value={newEpisode.title}
              onChange={(e) => setNewEpisode({ ...newEpisode, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">价格</label>
            <input
              type="number"
              value={newEpisode.pricePts}
              onChange={(e) => setNewEpisode({ ...newEpisode, pricePts: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">免费预览页数</label>
            <input
              type="number"
              value={newEpisode.previewFreePages}
              onChange={(e) => setNewEpisode({ ...newEpisode, previewFreePages: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ttf-eligible"
              checked={newEpisode.ttfEligible}
              onChange={(e) => setNewEpisode({ ...newEpisode, ttfEligible: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="ttf-eligible" className="text-sm text-neutral-400">
              TTF 资格
            </label>
          </div>

          <button
            onClick={handleAddEpisode}
            disabled={addEpisodeMutation.isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {addEpisodeMutation.isPending ? '添加中...' : '添加'}
          </button>
        </div>
      </Modal>

      {/* 批量编辑模态框 */}
      <Modal
        isOpen={isBulkActionModalOpen}
        title="批量编辑"
        onClose={() => setIsBulkActionModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400">价格（留空则不修改）</label>
            <input
              type="number"
              value={bulkActionData.pricePts}
              onChange={(e) => setBulkActionData({ ...bulkActionData, pricePts: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">免费预览页数（留空则不修改）</label>
            <input
              type="number"
              value={bulkActionData.previewFreePages}
              onChange={(e) => setBulkActionData({ ...bulkActionData, previewFreePages: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>

          <button
            onClick={handleBulkUpdate}
            disabled={bulkUpdateMutation.isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {bulkUpdateMutation.isPending ? '更新中...' : '确认更新'}
          </button>
        </div>
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="确认删除"
        message={`确定要删除这 ${selectedIds.length} 个剧集吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      {/* 批量上传模态框 */}
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

