'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';

import AdminShell from '@/components/admin/AdminShell';
import {
  OrdersSummaryCards,
  OrdersTableSection,
} from '@/components/admin/orders-workspace/sections';
import {
  buildOrdersExportCsv,
  buildOrdersMetricCards,
  isRefunded,
  searchFields,
  sortFields,
  sortOptions,
} from '@/components/admin/orders-workspace/utils';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkMutation } from '@/lib/hooks/useBulkMutation';

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
  const metricCards = useMemo(
    () =>
      buildOrdersMetricCards({
        total: pagination.total,
        refundedCount,
        revenueInView,
      }),
    [pagination.total, refundedCount, revenueInView],
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
    const csv = buildOrdersExportCsv(orders, selectedIdsSet);

    if (!csv) {
      setFeedback({ type: 'error', message: '请至少选择一笔订单后再导出。' });
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `订单-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell title="订单" subtitle="处理订单、退款和支付异常。">
      <div className="space-y-6">
        <OrdersSummaryCards cards={metricCards} />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <OrdersTableSection
          onExport={handleExport}
          exportDisabled={selectedIds.length === 0}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onOpenSortModal={() => setIsSortModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          selectedIds={selectedIds}
          clearSelection={clearSelection}
          onBulkRefund={() => bulkRefundMutation.mutate(selectedIds)}
          refundPending={bulkRefundMutation.isPending}
          onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
          deletePending={bulkDeleteMutation.isPending}
          isError={isError}
          errorMessage={error?.message || '订单列表加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={orders.length > 0}
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          orders={orders}
          selectedIdsSet={selectedIdsSet}
          onSelectAll={(checked) => {
            if (checked) {
              selectAll(orders);
              return;
            }
            clearSelection();
          }}
          onToggleSelect={toggleSelect}
          onRefundOne={(orderId) => bulkRefundMutation.mutate([orderId])}
        />
      </div>

      <AdminSortModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        options={sortOptions}
        title="订单排序"
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
