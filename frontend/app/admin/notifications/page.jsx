'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import {
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'title', type: 'string' },
  { field: 'content', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'title', type: 'string' },
];

const sortOptions = [
  { value: 'createdAt', label: 'Created time' },
  { value: 'title', label: 'Title' },
];

function getContentPreview(content) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 120)}...` : text || 'No message body';
}

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

export default function AdminNotificationsPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: notifications,
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
  } = useAdminList('notifications', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const titledCount = useMemo(
    () => notifications.filter((notification) => String(notification.title || '').trim()).length,
    [notifications],
  );
  const bodyCount = useMemo(
    () => notifications.filter((notification) => String(notification.content || '').trim()).length,
    [notifications],
  );

  const bulkDeleteMutation = useBulkDelete('notifications', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: 'The selected notifications were removed.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Could not remove the selected notifications: ${mutationError.message}` });
    },
  });

  return (
    <AdminShell
      title="Notifications"
      subtitle="Manage the notices readers actually receive, and keep the backlog easy to scan without turning it into a noisy campaign board."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="Notifications in view"
            value={String(pagination.total)}
            detail="The current list after search and sort settings."
            tone="accent"
          />
          <AdminMetricCard
            label="With titles"
            value={String(titledCount)}
            detail="Notices that already have a reader-facing headline."
          />
          <AdminMetricCard
            label="With body copy"
            value={String(bodyCount)}
            detail="Entries that include message text instead of title-only stubs."
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="Reader notices"
          description="Use the list to review message quality, trim stale notices, and confirm the queue still reads cleanly."
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="Search notification ID, title, or text"
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
              {bulkDeleteMutation.isPending ? 'Removing...' : 'Delete notices'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || 'Notifications could not be loaded.'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={notifications.length > 0}
            emptyMessage="No notifications match this view yet."
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
                      checked={selectedIds.length === notifications.length && notifications.length > 0}
                      onChange={(event) => {
                        if (event.target.checked) {
                          selectAll(notifications);
                          return;
                        }

                        clearSelection();
                      }}
                      className="rounded"
                      aria-label="Select all notifications"
                    />
                  </th>
                  <th className="px-4 py-3">Notification</th>
                  <th className="px-4 py-3">Preview</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </AdminTableHeader>
              <tbody>
                {notifications.map((notification) => (
                  <AdminTableRow key={notification.id}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIdsSet.has(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        className="rounded"
                        aria-label={`Select notification ${notification.id}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">{notification.title || 'Untitled notice'}</div>
                      <div className="mt-1 text-xs text-slate-500">{notification.id}</div>
                    </td>
                    <td className="max-w-[36rem] px-4 py-4 text-slate-600">
                      {getContentPreview(notification.content)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(notification.createdAt)}</td>
                  </AdminTableRow>
                ))}
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
          title="Sort notifications"
          label="Sort by"
          actionLabel="Apply"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete notifications"
          message={`Delete ${selectedIds.length} selected notification${selectedIds.length === 1 ? '' : 's'}?`}
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

