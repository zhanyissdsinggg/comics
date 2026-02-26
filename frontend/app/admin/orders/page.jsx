'use client';

import React, { useState, useMemo } from 'react';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkMutation } from '@/lib/hooks/useBulkMutation';

// 老王注释：定义可搜索的字段
const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'orderId', type: 'string' },
  { field: 'userId', type: 'string' },
];

// 老王注释：定义可排序的字段
const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'amount', type: 'number' },
  { field: 'status', type: 'string' },
];

export default function AdminOrdersPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // 用 useAdminList Hook 替代所有搜索、排序、筛选逻辑
  const {
    items: filteredOrders,
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
  } = useAdminList('orders', searchFields, sortFields, 'createdAt', 'desc');

  // 性能优化：用 Set 替代 includes() 查询
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 老王说：用useBulkMutation Hook替代bulkRefundMutation
  const bulkRefundMutation = useBulkMutation(
    {
      endpoint: 'orders/refund',
      method: 'POST',
      bodyBuilder: (id) => {
        // 老王注释：这里需要从filteredOrders中找到对应的order获取userId
        const order = filteredOrders.find((o) => o.id === id);
        return { userId: order?.userId };
      },
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsBulkActionModalOpen(false);
        refetch();
      },
      onError: (error) => {
        alert(`退款失败: ${error.message}`);
      },
    }
  );

  // 老王说：用useBulkMutation Hook替代bulkDeleteMutation
  const bulkDeleteMutation = useBulkMutation(
    {
      endpoint: 'orders',
      method: 'DELETE',
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsDeleteConfirmOpen(false);
        refetch();
      },
      onError: (error) => {
        alert(`删除失败: ${error.message}`);
      },
    }
  );

  const handleBulkRefund = () => bulkRefundMutation.mutate(selectedIds);
  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);

  // 老王说：处理导出
  const handleExport = () => {
    const exportData = filteredOrders.filter((o) => selectedIdsSet.has(o.id));
    const csv = [
      ['订单ID', '用户ID', '金额', '状态', '创建时间'].join(','),
      ...exportData.map((o) =>
        [
          o.id,
          o.userId,
          Number(o.amount || 0).toFixed(2),
          o.status,
          o.createdAt ? new Date(o.createdAt).toLocaleDateString('zh-CN') : '-',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  // 状态映射
  const getStatusLabel = (status) => {
    const statusMap = {
      PENDING: '待支付',
      PAID: '已支付',
      COMPLETED: '已完成',
      REFUNDED: '已退款',
      FAILED: '失败',
      pending: '待支付',
      completed: '已完成',
      refunded: '已退款',
      failed: '失败',
    };
    return statusMap[status] || status || '-';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
      case 'pending':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'PAID':
      case 'COMPLETED':
      case 'completed':
        return 'bg-green-900/30 text-green-400';
      case 'REFUNDED':
      case 'refunded':
        return 'bg-blue-900/30 text-blue-400';
      case 'FAILED':
      case 'failed':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-neutral-700 text-neutral-300';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">订单管理</h1>
          <p className="text-neutral-400 mt-2">管理所有订单、退款和交易</p>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="搜索订单..."
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
                onClick={() => setIsBulkActionModalOpen(true)}
                disabled={bulkRefundMutation.isPending}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 text-sm disabled:opacity-50"
              >
                {bulkRefundMutation.isPending ? '退款中...' : '退款'}
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm"
              >
                导出
              </button>
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

        {/* 订单列表 */}
        {isLoading ? (
          <LoadingState.Spinner size="md" />
        ) : filteredOrders.length > 0 ? (
          <div className="rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll(filteredOrders);
                          } else {
                            clearSelection();
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">订单ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">用户ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">金额</th>
                    <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                    <th className="px-4 py-3 text-left text-neutral-400">创建时间</th>
                    <th className="px-4 py-3 text-left text-neutral-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-300 font-medium">{order.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{order.userId}</td>
                      <td className="px-4 py-3 text-emerald-400 font-medium">
                        ${Number(order.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {order.status !== 'REFUNDED' && order.status !== 'refunded' && (
                          <button
                            onClick={() => bulkRefundMutation.mutate([order.id])}
                            disabled={bulkRefundMutation.isPending}
                            className="text-orange-400 hover:text-orange-300 text-sm disabled:opacity-50"
                          >
                            退款
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <LoadingState.EmptyState message="暂无订单" />
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
              <option value="amount">金额</option>
              <option value="status">状态</option>
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
        message={`确定要删除这 ${selectedIds.length} 个订单吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
