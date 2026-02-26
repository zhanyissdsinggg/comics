'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';

export default function AdminOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('');

  // 获取订单列表
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'orders', { searchTerm, statusFilter, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/admin/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const orders = ordersData?.orders || [];

  // 批量退款 mutation
  const bulkRefundMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map((id) => {
        const order = orders.find((o) => o.id === id);
        if (!order) return Promise.resolve();

        return fetch(`/api/admin/orders/${id}/refund`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: order.userId }),
        });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      setSelectedIds([]);
      setIsBulkActionModalOpen(false);
      refetch();
    },
  });

  // 批量删除 mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map((id) =>
        fetch(`/api/admin/orders/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          },
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      setSelectedIds([]);
      setIsDeleteConfirmOpen(false);
      refetch();
    },
  });

  const handleBulkRefund = () => bulkRefundMutation.mutate(selectedIds);
  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);

  // 过滤和排序
  const filteredOrders = useMemo(() => {
    let result = orders ? [...orders] : [];

    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.id.toString().includes(term) ||
          order.orderId?.toString().includes(term) ||
          order.userId?.toString().includes(term)
      );
    }

    // 排序
    result.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'createdAt') {
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
      } else if (sortBy === 'amount') {
        aVal = Number(a.amount) || 0;
        bVal = Number(b.amount) || 0;
      } else if (sortBy === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, searchTerm, sortBy, sortOrder]);

  // 处理批量退款
  const handleBulkRefund = async () => {
    try {
      for (const id of selectedIds) {
        const order = orders.find((o) => o.id === id);
        if (!order) continue;

        await fetch(`/api/admin/orders/${id}/refund`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: order.userId }),
        });
      }

      setSelectedIds([]);
      setIsBulkActionModalOpen(false);
      refetch();
    } catch (error) {
      console.error('批量退款失败:', error);
    }
  };

  // 处理批量删除
  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await fetch(`/api/admin/orders/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          },
        });
      }

      setSelectedIds([]);
      setIsDeleteConfirmOpen(false);
      refetch();
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  };

  // 处理导出
  const handleExport = () => {
    const exportData = filteredOrders.filter((o) => selectedIds.includes(o.id));
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
                onClick={() => {
                  setBulkActionType('refund');
                  setIsBulkActionModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 text-sm"
              >
                退款
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm"
              >
                导出
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
              >
                删除
              </button>
              <button
                onClick={() => setSelectedIds([])}
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
                            setSelectedIds(filteredOrders.map((o) => o.id));
                          } else {
                            setSelectedIds([]);
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
                          checked={selectedIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, order.id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== order.id));
                            }
                          }}
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
                            onClick={() => {
                              setSelectedIds([order.id]);
                              setBulkActionType('refund');
                              setIsBulkActionModalOpen(true);
                            }}
                            className="text-orange-400 hover:text-orange-300 text-sm"
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
            <label className="text-sm text-neutral-400">订单状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="">全部</option>
              <option value="PENDING">待支付</option>
              <option value="PAID">已支付</option>
              <option value="COMPLETED">已完成</option>
              <option value="REFUNDED">已退款</option>
              <option value="FAILED">失败</option>
            </select>
          </div>

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

      {/* 批量操作确认对话框 */}
      <ConfirmDialog
        isOpen={isBulkActionModalOpen}
        title="确认退款"
        message={`确定要为这 ${selectedIds.length} 个订单进行退款吗？`}
        confirmText="确认退款"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkRefund}
        onCancel={() => setIsBulkActionModalOpen(false)}
      />

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
