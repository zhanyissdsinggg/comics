'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import AdminShell from '@/components/admin/AdminShell';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import {
  AdminBadge,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'title', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'title', type: 'string' },
  { field: 'active', type: 'boolean' },
];

const sortOptions = [
  { value: 'createdAt', label: 'Created time' },
  { value: 'title', label: 'Title' },
  { value: 'active', label: 'Status' },
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

function getStatusLabel(isActive) {
  return isActive ? 'Active' : 'Paused';
}

function getStatusTone(isActive) {
  return isActive ? 'success' : 'default';
}

export default function AdminPromotionsPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: promotions,
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

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const activeCount = useMemo(
    () => promotions.filter((promotion) => promotion.active !== false).length,
    [promotions],
  );

  const bulkDeleteMutation = useBulkDelete('promotions', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: 'The selected promotions were removed.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Could not remove the selected promotions: ${mutationError.message}` });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ promotionId, currentStatus }) => {
      const response = await adminFetch(`/api/admin/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, 'Could not update the promotion status.'));
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.currentStatus ? 'The promotion was paused.' : 'The promotion is now active.',
      });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Could not update the promotion status: ${mutationError.message}` });
    },
  });

  return (
    <AdminShell
      title="Promotions"
      subtitle="Keep promotions understandable: what is live, what is paused, and what readers might still feel across the storefront."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="Promotions in view"
            value={String(pagination.total)}
            detail="The current list after search and sorting."
            tone="accent"
          />
          <AdminMetricCard
            label="Active"
            value={String(activeCount)}
            detail="Promotions that are still marked live in this result set."
          />
          <AdminMetricCard
            label="Paused"
            value={String(Math.max(promotions.length - activeCount, 0))}
            detail="Campaigns that are saved but not actively running."
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="Promotion list"
          description="Use a simple status view first. The page should tell you what the campaign is, whether it is live, and what action comes next."
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="Search promotion ID or title"
            onOpenFilters={() => setIsSortModalOpen(true)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          />

          <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Removing...' : 'Delete promotions'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || 'Promotions could not be loaded.'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={promotions.length > 0}
            emptyMessage="No promotions match this view yet."
            pagination={pagination}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          >
            <table className="min-w-full text-sm">
              <AdminTableHeader>
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === promotions.length && promotions.length > 0}
                      onChange={(event) => {
                        if (event.target.checked) {
                          selectAll(promotions);
                          return;
                        }

                        clearSelection();
                      }}
                      className="rounded"
                      aria-label="Select all promotions"
                    />
                  </th>
                  <th className="px-4 py-3">Promotion</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </AdminTableHeader>
              <tbody>
                {promotions.map((promotion) => {
                  const isActive = promotion.active !== false;
                  const isUpdating =
                    toggleStatusMutation.isPending
                    && toggleStatusMutation.variables?.promotionId === promotion.id;

                  return (
                    <AdminTableRow key={promotion.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(promotion.id)}
                          onChange={() => toggleSelect(promotion.id)}
                          className="rounded"
                          aria-label={`Select promotion ${promotion.id}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{promotion.title || 'Untitled promotion'}</div>
                        <div className="mt-1 text-xs text-slate-500">{promotion.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={getStatusTone(isActive)}>{getStatusLabel(isActive)}</AdminBadge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(promotion.createdAt)}</td>
                      <td className="px-4 py-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              promotionId: promotion.id,
                              currentStatus: isActive,
                            })
                          }
                          disabled={isUpdating}
                        >
                          {isUpdating ? 'Updating...' : isActive ? 'Pause' : 'Activate'}
                        </Button>
                      </td>
                    </AdminTableRow>
                  );
                })}
              </tbody>
            </table>
          </AdminTableShell>
        </AdminPageSection>

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="Sort promotions"
          label="Sort by"
          actionLabel="Apply"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete promotions"
          message={`Delete ${selectedIds.length} selected promotion${selectedIds.length === 1 ? '' : 's'}?`}
          confirmText="Delete"
          cancelText="Cancel"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </AdminShell>
  );
}

