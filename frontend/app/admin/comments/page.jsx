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
  AdminBadge,
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
  { field: 'userId', type: 'string' },
  { field: 'userEmail', type: 'string' },
  { field: 'content', type: 'string' },
  { field: 'text', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'userId', type: 'string' },
  { field: 'rating', type: 'number' },
];

const sortOptions = [
  { value: 'createdAt', label: 'Created time' },
  { value: 'rating', label: 'Rating' },
  { value: 'userId', label: 'Reader ID' },
];

function getContentPreview(content) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 120)}...` : text || 'No comment text';
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatRating(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not rated';
  }

  const rating = Number(value);
  if (!Number.isFinite(rating)) {
    return 'Not rated';
  }

  return `${rating}/5`;
}

export default function AdminCommentsPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: comments,
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
  } = useAdminList('comments', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const ratedCount = useMemo(
    () => comments.filter((comment) => comment.rating !== null && comment.rating !== undefined && comment.rating !== '').length,
    [comments],
  );
  const uniqueReaders = useMemo(
    () => new Set(comments.map((comment) => comment.userEmail || comment.userId).filter(Boolean)).size,
    [comments],
  );

  const bulkDeleteMutation = useBulkDelete('comments', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: 'The selected comments were removed.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Could not remove the selected comments: ${mutationError.message}` });
    },
  });

  return (
    <AdminShell
      title="Comments"
      subtitle="Review reader feedback in a calmer moderation queue, then remove the items that should no longer stay live."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="Comments in view"
            value={String(pagination.total)}
            detail="The current moderation list after search and sorting."
            tone="accent"
          />
          <AdminMetricCard
            label="Rated comments"
            value={String(ratedCount)}
            detail="Entries that still include a star score alongside the written feedback."
          />
          <AdminMetricCard
            label="Readers in view"
            value={String(uniqueReaders)}
            detail="Unique readers represented in this current queue."
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="Moderation queue"
          description="Keep the table readable: who wrote the comment, what it says, and whether it needs action."
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="Search comment ID, reader ID, email, or text"
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
              {bulkDeleteMutation.isPending ? 'Removing...' : 'Delete comments'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || 'Comments could not be loaded.'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={comments.length > 0}
            emptyMessage="No comments match this view yet."
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
                      checked={selectedIds.length === comments.length && comments.length > 0}
                      onChange={(event) => {
                        if (event.target.checked) {
                          selectAll(comments);
                          return;
                        }

                        clearSelection();
                      }}
                      className="rounded"
                      aria-label="Select all comments"
                    />
                  </th>
                  <th className="px-4 py-3">Comment</th>
                  <th className="px-4 py-3">Reader</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </AdminTableHeader>
              <tbody>
                {comments.map((comment) => (
                  <AdminTableRow key={comment.id}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIdsSet.has(comment.id)}
                        onChange={() => toggleSelect(comment.id)}
                        className="rounded"
                        aria-label={`Select comment ${comment.id}`}
                      />
                    </td>
                    <td className="max-w-[34rem] px-4 py-4">
                      <div className="font-medium text-slate-950">{getContentPreview(comment.content || comment.text)}</div>
                      <div className="mt-1 text-xs text-slate-500">{comment.id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">{comment.userEmail || comment.userId || 'Unknown reader'}</div>
                      {comment.userEmail && comment.userId ? (
                        <div className="mt-1 text-xs text-slate-500">{comment.userId}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <AdminBadge tone={comment.rating ? 'warning' : 'default'}>{formatRating(comment.rating)}</AdminBadge>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(comment.createdAt)}</td>
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
          title="Sort comments"
          label="Sort by"
          actionLabel="Apply"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete comments"
          message={`Delete ${selectedIds.length} selected comment${selectedIds.length === 1 ? '' : 's'}?`}
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
