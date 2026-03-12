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
  { value: 'createdAt', label: 'Created date' },
  { value: 'rating', label: 'Rating' },
  { value: 'userId', label: 'User ID' },
];

function getContentPreview(content) {
  const text = String(content || '').trim();
  return text.length > 96 ? `${text.slice(0, 96)}...` : text || '-';
}

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

function formatRating(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  const rating = Number(value);
  if (!Number.isFinite(rating)) {
    return 'N/A';
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

  const bulkDeleteMutation = useBulkDelete('comments', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: 'Selected comments were deleted.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Delete failed: ${mutationError.message}` });
    },
  });

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">Comments</h1>
          <p className="mt-2 text-neutral-400">
            Review reader feedback and remove comments that do not meet moderation standards.
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
          searchPlaceholder="Search comment ID, user ID, email, or content"
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
          errorMessage={error?.message || 'Failed to load comments.'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={comments.length > 0}
          emptyMessage="No comments yet."
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
                <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                <th className="px-4 py-3 text-left text-neutral-400">User</th>
                <th className="px-4 py-3 text-left text-neutral-400">Comment</th>
                <th className="px-4 py-3 text-left text-neutral-400">Rating</th>
                <th className="px-4 py-3 text-left text-neutral-400">Created date</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment) => (
                <tr key={comment.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIdsSet.has(comment.id)}
                      onChange={() => toggleSelect(comment.id)}
                      className="rounded"
                      aria-label={`Select comment ${comment.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-300">{comment.id}</td>
                  <td className="px-4 py-3 text-neutral-300">{comment.userEmail || comment.userId || '-'}</td>
                  <td className="max-w-md px-4 py-3 text-neutral-400">{getContentPreview(comment.content || comment.text)}</td>
                  <td className="px-4 py-3 text-yellow-400">{formatRating(comment.rating)}</td>
                  <td className="px-4 py-3 text-neutral-400">{formatDate(comment.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="Sort comments"
          label="Sort field"
          actionLabel="Apply"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete comments"
          message={`Delete ${selectedIds.length} selected comment(s)? This cannot be undone.`}
          confirmText={bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
          cancelText="Cancel"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </div>
  );
}
