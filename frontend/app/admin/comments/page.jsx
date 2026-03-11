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
  { field: 'userId', type: 'string' },
  { field: 'content', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'userId', type: 'string' },
  { field: 'rating', type: 'number' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'rating', label: '评分' },
  { value: 'userId', label: '用户 ID' },
];

function getContentPreview(content) {
  const text = String(content || '').trim();
  return text.length > 72 ? `${text.slice(0, 72)}...` : text || '-';
}

export default function AdminCommentsPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: comments,
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
  } = useAdminList('comments', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const bulkDeleteMutation = useBulkDelete('comments', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '评论删除成功。' });
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
          <h1 className="text-3xl font-bold text-neutral-100">评论管理</h1>
          <p className="mt-2 text-neutral-400">管理所有用户评论和评分，删除失败会直接反馈到界面而不是只打控制台。</p>
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          className="mb-6"
        />

                        <AdminListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="搜索评论 ID、用户 ID 或内容..."
          onOpenFilters={() => setIsFilterModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        />

                <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
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
          errorMessage={error?.message || '\u8bc4\u8bba\u52a0\u8f7d\u5931\u8d25\u3002'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={comments.length > 0}
          emptyMessage={'\u6682\u65e0\u8bc4\u8bba'}
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
                        checked={selectedIds.length === comments.length && comments.length > 0}
                        onChange={(event) => {
                          if (event.target.checked) {
                            selectAll(comments);
                            return;
                          }

                          clearSelection();
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">{"\u7528\u6237 ID"}</th>
                    <th className="px-4 py-3 text-left text-neutral-400">{"\u5185\u5bb9"}</th>
                    <th className="px-4 py-3 text-left text-neutral-400">{"\u8bc4\u5206"}</th>
                    <th className="px-4 py-3 text-left text-neutral-400">{"\u521b\u5efa\u65f6\u95f4"}</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map((comment) => (
                    <tr key={comment.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(comment.id)}
                          onChange={() => toggleSelect(comment.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-300">{comment.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{comment.userId || '-'}</td>
                      <td className="max-w-xs px-4 py-3 text-neutral-400">{getContentPreview(comment.content || comment.text)}</td>
                      <td className="px-4 py-3">
                        {comment.rating ? (
                          <span className="font-medium text-yellow-400">{comment.rating}{"\u2605"}</span>
                        ) : (
                          <span className="text-neutral-500">{"\u65e0"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
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
        title="确认删除"
        message={`确定要删除这 ${selectedIds.length} 条评论吗？此操作不可撤销。`}
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
