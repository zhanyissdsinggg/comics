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
  { value: 'createdAt', label: 'Created date' },
  { value: 'amount', label: 'Amount' },
  { value: 'status', label: 'Status' },
];

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
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
      return 'Pending';
    case 'PAID':
      return 'Paid';
    case 'COMPLETED':
      return 'Completed';
    case 'REFUNDED':
      return 'Refunded';
    case 'FAILED':
      return 'Failed';
    case 'CHARGEBACK':
      return 'Chargeback';
    case 'TIMEOUT':
      return 'Timed out';
    default:
      return status || 'Unknown';
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
        setFeedback({ type: 'success', message: 'Refunds were started for the selected orders.' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `Could not start the refund flow: ${mutationError.message}` });
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
        setFeedback({ type: 'success', message: 'The selected orders were removed.' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `Could not remove the selected orders: ${mutationError.message}` });
      },
    },
  );

  const handleExport = () => {
    const exportData = orders.filter((order) => selectedIdsSet.has(order.id));
    if (exportData.length === 0) {
      setFeedback({ type: 'error', message: 'Select at least one order before exporting.' });
      return;
    }

    const csv = [
      ['Order ID', 'User ID', 'Amount', 'Status', 'Created'].join(','),
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
    link.setAttribute('download', `orders-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell
      title="Orders"
      subtitle="A quieter finance-adjacent view for reader purchases, refund handling, and payment exceptions. The page stays story-platform aware without turning into an accounting console."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="Orders in view"
            value={String(pagination.total)}
            detail="The current result set after search and sort."
            tone="accent"
          />
          <AdminMetricCard
            label="Refunded"
            value={String(refundedCount)}
            detail="Orders already marked as refunded in this view."
          />
          <AdminMetricCard
            label="Amount in view"
            value={formatAmount(revenueInView)}
            detail="A quick snapshot of the visible order volume."
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="Order queue"
          description="Search by order or user ID, then handle refunds or exports without burying the table under heavy finance chrome."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={selectedIds.length === 0}
            >
              <Download className="size-4" />
              Export selected
            </Button>
          }
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="Search by order ID or user ID..."
            onOpenFilters={() => setIsSortModalOpen(true)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            filtersLabel="Sort"
            ascendingLabel="Oldest first"
            descendingLabel="Newest first"
          />

          <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            <Button
              type="button"
              variant="outline"
              onClick={() => bulkRefundMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || bulkRefundMutation.isPending}
            >
              <RotateCcw className="size-4" />
              {bulkRefundMutation.isPending ? 'Starting refunds...' : 'Start refunds'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
            >
              <Trash2 className="size-4" />
              {bulkDeleteMutation.isPending ? 'Removing...' : 'Delete'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || 'The orders view could not be loaded.'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={orders.length > 0}
            emptyMessage="No orders match this view yet."
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
                        aria-label="Select all orders"
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
                    <th className="px-4 py-4">Order</th>
                    <th className="px-4 py-4">Reader</th>
                    <th className="px-4 py-4">Amount</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Created</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </AdminTableHeader>
                <tbody>
                  {orders.map((order) => (
                    <AdminTableRow key={order.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select order ${order.id}`}
                          checked={selectedIdsSet.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="h-4 w-4 rounded border-black/20 bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-950">{order.id}</p>
                          <p className="text-xs text-slate-500">
                            {order.orderId ? `Gateway ID: ${order.orderId}` : 'Internal order record'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{order.userId || 'Unknown user'}</td>
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
                            Start refund
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">Refund already recorded</span>
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
        title="Sort orders"
        label="Sort by"
        actionLabel="Done"
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete selected orders"
        message={`Delete ${selectedIds.length} selected order${selectedIds.length === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText="Delete orders"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </AdminShell>
  );
}

