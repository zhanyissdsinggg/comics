'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, MessageSquare, RefreshCw, Search, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'subject', type: 'string' },
  { field: 'userId', type: 'string' },
  { field: 'userEmail', type: 'string' },
  { field: 'message', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'updatedAt', type: 'date' },
  { field: 'status', type: 'string' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
  { value: 'OPEN', label: 'Open (legacy)' },
  { value: 'IN_PROGRESS', label: 'In progress (legacy)' },
  { value: 'CLOSED', label: 'Closed (legacy)' },
];

const DEFAULT_PAGE_SIZE = 20;

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getStatusLabel(status) {
  switch (String(status || '').toLowerCase()) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In progress';
    case 'closed':
      return 'Closed';
    default:
      return status || '-';
  }
}

function getStatusColor(status) {
  switch (String(status || '').toLowerCase()) {
    case 'open':
      return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20';
    case 'in_progress':
      return 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20';
    case 'closed':
      return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20';
    default:
      return 'bg-neutral-800 text-neutral-300 ring-1 ring-neutral-700';
  }
}

function getMessagePreview(message, limit = 120) {
  const normalized = String(message || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'No message provided';
  }

  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

export default function AdminSupportPage() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: tickets,
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
    filters,
    setFilter,
    clearFilters,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useAdminList('support', searchFields, sortFields, 'createdAt', 'desc');

  const statusFilter = typeof filters.status === 'string' ? filters.status : '';
  const hasActiveFilters = Boolean(searchTerm.trim() || statusFilter);
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const bulkDeleteMutation = useBulkDelete('support', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: 'Tickets deleted.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Delete failed: ${mutationError.message}` });
    },
  });

  const replyTicketMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const response = await adminFetch(`/api/admin/support/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, 'Failed to send the reply.'));
      }

      return response.json();
    },
    onSuccess: () => {
      setReplyContent('');
      setSelectedTicket(null);
      setIsReplyModalOpen(false);
      setFeedback({ type: 'success', message: 'Reply sent.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Reply failed: ${mutationError.message}` });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId) => {
      const response = await adminFetch(`/api/admin/support/${ticketId}/close`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, 'Failed to close the ticket.'));
      }

      return response.json();
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Ticket closed.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Close failed: ${mutationError.message}` });
    },
  });

  const openReplyModal = (ticket) => {
    setSelectedTicket(ticket);
    setReplyContent('');
    setIsReplyModalOpen(true);
  };

  const handleReplyTicket = () => {
    const message = replyContent.trim();

    if (!selectedTicket?.id || !message) {
      setFeedback({ type: 'error', message: 'Reply content is required.' });
      return;
    }

    replyTicketMutation.mutate({ ticketId: selectedTicket.id, message });
  };

  const handleCloseTicket = (ticketId) => {
    closeTicketMutation.mutate(ticketId);
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedIds);
  };

  const resetControls = () => {
    setSearchTerm('');
    clearFilters();
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    clearSelection();
    setFeedback({ type: '', message: '' });
  };

  return (
    <div className="space-y-6 p-6 text-neutral-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Support Tickets</h1>
          <p className="max-w-2xl text-sm text-neutral-400">
            Manage live support tickets directly from this page. Search by email, subject, or message content, then reply or close issues without leaving the workflow.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-400">
          Current results <span className="font-semibold text-white">{pagination.total}</span> items
        </div>
      </div>

      <AdminFeedbackBanner feedback={feedback} onDismiss={() => setFeedback({ type: '', message: '' })} />

      <section className="rounded-3xl border border-neutral-800 bg-neutral-950/80 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
            <Search className="h-4 w-4 text-neutral-500" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search ticket ID, user ID, email, subject, or message"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setFilter('status', event.target.value)}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="createdAt">Created date</option>
              <option value="updatedAt">Updated date</option>
              <option value="status">Status</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:border-neutral-700 hover:bg-neutral-800"
            >
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>

          <div className="flex gap-3 lg:justify-end">
            <button
              type="button"
              onClick={resetControls}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-800"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete selected
            </button>
        </div>
        </div>
      </section>

      <AdminTableShell
        isError={isError}
        errorMessage={error?.message || 'Failed to load tickets.'}
        onRetry={refetch}
        isLoading={isLoading}
        hasItems={tickets.length > 0}
        emptyMessage={hasActiveFilters ? 'No tickets match the current filters.' : 'No tickets yet.'}
        loadingFallback={<LoadingState isLoading={true} count={6} height="h-24" />}
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        containerClassName="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/90 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]"
        paginationProps={{
          containerClassName:
            'flex flex-col gap-3 border-t border-neutral-800 bg-neutral-900/70 px-4 py-4 text-sm text-neutral-400 lg:flex-row lg:items-center lg:justify-between',
          pageSizeSelectClassName:
            'rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none',
          buttonClassName:
            'rounded-xl border border-neutral-700 px-3 py-2 text-sm text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50',
        }}
      >
            <table className="min-w-full divide-y divide-neutral-800 text-sm">
              <thead className="bg-neutral-900/90 text-left text-xs uppercase tracking-[0.16em] text-neutral-500">
                <tr>
                  <th className="px-4 py-4">
                    <input
                      type="checkbox"
                      aria-label="Select all tickets"
                      checked={tickets.length > 0 && selectedIds.length === tickets.length}
                      onChange={(event) => {
                        if (event.target.checked) {
                          selectAll(tickets);
                          return;
                        }

                        clearSelection();
                      }}
                      className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
                    />
                  </th>
                  <th className="px-4 py-4">Ticket</th>
                  <th className="px-4 py-4">User</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Created</th>
                  <th className="px-4 py-4">Updated</th>
                  <th className="px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="align-top transition hover:bg-neutral-900/80">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ticket ${ticket.id}`}
                        checked={selectedIdsSet.has(ticket.id)}
                        onChange={() => toggleSelect(ticket.id)}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <div className="font-medium text-white">{ticket.subject || 'Untitled ticket'}</div>
                        <div className="text-xs text-neutral-500">#{ticket.id}</div>
                        <p className="max-w-xl text-sm leading-6 text-neutral-300">{getMessagePreview(ticket.message)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-white">
                          <Mail className="h-4 w-4 text-neutral-500" />
                          <span>{ticket.userEmail || 'No email linked'}</span>
                        </div>
                        <div className="text-xs text-neutral-500">User ID: {ticket.userId || '-'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-neutral-300">{formatDateTime(ticket.createdAt)}</td>
                    <td className="px-4 py-4 text-neutral-300">{formatDateTime(ticket.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-2">
                        <button
                          type="button"
                          onClick={() => openReplyModal(ticket)}
                          disabled={replyTicketMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-medium text-white transition hover:border-neutral-600 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Reply
                        </button>

                        {String(ticket.status || '').toLowerCase() !== 'closed' ? (
                          <button
                            type="button"
                            onClick={() => handleCloseTicket(ticket.id)}
                            disabled={closeTicketMutation.isPending}
                            className="rounded-full border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Close ticket
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-500">Ticket already closed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
      </AdminTableShell>

      <Modal
        isOpen={isReplyModalOpen}
        title="Reply to ticket"
        subtitle={selectedTicket ? `${selectedTicket.subject || 'Untitled ticket'} - ${selectedTicket.userEmail || selectedTicket.userId}` : ''}
        onClose={() => {
          setIsReplyModalOpen(false);
          setSelectedTicket(null);
          setReplyContent('');
        }}
      >
        <div className="space-y-4">
          {selectedTicket ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
              <p className="font-medium text-white">Original message</p>
              <p className="mt-2 leading-6 text-neutral-400">{selectedTicket.message || 'No message provided'}</p>
            </div>
          ) : null}

          <textarea
            value={replyContent}
            onChange={(event) => setReplyContent(event.target.value)}
            placeholder="Write the reply that will be sent to the user"
            rows={7}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500"
          />

          <button
            type="button"
            onClick={handleReplyTicket}
            disabled={!replyContent.trim() || replyTicketMutation.isPending}
            className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {replyTicketMutation.isPending ? 'Sending...' : 'Send reply'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete selected tickets"
        message={`Delete ${selectedIds.length} selected ticket(s)? This action cannot be undone.`}
        confirmText={bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
