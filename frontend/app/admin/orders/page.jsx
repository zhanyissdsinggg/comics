'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { Download, RotateCcw, Trash2 } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import {
  AdminBadge,
  AdminDataTable,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { normalizeUSDisplayCurrency } from '@/lib/localization';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkMutation } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'orderId', type: 'string' },
  { field: 'userId', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'amount', type: 'number' },
  { field: 'status', type: 'string' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'amount', label: '金额' },
  { value: 'status', label: '状态' },
];

function formatDate(value) {
  if (!value) {
    return '暂无';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatAmount(amount, currency = 'USD') {
  const numericAmount = Number(amount || 0);
  const normalizedCurrency = normalizeUSDisplayCurrency(currency);

  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${normalizedCurrency} ${numericAmount.toFixed(2)}`;
  }
}

function getStatusLabel(status) {
  const normalized = String(status || '').toUpperCase();

  switch (normalized) {
    case 'PENDING':
      return '待支付';
    case 'PAID':
      return '已支付';
    case 'COMPLETED':
      return '已完成';
    case 'REFUNDED':
      return '已退款';
    case 'FAILED':
      return '失败';
    case 'CHARGEBACK':
      return '拒付';
    case 'TIMEOUT':
      return '已超时';
    default:
      return status || '未知';
  }
}

function getStatusTone(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return 'warning';
    case 'PAID':
    case 'COMPLETED':
      return 'success';
    case 'REFUNDED':
      return 'accent';
    case 'FAILED':
    case 'CHARGEBACK':
      return 'danger';
    default:
      return 'default';
  }
}

function isRefunded(status) {
  return String(status || '').toUpperCase() === 'REFUNDED';
}

export default function AdminOrdersPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: orders,
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
  } = useAdminList('orders', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const refundedCount = useMemo(
    () => orders.filter((order) => isRefunded(order.status)).length,
    [orders],
  );
  const revenueInView = useMemo(
    () =>
      orders.reduce((total, order) => {
        if (String(order.status || '').toUpperCase() === 'FAILED') {
          return total;
        }

        return total + Number(order.amount || 0);
      }, 0),
    [orders],
  );

  const bulkRefundMutation = useBulkMutation(
    {
      endpoint: 'orders/refund',
      method: 'POST',
      appendIdToPath: false,
      bodyBuilder: (id) => {
        const order = orders.find((item) => item.id === id);
        return { orderId: id, userId: order?.userId };
      },
    },
    {
      onSuccess: () => {
        clearSelection();
        setFeedback({ type: 'success', message: '已为所选订单发起退款。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `发起退款失败：${mutationError.message}` });
      },
    },
  );

  const bulkDeleteMutation = useBulkMutation(
    {
      endpoint: 'orders',
      method: 'DELETE',
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsDeleteConfirmOpen(false);
        setFeedback({ type: 'success', message: '已删除所选订单。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `删除所选订单失败：${mutationError.message}` });
      },
    },
  );

  const handleExport = () => {
    const exportData = orders.filter((order) => selectedIdsSet.has(order.id));
    if (exportData.length === 0) {
      setFeedback({ type: 'error', message: '请至少选择一笔订单后再导出。' });
      return;
    }

    const csv = [
      ['订单ID', '用户ID', '金额', '状态', '创建时间'].join(','),
      ...exportData.map((order) =>
        [
          order.id,
          order.userId || '',
          Number(order.amount || 0).toFixed(2),
          getStatusLabel(order.status),
          formatDate(order.createdAt),
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `订单-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell
      title="订单"
      subtitle="把读者购买、退款处理和支付异常收在一个安静工作区里，既看得清，也不会变成会计控制台。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="当前订单"
            value={String(pagination.total)}
            detail="当前搜索和排序条件下的订单数量。"
            tone="accent"
          />
          <AdminMetricCard
            label="已退款"
            value={String(refundedCount)}
            detail="当前结果里已经标记为退款的订单。"
          />
          <AdminMetricCard
            label="当前金额"
            value={formatAmount(revenueInView)}
            detail="当前可见订单金额的快速概览。"
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="订单队列"
          description="按订单或用户 ID 搜索，在不把页面做成金融控制台的前提下处理退款和导出。"
          action={
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={selectedIds.length === 0}
            >
              <Download className="size-4" />
              导出所选
            </Button>
          }
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="搜索订单 ID 或用户 ID"
            onOpenFilters={() => setIsSortModalOpen(true)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            filtersLabel="排序"
            ascendingLabel="最早优先"
            descendingLabel="最新优先"
          />

          <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            <Button
              type="button"
              variant="outline"
              onClick={() => bulkRefundMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || bulkRefundMutation.isPending}
            >
              <RotateCcw className="size-4" />
              {bulkRefundMutation.isPending ? '正在发起退款...' : '发起退款'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
            >
              <Trash2 className="size-4" />
              {bulkDeleteMutation.isPending ? '正在删除...' : '删除'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || '订单列表加载失败。'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={orders.length > 0}
            emptyMessage="当前视图下还没有匹配的订单。"
            pagination={pagination}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          >
            <AdminDataTable className="border-0 shadow-none">
              <table className="w-full min-w-[900px]">
                <AdminTableHeader>
                  <tr>
                    <th className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label="选择全部订单"
                        checked={orders.length > 0 && selectedIds.length === orders.length}
                        onChange={(event) => {
                          if (event.target.checked) {
                            selectAll(orders);
                            return;
                          }
                          clearSelection();
                        }}
                        className="h-4 w-4 rounded border-black/20 bg-transparent"
                      />
                    </th>
                    <th className="px-4 py-4">订单</th>
                    <th className="px-4 py-4">读者</th>
                    <th className="px-4 py-4">金额</th>
                    <th className="px-4 py-4">状态</th>
                    <th className="px-4 py-4">创建时间</th>
                    <th className="px-4 py-4">操作</th>
                  </tr>
                </AdminTableHeader>
                <tbody>
                  {orders.map((order) => (
                    <AdminTableRow key={order.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`选择订单 ${order.id}`}
                          checked={selectedIdsSet.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="h-4 w-4 rounded border-black/20 bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-950">{order.id}</p>
                          <p className="text-xs text-slate-500">
                            {order.orderId ? `支付网关 ID：${order.orderId}` : '站内订单记录'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{order.userId || '未知用户'}</td>
                      <td className="px-4 py-4 font-semibold text-slate-950">
                        {formatAmount(order.amount, order.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={getStatusTone(order.status)}>
                          {getStatusLabel(order.status)}
                        </AdminBadge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-4">
                        {!isRefunded(order.status) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => bulkRefundMutation.mutate([order.id])}
                            disabled={bulkRefundMutation.isPending}
                          >
                            发起退款
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">已记录退款</span>
                        )}
                      </td>
                    </AdminTableRow>
                  ))}
                </tbody>
              </table>
            </AdminDataTable>
          </AdminTableShell>
        </AdminPageSection>
      </div>

      <AdminSortModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        options={sortOptions}
        title="排序订单"
        label="排序方式"
        actionLabel="完成"
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="删除所选订单"
        message={`确定删除所选 ${selectedIds.length} 笔订单吗？此操作不可撤销。`}
        confirmText="删除订单"
        cancelText="取消"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </AdminShell>
  );
}
