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
  { field: 'label', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'price', type: 'number' },
  { field: 'points', type: 'number' },
  { field: 'name', type: 'string' },
  { field: 'active', type: 'boolean' },
];

const sortOptions = [
  { value: 'createdAt', label: 'Created date' },
  { value: 'price', label: 'Price' },
  { value: 'points', label: 'Points' },
  { value: 'name', label: 'Name' },
  { value: 'active', label: 'Status' },
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

function formatCurrency(value, currency = 'USD') {
  const amount = Number(value || 0);
  const normalizedCurrency = typeof currency === 'string' && currency.trim() ? currency : 'USD';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export default function AdminBillingPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
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
      setFeedback({ type: 'success', message: 'Selected billing packages were deleted.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Delete failed: ${mutationError.message}` });
    },
  });

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedIds);
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">Billing Packages</h1>
          <p className="mt-2 text-neutral-400">
            Manage top-up packages and pricing records used across the storefront.
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
          searchPlaceholder="Search package ID, name, or label"
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
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </AdminSelectionBar>

        <AdminTableShell
          isError={isError}
          errorMessage={error?.message || 'Failed to load billing packages.'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={packages.length > 0}
          emptyMessage="No billing packages yet."
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
                    aria-label="Select all billing packages"
                  />
                </th>
                <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                <th className="px-4 py-3 text-left text-neutral-400">Package</th>
                <th className="px-4 py-3 text-left text-neutral-400">Price</th>
                <th className="px-4 py-3 text-left text-neutral-400">Points</th>
                <th className="px-4 py-3 text-left text-neutral-400">Status</th>
                <th className="px-4 py-3 text-left text-neutral-400">Created date</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const isActive = pkg.active !== false;
                const points = pkg.points != null ? Number(pkg.points) : Number(pkg.paidPts ?? 0) + Number(pkg.bonusPts ?? 0);

                return (
                  <tr key={pkg.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIdsSet.has(pkg.id)}
                        onChange={() => toggleSelect(pkg.id)}
                        className="rounded"
                        aria-label={`Select package ${pkg.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-300">{pkg.id}</td>
                    <td className="px-4 py-3 text-neutral-300">
                      <div className="font-medium text-neutral-200">{pkg.name || 'Untitled package'}</div>
                      {pkg.label ? <div className="mt-1 text-xs text-neutral-500">{pkg.label}</div> : null}
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-400">
                      {formatCurrency(pkg.price, pkg.currency)}
                    </td>
                    <td className="px-4 py-3 text-blue-400">{points}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          isActive
                            ? 'bg-emerald-900/30 text-emerald-300'
                            : 'bg-neutral-700 text-neutral-300'
                        }`}
                      >
                        {isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{formatDate(pkg.createdAt)}</td>
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
          title="Sort billing packages"
          label="Sort field"
          actionLabel="Apply"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete billing packages"
          message={`Delete ${selectedIds.length} selected billing package(s)? This cannot be undone.`}
          confirmText={bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
          cancelText="Cancel"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={handleBulkDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </div>
  );
}

