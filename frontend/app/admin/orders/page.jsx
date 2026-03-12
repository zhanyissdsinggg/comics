'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';

import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
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
  { value: 'createdAt', label: 'Created date' },
  { value: 'amount', label: 'Amount' },
  { value: 'status', label: 'Status' },
];

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function getStatusLabel(status) {
  const statusMap = {
    PENDING: 'Pending',
    PAID: 'Paid',
    COMPLETED: 'Completed',
    REFUNDED: 'Refunded',
    FAILED: 'Failed',
    CHARGEBACK: 'Chargeback',
    pending: 'Pending',
    paid: 'Paid',
    completed: 'Completed',
    refunded: 'Refunded',
    failed: 'Failed',
    chargeback: 'Chargeback',
  };

  return statusMap[status] || status || '-';
}

function getStatusColor(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return 'bg-amber-900/30 text-amber-400';
    case 'PAID':
    case 'COMPLETED':
      return 'bg-emerald-900/30 text-emerald-400';
    case 'REFUNDED':
      return 'bg-sky-900/30 text-sky-400';
    case 'FAILED':
    case 'CHARGEBACK':
      return 'bg-red-900/30 text-red-400';
    default:
      return 'bg-neutral-700 text-neutral-300';
  }
}

function isRefunded(status) {
  return String(status || '').toUpperCase() === 'REFUNDED';
}

export default function AdminOrdersPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
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
        setFeedback({ type: 'success', message: 'Selected orders were refunded.' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `Refund failed: ${mutationError.message}` });
      },
    }
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
        setFeedback({ type: 'success', message: 'Selected orders were deleted.' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `Delete failed: ${mutationError.message}` });
      },
    }
  );

  const handleBulkRefund = () => bulkRefundMutation.mutate(selectedIds);
  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);

  const handleExport = () => {
    const exportData = orders.filter((order) => selectedIdsSet.has(order.id));
    if (exportData.length === 0) {
      setFeedback({ type: 'error', message: 'Select at least one order to export.' });
      return;
    }

    const csv = [
      ['Order ID', 'User ID', 'Amount', 'Status', 'Created'].join(','),
      ...exportData.map((order) =>
        [
          order.id,
          order.userId,
          Number(order.amount || 0).toFixed(2),
          order.status,
          formatDate(order.createdAt),
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

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">Orders</h1>
          <p className="mt-2 text-neutral-400">Manage transactions, refunds, and bulk operational cleanup from one queue.</p>
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          className="mb-6"
        />

        <AdminListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search orders by order ID or user ID"
          onOpenFilters={() => setIsFilterModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        />

        <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <button
            type="button"
            onClick={handleBulkRefund}
            disabled={selectedIds.length === 0 || bulkRefundMutation.isPending}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white transition hover:bg-orange-700 disabled:opacity-50"
          >
            {bulkRefundMutation.isPending ? 'Refunding...' : 'Refund'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedIds.length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white transition hover:bg-red-800 disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </AdminSelectionBar>

        <AdminTableShell
          isError={isError}
          errorMessage={error?.message || 'Failed to load orders.'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={orders.length > 0}
          emptyMessage="No orders yet."
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
                    aria-label="Select all orders"
                    checked={orders.length > 0 && selectedIds.length === orders.length}
                    onChange={(event) => {
                      if (event.target.checked) {
                        selectAll(orders);
                        return;
                      }
                      clearSelection();
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-neutral-400">Order ID</th>
                <th className="px-4 py-3 text-left text-neutral-400">User ID</th>
                <th className="px-4 py-3 text-left text-neutral-400">Amount</th>
                <th className="px-4 py-3 text-left text-neutral-400">Status</th>
                <th className="px-4 py-3 text-left text-neutral-400">Created</th>
                <th className="px-4 py-3 text-left text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select order ${order.id}`}
                      checked={selectedIdsSet.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-300">{order.id}</td>
                  <td className="px-4 py-3 text-neutral-300">{order.userId || '-'}</td>
                  <td className="px-4 py-3 font-medium text-emerald-400">${Number(order.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    {!isRefunded(order.status) ? (
                      <button
                        type="button"
                        onClick={() => bulkRefundMutation.mutate([order.id])}
                        disabled={bulkRefundMutation.isPending}
                        className="text-sm text-orange-400 transition hover:text-orange-300 disabled:opacity-50"
                      >
                        Refund
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      </div>

      <AdminSortModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        options={sortOptions}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete selected orders"
        message={`Delete ${selectedIds.length} selected order(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}