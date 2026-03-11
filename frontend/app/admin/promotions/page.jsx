'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { adminFetch } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';


// 老王注释：定义可搜索的字段
const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'title', type: 'string' },
];

// 老王注释：定义可排序的字段
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

export default function AdminPromotionsPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // 老王说：用useAdminList Hook替代所有搜索、排序、筛选逻辑
  const {
    items: filteredPromotions,
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

  // 性能优化：用 Set 替代 includes() 查询
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 老王说：用useBulkDelete Hook替代handleBulkDelete async函数
  const bulkDeleteMutation = useBulkDelete('promotions', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '批量删除促销活动成功。' });
      refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: `删除失败: ${error.message}` });
    },
  });

  // 老王说：用useMutation替代handleToggleStatus async函数
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ promotionId, currentStatus }) => {
      const response = await adminFetch(`/api/admin/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (!response.ok) throw new Error('更新促销活动状态失败');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.currentStatus ? '促销活动已禁用。' : '促销活动已启用。',
      });
      refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: `更新失败: ${error.message}` });
    },
  });

  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);

  const handleToggleStatus = (promotionId, currentStatus) => {
    toggleStatusMutation.mutate({ promotionId, currentStatus });
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">促销管理</h1>
          <p className="text-neutral-400 mt-2">管理所有促销活动和优惠</p>
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          className="mb-6"
        />

        {/* 工具栏 */}
                        <AdminListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="搜索促销活动..."
          onOpenFilters={() => setIsFilterModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        />

                <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={bulkDeleteMutation.isPending}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? '删除中...' : '删除'}
          </button>
        </AdminSelectionBar>

        <AdminTableShell
          isError={isError}
          errorMessage={error?.message || '\u4fc3\u9500\u6d3b\u52a8\u52a0\u8f7d\u5931\u8d25\u3002'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={filteredPromotions.length > 0}
          emptyMessage={'\u6682\u65e0\u4fc3\u9500\u6d3b\u52a8'}
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
                        checked={selectedIds.length === filteredPromotions.length && filteredPromotions.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll(filteredPromotions);
                          } else {
                            clearSelection();
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">标题</th>
                    <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                    <th className="px-4 py-3 text-left text-neutral-400">创建时间</th>
                    <th className="px-4 py-3 text-left text-neutral-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPromotions.map((promo) => (
                    <tr key={promo.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(promo.id)}
                          onChange={() => toggleSelect(promo.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-300 font-medium">{promo.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{promo.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            promo.active
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-neutral-700 text-neutral-400'
                          }`}
                        >
                          {promo.active ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {promo.createdAt ? new Date(promo.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(promo.id, promo.active)}
                          disabled={toggleStatusMutation.isPending}
                          className={`text-sm disabled:opacity-50 ${
                            promo.active
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-green-400 hover:text-green-300'
                          }`}
                        >
                          {promo.active ? '禁用' : '启用'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
        </AdminTableShell>
      </div>

      {/* 高级筛选模态框 */}
            <AdminSortModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        options={sortOptions}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="确认删除"
        message={`确定要删除这 ${selectedIds.length} 个促销活动吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
