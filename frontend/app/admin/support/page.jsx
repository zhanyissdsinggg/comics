'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import {
  SupportQueueSection,
  SupportReplyModal,
  SupportSummaryCards,
} from '@/components/admin/support-workspace/sections';
import { STATUS_OPTIONS } from '@/components/admin/support-workspace/utils';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'subject', type: 'string' },
  { field: 'userId', type: 'string' },
  { field: 'userEmail', type: 'string' },
  { field: 'message', type: 'string' },
  { field: 'adminReply', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'updatedAt', type: 'date' },
  { field: 'status', type: 'string' },
];

function readReplyPersistenceCapability(meta) {
  if (!meta || typeof meta !== 'object') {
    return true;
  }

  const capabilities = meta.capabilities;
  if (!capabilities || typeof capabilities !== 'object') {
    return true;
  }

  return capabilities.replyPersistence !== false;
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
    meta,
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
  const replyPersistence = readReplyPersistenceCapability(meta);
  const replyUnavailableMessage =
    '当前数据库还没应用客服回复字段迁移，客服页暂时只支持查看和关单，回复按钮已停用。';

  const openCount = useMemo(
    () => tickets.filter((ticket) => String(ticket.status || '').toLowerCase() === 'open').length,
    [tickets],
  );
  const pendingReplies = useMemo(
    () => tickets.filter((ticket) => String(ticket.status || '').toLowerCase() !== 'closed').length,
    [tickets],
  );

  const bulkDeleteMutation = useBulkDelete('support', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '已删除所选工单。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `删除所选工单失败：${mutationError.message}` });
    },
  });

  const replyTicketMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const response = await adminFetch(`/api/admin/support/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '发送回复失败。'));
      }

      return response.json();
    },
    onSuccess: () => {
      setReplyContent('');
      setSelectedTicket(null);
      setIsReplyModalOpen(false);
      setFeedback({ type: 'success', message: '回复已发送。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `发送回复失败：${mutationError.message}` });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId) => {
      const response = await adminFetch(`/api/admin/support/${ticketId}/close`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '关闭工单失败。'));
      }

      return response.json();
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: '工单已关闭。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `关闭工单失败：${mutationError.message}` });
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
    if (!replyPersistence) {
      setFeedback({ type: 'error', message: replyUnavailableMessage });
      return;
    }

    setSelectedTicket(ticket);
    setReplyContent(ticket?.adminReply || '');
    setIsReplyModalOpen(true);
  };

  const handleReplyTicket = () => {
    if (!replyPersistence) {
      setFeedback({ type: 'error', message: replyUnavailableMessage });
      return;
    }

    const message = replyContent.trim();

    if (!selectedTicket?.id || !message) {
      setFeedback({ type: 'error', message: '回复内容不能为空。' });
      return;
    }

    replyTicketMutation.mutate({ ticketId: selectedTicket.id, message });
  };

  return (
    <AdminShell title="客服" subtitle="查看工单和下一步动作。">
      <div className="space-y-6">
        <SupportSummaryCards
          total={pagination.total}
          openCount={openCount}
          pendingReplies={pendingReplies}
        />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <SupportQueueSection
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => setFilter('status', value)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          onReset={resetControls}
          selectedIds={selectedIds}
          clearSelection={clearSelection}
          onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
          deletePending={bulkDeleteMutation.isPending}
          isError={isError}
          errorMessage={error?.message || '客服队列加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={tickets.length > 0}
          emptyMessage={
            hasActiveFilters ? '当前筛选条件下没有匹配的工单。' : '当前还没有客服工单。'
          }
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          tickets={tickets}
          selectedIdsSet={selectedIdsSet}
          onSelectAll={(checked) => {
            if (checked) {
              selectAll(tickets);
              return;
            }
            clearSelection();
          }}
          onToggleSelect={toggleSelect}
          onOpenReply={openReplyModal}
          replyPending={replyTicketMutation.isPending}
          onCloseTicket={(ticketId) => closeTicketMutation.mutate(ticketId)}
          closePending={closeTicketMutation.isPending}
          statusOptions={STATUS_OPTIONS}
          replyEnabled={replyPersistence}
          replyDisabledMessage={replyPersistence ? '' : replyUnavailableMessage}
        />
      </div>

      <SupportReplyModal
        isOpen={isReplyModalOpen}
        selectedTicket={selectedTicket}
        replyContent={replyContent}
        onReplyContentChange={setReplyContent}
        onClose={() => {
          setIsReplyModalOpen(false);
          setSelectedTicket(null);
          setReplyContent('');
        }}
        onSubmit={handleReplyTicket}
        isPending={replyTicketMutation.isPending}
        replyEnabled={replyPersistence}
        replyDisabledMessage={replyPersistence ? '' : replyUnavailableMessage}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="删除所选工单"
        message={`确定删除 ${selectedIds.length} 条已选工单吗？此操作无法撤销。`}
        confirmText={bulkDeleteMutation.isPending ? '删除中...' : '删除工单'}
        cancelText="取消"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </AdminShell>
  );
}
