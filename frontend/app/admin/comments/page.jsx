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
  { field: 'userEmail', type: 'string' },
  { field: 'content', type: 'string' },
  { field: 'text', type: 'string' },
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
  return text.length > 96 ? `${text.slice(0, 96)}...` : text || '-';
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

function formatRating(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  const rating = Number(value);
  if (!Number.isFinite(rating)) {
    return 'N/A';
  }

  return `${rating}/5`;
}

export default function AdminCommentsPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
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
        setFeedback({ type: 'success', message: '已删除所选评论。' });
      refetch();
    },
    onError: (mutationError) => {
        setFeedback({ type: 'error', message: `删除失败：${mutationError.message}` });
    },
  });

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">评论管理</h1>
          <p className="mt-2 text-neutral-400">
            查看读者反馈，并移除不符合审核规范的评论。
          </p>
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          className="mb-6"
        />

        <AdminListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="搜索评论 ID、用户 ID、邮箱或内容"
          onOpenFilters={() => setIsSortModalOpen(true)}
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
          errorMessage={error?.message || '评论加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={comments.length > 0}
          emptyMessage="暂无评论。"
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
                    aria-label="选择全部评论"
                  />
                </th>
                <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                <th className="px-4 py-3 text-left text-neutral-400">用户</th>
                <th className="px-4 py-3 text-left text-neutral-400">评论内容</th>
                <th className="px-4 py-3 text-left text-neutral-400">评分</th>
                <th className="px-4 py-3 text-left text-neutral-400">创建时间</th>
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
                      aria-label={`选择评论 ${comment.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-300">{comment.id}</td>
                  <td className="px-4 py-3 text-neutral-300">{comment.userEmail || comment.userId || '-'}</td>
                  <td className="max-w-md px-4 py-3 text-neutral-400">{getContentPreview(comment.content || comment.text)}</td>
                  <td className="px-4 py-3 text-yellow-400">{formatRating(comment.rating)}</td>
                  <td className="px-4 py-3 text-neutral-400">{formatDate(comment.createdAt)}</td>
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
          title="评论排序"
          label="排序字段"
          actionLabel="应用"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="删除评论"
          message={`确定删除 ${selectedIds.length} 条选中评论吗？此操作无法撤销。`}
          confirmText={bulkDeleteMutation.isPending ? '删除中...' : '删除'}
          cancelText="取消"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </div>
  );
}
