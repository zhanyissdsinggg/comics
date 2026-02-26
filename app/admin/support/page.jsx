'use client';

import React, { useState, useMemo } from 'react';

import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { useAdminList, SearchFieldConfig, SortFieldConfig } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';


// 老王注释：定义可搜索的字段
const searchFields: SearchFieldConfig[] = [
  { field: 'id', type: 'string' },
  { field: 'subject', type: 'string' },
  { field: 'userId', type: 'string' },
];

// 老王注释：定义可排序的字段
const sortFields: SortFieldConfig[] = [
  { field: 'createdAt', type: 'date' },
  { field: 'status', type: 'string' },
];

export default function AdminSupportPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // 老王说：用useAdminList Hook替代所有搜索、排序、筛选逻辑
  const {
    items: filteredTickets,
    isLoading,
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
  } = useAdminList('support', searchFields, sortFields, 'createdAt', 'desc');

  // 性能优化：用 Set 替代 includes() 查询
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 老王说：用useBulkDelete Hook替代handleBulkDelete async函数
  const bulkDeleteMutation = useBulkDelete('support', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      refetch();
    },
    onError: (error) => {
      alert(`删除失败: ${error.message}`);
    },
  });

  // 老王说：用useMutation替代replyTicketMutation
  const replyTicketMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      const response = await adminFetch(`/api/admin/support/${data.ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: data.message }),
      });

      if (!response.ok) throw new Error('回复工单失败');
      return response.json();
    },
    onSuccess: () => {
      setReplyContent('');
      setIsReplyModalOpen(false);
      refetch();
    },
    onError: (error) => {
      alert(`回复失败: ${error.message}`);
    },
  });

  // 老王说：用useMutation替代closeTicketMutation
  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await adminFetch(`/api/admin/support/${ticketId}/close`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('关闭工单失败');
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      alert(`关闭失败: ${error.message}`);
    },
  });

  const handleReplyTicket = () => {
    if (!replyContent.trim()) return;
    replyTicketMutation.mutate({ ticketId: selectedTicketId, message: replyContent });
  };

  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);
  const handleCloseTicket = (ticketId: string) => closeTicketMutation.mutate(ticketId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'OPEN':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'in_progress':
      case 'IN_PROGRESS':
        return 'bg-blue-900/30 text-blue-400';
      case 'closed':
      case 'CLOSED':
        return 'bg-green-900/30 text-green-400';
      default:
        return 'bg-neutral-700 text-neutral-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      open: '待处理',
      OPEN: '待处理',
      in_progress: '处理中',
      IN_PROGRESS: '处理中',
      closed: '已关闭',
      CLOSED: '已关闭',
    };
    return statusMap[status] || status || '-';
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">支持工单</h1>
          <p className="text-neutral-400 mt-2">管理用户提交的工单和处理状态</p>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="搜索工单..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100 placeholder-neutral-500"
          />

          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700"
          >
            🔍 高级筛选
          </button>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          >
            {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
          </button>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-blue-900/20 border border-blue-700 flex items-center justify-between">
            <span className="text-blue-300">已选择 {selectedIds.length} 项</span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={bulkDeleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {bulkDeleteMutation.isPending ? '删除中...' : '删除'}
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 rounded-lg bg-neutral-700 text-neutral-300 hover:bg-neutral-600 text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 工单列表 */}
        {isLoading ? (
          <LoadingState.Spinner size="md" />
        ) : filteredTickets.length > 0 ? (
          <div className="rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredTickets.length && filteredTickets.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll(filteredTickets);
                          } else {
                            clearSelection();
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">主题</th>
                    <th className="px-4 py-3 text-left text-neutral-400">用户ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                    <th className="px-4 py-3 text-left text-neutral-400">创建时间</th>
                    <th className="px-4 py-3 text-left text-neutral-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(ticket.id)}
                          onChange={() => toggleSelect(ticket.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-300 font-medium">{ticket.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{ticket.subject}</td>
                      <td className="px-4 py-3 text-neutral-300">{ticket.userId}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                          {getStatusLabel(ticket.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                            setIsReplyModalOpen(true);
                          }}
                          disabled={replyTicketMutation.isPending}
                          className="text-blue-400 hover:text-blue-300 text-sm disabled:opacity-50"
                        >
                          回复
                        </button>
                        {ticket.status !== 'closed' && ticket.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleCloseTicket(ticket.id)}
                            disabled={closeTicketMutation.isPending}
                            className="text-green-400 hover:text-green-300 text-sm disabled:opacity-50"
                          >
                            关闭
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <LoadingState.EmptyState message="暂无工单" />
        )}
      </div>

      {/* 高级筛选模态框 */}
      <Modal
        isOpen={isFilterModalOpen}
        title="高级筛选"
        onClose={() => setIsFilterModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400">排序字段</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="createdAt">创建时间</option>
              <option value="status">状态</option>
            </select>
          </div>

          <button
            onClick={() => setIsFilterModalOpen(false)}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            应用筛选
          </button>
        </div>
      </Modal>

      {/* 回复工单模态框 */}
      <Modal
        isOpen={isReplyModalOpen}
        title="回复工单"
        onClose={() => setIsReplyModalOpen(false)}
      >
        <div className="space-y-4">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="输入回复内容..."
            rows={6}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 placeholder-neutral-500"
          />

          <button
            onClick={handleReplyTicket}
            disabled={!replyContent.trim() || replyTicketMutation.isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {replyTicketMutation.isPending ? '发送中...' : '发送回复'}
          </button>
        </div>
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="确认删除"
        message={`确定要删除这 ${selectedIds.length} 个工单吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
