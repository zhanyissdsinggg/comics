'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'title', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'title', type: 'string' },
  { field: 'active', type: 'boolean' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'title', label: '标题' },
  { value: 'active', label: '状态' },
];

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

export default function AdminPromotionsPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: promotions,
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
  } = useAdminList('promotions', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const bulkDeleteMutation = useBulkDelete('promotions', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '已删除所选活动。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `删除失败：${mutationError.message}` });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ promotionId, currentStatus }) => {
      const response = await adminFetch(`/api/admin/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '更新活动状态失败。'));
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.currentStatus ? '活动已暂停。' : '活动已启用。',
      });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `状态更新失败：${mutationError.message}` });
    },
  });

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">活动管理</h1>
          <p className="mt-2 text-neutral-400">
            管理营销活动，并控制当前生效的优惠内容。
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
          searchPlaceholder="搜索活动 ID 或标题"
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
          errorMessage={error?.message || '活动加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={promotions.length > 0}
          emptyMessage="暂无活动。"
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
                    checked={selectedIds.length === promotions.length && promotions.length > 0}
                    onChange={(event) => {
                      if (event.target.checked) {
                        selectAll(promotions);
                        return;
                      }

                      clearSelection();
                    }}
                    className="rounded"
                    aria-label="选择全部活动"
                  />
                </th>
                <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                <th className="px-4 py-3 text-left text-neutral-400">活动</th>
                <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                <th className="px-4 py-3 text-left text-neutral-400">创建时间</th>
                <th className="px-4 py-3 text-left text-neutral-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promotion) => {
                const isActive = promotion.active !== false;

                return (
                  <tr key={promotion.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIdsSet.has(promotion.id)}
                        onChange={() => toggleSelect(promotion.id)}
                        className="rounded"
                        aria-label={`选择活动 ${promotion.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-300">{promotion.id}</td>
                    <td className="px-4 py-3 text-neutral-300">{promotion.title || '未命名活动'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          isActive
                            ? 'bg-green-900/30 text-green-300'
                            : 'bg-neutral-700 text-neutral-300'
                        }`}
                      >
                        {isActive ? '进行中' : '未启用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{formatDate(promotion.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatusMutation.mutate({ promotionId: promotion.id, currentStatus: isActive })}
                        disabled={toggleStatusMutation.isPending}
                        className={`text-sm font-medium disabled:opacity-50 ${
                          isActive
                            ? 'text-red-400 hover:text-red-300'
                            : 'text-green-400 hover:text-green-300'
                        }`}
                      >
                        {isActive ? '暂停' : '启用'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTableShell>

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="活动排序"
          label="排序字段"
          actionLabel="应用"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="删除活动"
          message={`确定删除 ${selectedIds.length} 条选中活动吗？此操作无法撤销。`}
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
