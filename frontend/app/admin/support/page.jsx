'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, MessageSquare, RefreshCw, Trash2 } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
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
  { value: '', label: '全部状态' },
  { value: 'open', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'closed', label: '已关闭' },
  { value: 'OPEN', label: '待处理（旧状态）' },
  { value: 'IN_PROGRESS', label: '处理中（旧状态）' },
  { value: 'CLOSED', label: '已关闭（旧状态）' },
];

function formatDateTime(value) {
  if (!value) {
    return '暂无';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
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
      return '待处理';
    case 'in_progress':
      return '处理中';
    case 'closed':
      return '已关闭';
    default:
      return status || '未知';
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
    return '未附带消息内容。';
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
    setSelectedTicket(ticket);
    setReplyContent('');
    setIsReplyModalOpen(true);
  };

  const handleReplyTicket = () => {
    const message = replyContent.trim();

    if (!selectedTicket?.id || !message) {
      setFeedback({ type: 'error', message: '回复内容不能为空。' });
      return;
    }

    replyTicketMutation.mutate({ ticketId: selectedTicket.id, message });
  };

  return (
    <AdminShell
      title="客服"
      subtitle="把工单主题、发件人和下一步动作讲清楚，让客服页面先保持可读，再谈效率。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="当前视图工单数"
            value={String(pagination.total)}
            detail="当前搜索和状态筛选后的工单总量。"
            tone="accent"
          />
          <AdminMetricCard
            label="待处理工单"
            value={String(openCount)}
            detail="还没有拿到首次回复的读者工单。"
          />
          <AdminMetricCard
            label="仍需跟进"
            value={String(pendingReplies)}
            detail="尚未关闭、还可能需要继续处理的工单。"
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="客服队列"
          description="按主题、用户或工单 ID 搜索，让操作行保持克制，把消息正文留给真正需要判断的人。"
          action={
            <Button type="button" variant="outline" onClick={resetControls}>
              <RefreshCw className="size-4" />
              重置视图
            </Button>
          }
        >
          <div className="mb-6 grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_220px_220px_auto]">
            <label className="relative">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索工单 ID、用户、主题或消息内容..."
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
              <option value="createdAt">创建时间</option>
              <option value="updatedAt">更新时间</option>
              <option value="status">状态</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '最早创建优先' : '最新创建优先'}
            </Button>
          </div>

          <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
            >
              <Trash2 className="size-4" />
              删除已选
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
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
          >
            <AdminDataTable className="border-0 shadow-none">
              <table className="w-full min-w-[980px]">
                <AdminTableHeader>
                  <tr>
                    <th className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label="选择全部工单"
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
                    <th className="px-4 py-4">工单</th>
                    <th className="px-4 py-4">读者</th>
                    <th className="px-4 py-4">状态</th>
                    <th className="px-4 py-4">创建时间</th>
                    <th className="px-4 py-4">更新时间</th>
                    <th className="px-4 py-4">操作</th>
                  </tr>
                </AdminTableHeader>
                <tbody>
                  {tickets.map((ticket) => (
                    <AdminTableRow key={ticket.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`选择工单 ${ticket.id}`}
                          checked={selectedIdsSet.has(ticket.id)}
                          onChange={() => toggleSelect(ticket.id)}
                          className="h-4 w-4 rounded border-black/20 bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-950">{ticket.subject || '未命名工单'}</p>
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
                            <span>{ticket.userEmail || '未填写邮箱'}</span>
                          </div>
                          <p className="text-xs text-slate-500">用户 ID：{ticket.userId || '-'}</p>
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
                            回复
                          </Button>

                          {String(ticket.status || '').toLowerCase() !== 'closed' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => closeTicketMutation.mutate(ticket.id)}
                              disabled={closeTicketMutation.isPending}
                            >
                              关闭工单
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500">已关闭</span>
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
        title="回复工单"
        subtitle={
          selectedTicket
            ? `${selectedTicket.subject || '未命名工单'} · ${selectedTicket.userEmail || selectedTicket.userId || '未知读者'}`
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
              <p className="font-semibold text-slate-950">原始消息</p>
              <p className="mt-2 leading-6">{selectedTicket.message || '未附带消息内容。'}</p>
            </div>
          ) : null}

          <AdminFormField label="回复内容" helperText="回复保持直接、克制，并准确回应读者这次提出的问题。">
            <textarea
              value={replyContent}
              onChange={(event) => setReplyContent(event.target.value)}
              placeholder="输入你要发送给读者的回复..."
              rows={7}
              className={adminTextareaClassName}
            />
          </AdminFormField>

          <Button
            type="button"
            onClick={handleReplyTicket}
            disabled={!replyContent.trim() || replyTicketMutation.isPending}
          >
            {replyTicketMutation.isPending ? '发送中...' : '发送回复'}
          </Button>
        </div>
      </Modal>

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

