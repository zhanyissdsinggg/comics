'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, MessageSquare, RefreshCw, Trash2 } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { Modal } from '@/components/admin/common/Modal';
import {
  AdminBadge,
  AdminDataTable,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
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

function formatDateTime(value) {
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
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
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
      return status || 'Unknown';
  }
}

function getStatusTone(status) {
  switch (String(status || '').toLowerCase()) {
    case 'open':
      return 'warning';
    case 'in_progress':
      return 'accent';
    case 'closed':
      return 'success';
    default:
      return 'default';
  }
}

function getMessagePreview(message, limit = 140) {
  const normalized = String(message || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'No message was included.';
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
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasActiveFilters = Boolean(searchTerm.trim() || statusFilter);

  const openCount = useMemo(
    () => tickets.filter((ticket) => String(ticket.status || '').toLowerCase() === 'open').length,
    [tickets],
  );
  const pendingReplies = useMemo(
    () =>
      tickets.filter((ticket) => String(ticket.status || '').toLowerCase() !== 'closed').length,
    [tickets],
  );

  const bulkDeleteMutation = useBulkDelete('support', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: 'The selected tickets were removed.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Could not remove the selected tickets: ${mutationError.message}` });
    },
  });

  const replyTicketMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const response = await adminFetch(`/api/admin/support/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, 'Could not send the reply.'));
      }

      return response.json();
    },
    onSuccess: () => {
      setReplyContent('');
      setSelectedTicket(null);
      setIsReplyModalOpen(false);
      setFeedback({ type: 'success', message: 'The reply was sent.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Could not send the reply: ${mutationError.message}` });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId) => {
      const response = await adminFetch(`/api/admin/support/${ticketId}/close`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, 'Could not close the ticket.'));
      }

      return response.json();
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'The ticket was closed.' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Could not close the ticket: ${mutationError.message}` });
    },
  });

  const resetControls = () => {
    setSearchTerm('');
    clearFilters();
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
    setPageSize(20);
    clearSelection();
    setFeedback({ type: '', message: '' });
  };

  const openReplyModal = (ticket) => {
    setSelectedTicket(ticket);
    setReplyContent('');
    setIsReplyModalOpen(true);
  };

  const handleReplyTicket = () => {
    const message = replyContent.trim();

    if (!selectedTicket?.id || !message) {
      setFeedback({ type: 'error', message: 'Reply text cannot be empty.' });
      return;
    }

    replyTicketMutation.mutate({ ticketId: selectedTicket.id, message });
  };

  return (
    <AdminShell
      title="Support"
      subtitle="Keep support work readable: what the ticket is about, who sent it, and what should happen next."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="Tickets in view"
            value={String(pagination.total)}
            detail="The current support queue after search and status filters."
            tone="accent"
          />
          <AdminMetricCard
            label="Open tickets"
            value={String(openCount)}
            detail="Readers still waiting for a first operator response."
          />
          <AdminMetricCard
            label="Needs follow-up"
            value={String(pendingReplies)}
            detail="Tickets that are not yet marked closed."
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="Support queue"
          description="Search by subject, user, or ticket ID. Keep the action row compact so the message itself stays readable."
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={resetControls}>
                <RefreshCw className="size-4" />
                Reset view
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
              >
                <Trash2 className="size-4" />
                Delete selected
              </Button>
            </div>
          }
        >
          <div className="mb-6 grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_220px_220px_auto]">
            <label className="relative">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by ticket ID, user, subject, or message..."
                className={adminInputClassName}
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setFilter('status', event.target.value)}
              className={adminSelectClassName}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className={adminSelectClassName}
            >
              <option value="createdAt">Created time</option>
              <option value="updatedAt">Updated time</option>
              <option value="status">Status</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? 'Oldest first' : 'Newest first'}
            </Button>
          </div>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || 'The support queue could not be loaded.'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={tickets.length > 0}
            emptyMessage={
              hasActiveFilters ? 'No tickets match the current filters.' : 'No support tickets yet.'
            }
            pagination={pagination}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          >
            <AdminDataTable className="border-0 shadow-none">
              <table className="w-full min-w-[980px]">
                <AdminTableHeader>
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
                        className="h-4 w-4 rounded border-black/20 bg-transparent"
                      />
                    </th>
                    <th className="px-4 py-4">Ticket</th>
                    <th className="px-4 py-4">Reader</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Created</th>
                    <th className="px-4 py-4">Updated</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </AdminTableHeader>
                <tbody>
                  {tickets.map((ticket) => (
                    <AdminTableRow key={ticket.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ticket ${ticket.id}`}
                          checked={selectedIdsSet.has(ticket.id)}
                          onChange={() => toggleSelect(ticket.id)}
                          className="h-4 w-4 rounded border-black/20 bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-950">{ticket.subject || 'Untitled ticket'}</p>
                          <p className="text-xs text-slate-500">#{ticket.id}</p>
                          <p className="max-w-xl text-sm leading-6 text-slate-600">
                            {getMessagePreview(ticket.message)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span>{ticket.userEmail || 'No email listed'}</span>
                          </div>
                          <p className="text-xs text-slate-500">User ID: {ticket.userId || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={getStatusTone(ticket.status)}>
                          {getStatusLabel(ticket.status)}
                        </AdminBadge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDateTime(ticket.createdAt)}</td>
                      <td className="px-4 py-4 text-slate-600">{formatDateTime(ticket.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openReplyModal(ticket)}
                            disabled={replyTicketMutation.isPending}
                          >
                            <MessageSquare className="size-4" />
                            Reply
                          </Button>

                          {String(ticket.status || '').toLowerCase() !== 'closed' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => closeTicketMutation.mutate(ticket.id)}
                              disabled={closeTicketMutation.isPending}
                            >
                              Close ticket
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500">Already closed</span>
                          )}
                        </div>
                      </td>
                    </AdminTableRow>
                  ))}
                </tbody>
              </table>
            </AdminDataTable>
          </AdminTableShell>
        </AdminPageSection>
      </div>

      <Modal
        isOpen={isReplyModalOpen}
        title="Reply to ticket"
        subtitle={
          selectedTicket
            ? `${selectedTicket.subject || 'Untitled ticket'} · ${selectedTicket.userEmail || selectedTicket.userId || 'Unknown reader'}`
            : ''
        }
        onClose={() => {
          setIsReplyModalOpen(false);
          setSelectedTicket(null);
          setReplyContent('');
        }}
        size="lg"
      >
        <div className="space-y-4">
          {selectedTicket ? (
            <div className="rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.78)] px-4 py-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-950">Original message</p>
              <p className="mt-2 leading-6">{selectedTicket.message || 'No message was included.'}</p>
            </div>
          ) : null}

          <AdminFormField label="Reply" helperText="Keep replies direct, calm, and specific to the reader's request.">
            <textarea
              value={replyContent}
              onChange={(event) => setReplyContent(event.target.value)}
              placeholder="Write the response you want to send..."
              rows={7}
              className={adminTextareaClassName}
            />
          </AdminFormField>

          <Button
            type="button"
            onClick={handleReplyTicket}
            disabled={!replyContent.trim() || replyTicketMutation.isPending}
          >
            {replyTicketMutation.isPending ? 'Sending...' : 'Send reply'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete selected tickets"
        message={`Delete ${selectedIds.length} selected ticket${selectedIds.length === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText={bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete tickets'}
        cancelText="Cancel"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </AdminShell>
  );
}
