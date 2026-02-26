'use client';

import React, { useState, useMemo } from 'react';

import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { useAdminList, SearchFieldConfig, SortFieldConfig } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';


// 老王注释：定义可搜索的字段
const searchFields: SearchFieldConfig[] = [
  { field: 'id', type: 'string' },
  { field: 'title', type: 'string' },
];

// 老王注释：定义可排序的字段
const sortFields: SortFieldConfig[] = [
  { field: 'createdAt', type: 'date' },
  { field: 'title', type: 'string' },
  { field: 'active', type: 'boolean' },
];

export default function AdminPromotionsPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // 老王说：用useAdminList Hook替代所有搜索、排序、筛选逻辑
  const {
    items: filteredPromotions,
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
  } = useAdminList('promotions', searchFields, sortFields, 'createdAt', 'desc');

  // 性能优化：用 Set 替代 includes() 查询
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 老王说：用useBulkDelete Hook替代handleBulkDelete async函数
  const bulkDeleteMutation = useBulkDelete('promotions', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      refetch();
    },
    onError: (error) => {
      alert(`删除失败: ${error.message}`);
    },
  });

  // 老王说：用useMutation替代handleToggleStatus async函数
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ promotionId, currentStatus }: { promotionId: string; currentStatus: boolean }) => {
      const response = await adminFetch(`/api/admin/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (!response.ok) throw new Error('更新促销活动状态失败');
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`);
    },
  });

  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);

  const handleToggleStatus = (promotionId: string, currentStatus: boolean) => {
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

        {/* 工具栏 */}
        <div className="mb-6 flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="搜索促销活动..."
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

        {/* 促销活动列表 */}
        {isLoading ? (
          <LoadingState.Spinner size="md" />
        ) : filteredPromotions.length > 0 ? (
          <div className="rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden">
            <div className="overflow-x-auto">
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
            </div>
          </div>
        ) : (
          <LoadingState.EmptyState message="暂无促销活动" />
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
              <option value="active">状态</option>
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
