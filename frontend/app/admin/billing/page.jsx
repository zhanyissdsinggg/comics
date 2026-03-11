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
  { field: 'name', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'price', type: 'number' },
  { field: 'points', type: 'number' },
  { field: 'name', type: 'string' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'price', label: '价格' },
  { value: 'points', label: '积分' },
  { value: 'name', label: '名称' },
];

export default function AdminBillingPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: packages,
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
  } = useAdminList('billing', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const bulkDeleteMutation = useBulkDelete('billing', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '充值包删除成功。' });
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
          <h1 className="text-3xl font-bold text-neutral-100">账单管理</h1>
          <p className="mt-2 text-neutral-400">管理充值包和定价项，批量删除的结果会直接反馈到页面。</p>
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          className="mb-6"
        />

                        <AdminListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="搜索充值包 ID 或名称..."
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
          errorMessage={error?.message || '\u5145\u503c\u5305\u52a0\u8f7d\u5931\u8d25\u3002'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={packages.length > 0}
          emptyMessage={'\u6682\u65e0\u5145\u503c\u5305'}
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
                        checked={selectedIds.length === packages.length && packages.length > 0}
                        onChange={(event) => {
                          if (event.target.checked) {
                            selectAll(packages);
                            return;
                          }

                          clearSelection();
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">{"\u540d\u79f0"}</th>
                    <th className="px-4 py-3 text-left text-neutral-400">{"\u4ef7\u683c"}</th>
                    <th className="px-4 py-3 text-left text-neutral-400">{"\u79ef\u5206"}</th>
                    <th className="px-4 py-3 text-left text-neutral-400">{"\u521b\u5efa\u65f6\u95f4"}</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg) => (
                    <tr key={pkg.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(pkg.id)}
                          onChange={() => toggleSelect(pkg.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-300">{pkg.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{pkg.name || '-'}</td>
                      <td className="px-4 py-3 font-medium text-emerald-400">${Number(pkg.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-blue-400">{pkg.points ?? 0}</td>
                      <td className="px-4 py-3 text-neutral-400">
                        {pkg.createdAt ? new Date(pkg.createdAt).toLocaleDateString('zh-CN') : '-'}
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
        message={`确定要删除这 ${selectedIds.length} 个充值包吗？此操作不可撤销。`}
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
