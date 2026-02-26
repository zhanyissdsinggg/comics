'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { adminFetch } from '@/lib/adminApiClient';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';

export default function AdminNotificationsPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // 使用通用的 admin 列表 hook
  const {
    items: notifications,
    isLoading,
    refetch,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedIds,
    setSelectedIds,
    selectAll,
    clearSelection,
  } = useAdminList('notifications', [], []);

  // 批量删除 mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map((id) =>
        adminFetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      setSelectedIds([]);
      setIsDeleteConfirmOpen(false);
      refetch();
    },
    onError: (error) => {
      console.error('批量删除失败:', error);
    },
  });

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedIds);
  };

  const getContentPreview = (content) => {
    const text = content || '';
    return text.length > 50 ? `${text.slice(0, 50)}...` : text;
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">通知管理</h1>
          <p className="text-neutral-400 mt-2">管理所有系统通知和消息</p>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="搜索通知..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100 placeholder-neutral-500"
          />

          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700"
          >
            🔍 高级筛选
          </button>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          >
            {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
          </button>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-blue-900/20 border border-blue-700 flex items-center justify-between">
            <span className="text-blue-300">已选择 {selectedIds.length} 项</span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={bulkDeleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {bulkDeleteMutation.isPending ? '删除中...' : '删除'}
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

        {/* 通知列表 */}
        {isLoading ? (
          <LoadingState.Spinner size="md" />
        ) : notifications.length > 0 ? (
          <div className="rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === notifications.length && notifications.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll(notifications);
                          } else {
                            clearSelection();
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">标题</th>
                    <th className="px-4 py-3 text-left text-neutral-400">内容</th>
                    <th className="px-4 py-3 text-left text-neutral-400">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notif) => (
                    <tr key={notif.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(notif.id)}
                          onChange={() => {
                            if (selectedIds.includes(notif.id)) {
                              setSelectedIds(selectedIds.filter((id) => id !== notif.id));
                            } else {
                              setSelectedIds([...selectedIds, notif.id]);
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-300 font-medium">{notif.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{notif.title}</td>
                      <td className="px-4 py-3 text-neutral-400 max-w-xs truncate">
                        {getContentPreview(notif.content)}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <LoadingState.EmptyState message="暂无通知" />
        )}
      </div>

      {/* 高级筛选模态框 */}
      <Modal
        isOpen={isFilterModalOpen}
        title="高级筛选"
        onClose={() => setIsFilterModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400">排序字段</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="createdAt">创建时间</option>
              <option value="title">标题</option>
            </select>
          </div>

          <button
            onClick={() => setIsFilterModalOpen(false)}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            应用筛选
          </button>
        </div>
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="确认删除"
        message={`确定要删除这 ${selectedIds.length} 条通知吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
