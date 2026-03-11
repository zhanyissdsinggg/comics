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
import { adminFetch } from '@/lib/adminApiClient';
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
  { value: 'OPEN', label: '待处理（大写）' },
  { value: 'IN_PROGRESS', label: '处理中（大写）' },
  { value: 'CLOSED', label: '已关闭（大写）' },
];

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('zh-CN', {
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
      return '待处理';
    case 'in_progress':
      return '处理中';
    case 'closed':
      return '已关闭';
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
    return '无消息内容';
  }

  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

async function readResponseMessage(response, fallbackMessage) {
  try {
    const payload = await response.json();
    const message = payload?.message ?? payload?.error ?? payload?.details;

    if (Array.isArray(message)) {
      return message.find((item) => typeof item === 'string') || fallbackMessage;
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  } catch {
    // Ignore JSON parsing failures and try plain text next.
  }

  try {
    const text = await response.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Ignore text parsing failures and use the fallback message.
  }

  return fallbackMessage;
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

  const bulkDeleteMutation = useBulkDelete('support', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '工单删除成功。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `删除失败：${mutationError.message}` });
    },
  });

  const replyTicketMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const response = await adminFetch(`/api/admin/support/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(await readResponseMessage(response, '回复工单失败。'));
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
      setFeedback({ type: 'error', message: `回复失败：${mutationError.message}` });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId) => {
      const response = await adminFetch(`/api/admin/support/${ticketId}/close`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error(await readResponseMessage(response, '关闭工单失败。'));
      }

      return response.json();
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: '工单已关闭。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `关闭失败：${mutationError.message}` });
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
      setFeedback({ type: 'error', message: '请先填写回复内容。' });
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
    setPageSize(100);
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
            这里直接管理真实工单，不再依赖不存在的接口探测。你可以按邮箱、主题、内容检索，并快速回复或关闭问题。
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-400">
          当前结果 <span className="font-semibold text-white">{pagination.total}</span> 条
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
              placeholder="搜索工单 ID、用户 ID、邮箱、主题或内容"
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
              <option value="createdAt">按创建时间</option>
              <option value="updatedAt">按更新时间</option>
              <option value="status">按状态</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:border-neutral-700 hover:bg-neutral-800"
            >
              {sortOrder === 'asc' ? '升序' : '降序'}
            </button>
          </div>

          <div className="flex gap-3 lg:justify-end">
            <button
              type="button"
              onClick={resetControls}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-800"
            >
              <RefreshCw className="h-4 w-4" />
              重置
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              删除已选
            </button>
          </div>
        </div>
      </section>

      <AdminTableShell
        isError={isError}
        errorMessage={error?.message || '\u5de5\u5355\u52a0\u8f7d\u5931\u8d25\u3002'}
        onRetry={refetch}
        isLoading={isLoading}
        hasItems={tickets.length > 0}
        emptyMessage={'\u6682\u65e0\u5de5\u5355'}
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
                      aria-label="全选工单"
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
                  <th className="px-4 py-4">工单</th>
                  <th className="px-4 py-4">用户</th>
                  <th className="px-4 py-4">状态</th>
                  <th className="px-4 py-4">创建时间</th>
                  <th className="px-4 py-4">更新时间</th>
                  <th className="px-4 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="align-top transition hover:bg-neutral-900/80">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`选择工单 ${ticket.id}`}
                        checked={selectedIdsSet.has(ticket.id)}
                        onChange={() => toggleSelect(ticket.id)}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <div className="font-medium text-white">{ticket.subject || '未命名工单'}</div>
                        <div className="text-xs text-neutral-500">#{ticket.id}</div>
                        <p className="max-w-xl text-sm leading-6 text-neutral-300">{getMessagePreview(ticket.message)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-white">
                          <Mail className="h-4 w-4 text-neutral-500" />
                          <span>{ticket.userEmail || '未关联邮箱'}</span>
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
                          回复
                        </button>

                        {String(ticket.status || '').toLowerCase() !== 'closed' ? (
                          <button
                            type="button"
                            onClick={() => handleCloseTicket(ticket.id)}
                            disabled={closeTicketMutation.isPending}
                            className="rounded-full border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            关闭工单
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-500">该工单已关闭</span>
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
        title="回复工单"
        subtitle={selectedTicket ? `${selectedTicket.subject || '未命名工单'} · ${selectedTicket.userEmail || selectedTicket.userId}` : ''}
        onClose={() => {
          setIsReplyModalOpen(false);
          setSelectedTicket(null);
          setReplyContent('');
        }}
      >
        <div className="space-y-4">
          {selectedTicket ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
              <p className="font-medium text-white">原始消息</p>
              <p className="mt-2 leading-6 text-neutral-400">{selectedTicket.message || '无消息内容'}</p>
            </div>
          ) : null}

          <textarea
            value={replyContent}
            onChange={(event) => setReplyContent(event.target.value)}
            placeholder="输入发给用户的回复内容"
            rows={7}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500"
          />

          <button
            type="button"
            onClick={handleReplyTicket}
            disabled={!replyContent.trim() || replyTicketMutation.isPending}
            className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {replyTicketMutation.isPending ? '发送中...' : '发送回复'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="确认删除工单"
        message={`确定删除已选中的 ${selectedIds.length} 条工单吗？这个动作不可撤销。`}
        confirmText={bulkDeleteMutation.isPending ? '删除中...' : '删除'}
        cancelText="取消"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
