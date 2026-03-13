'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';

import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'title', type: 'string' },
  { field: 'content', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'title', type: 'string' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'title', label: '标题' },
];

function getContentPreview(content) {
  const text = String(content || '').trim();
  return text.length > 72 ? `${text.slice(0, 72)}...` : text || '-';
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export default function AdminNotificationsPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: notifications,
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
    toggleSelect,
    selectAll,
    clearSelection,
  } = useAdminList('notifications', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const bulkDeleteMutation = useBulkDelete('notifications', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '已删除所选通知。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `删除失败：${mutationError.message}` });
    },
  });

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedIds);
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">通知管理</h1>
          <p className="mt-2 text-neutral-400">查看待处理消息，并集中清理过期站内通知。</p>
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          className="mb-6"
        />

        <AdminListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="搜索通知 ID、标题或内容"
          onOpenFilters={() => setIsFilterModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        />

        <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? '删除中...' : '删除'}
          </button>
        </AdminSelectionBar>

        <AdminTableShell
          isError={isError}
          errorMessage={error?.message || '通知加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={notifications.length > 0}
          emptyMessage="暂无通知。"
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
                    aria-label="选择全部通知"
                    checked={notifications.length > 0 && selectedIds.length === notifications.length}
                    onChange={(event) => {
                      if (event.target.checked) {
                        selectAll(notifications);
                        return;
                      }

                      clearSelection();
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
              {notifications.map((notification) => (
                <tr key={notification.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`选择通知 ${notification.id}`}
                      checked={selectedIdsSet.has(notification.id)}
                      onChange={() => toggleSelect(notification.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-300">{notification.id}</td>
                  <td className="px-4 py-3 text-neutral-300">{notification.title || '-'}</td>
                  <td className="max-w-xs px-4 py-3 text-neutral-400">{getContentPreview(notification.content)}</td>
                  <td className="px-4 py-3 text-neutral-400">{formatDate(notification.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>

        <AdminSortModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="删除所选通知"
          message={`确定删除 ${selectedIds.length} 条选中通知吗？此操作无法撤销。`}
          confirmText={bulkDeleteMutation.isPending ? '删除中...' : '删除'}
          cancelText="取消"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={handleBulkDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </div>
  );
}
