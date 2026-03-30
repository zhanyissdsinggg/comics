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
  { value: 'createdAt', label: '创建时间' },
  { value: 'title', label: '标题' },
];

function getContentPreview(content) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 120)}...` : text || '暂无通知正文';
}

function formatDate(value) {
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
      setFeedback({ type: 'success', message: '已删除所选通知。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `删除所选通知失败：${mutationError.message}` });
    },
  });

  return (
    <AdminShell
      title="读者通知"
      subtitle="把真正发给读者的通知收在一个清爽列表里，方便检查质量、清理积压，而不是做成吵闹的活动看板。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="当前通知"
            value={String(pagination.total)}
            detail="当前搜索和排序条件下的通知数量。"
            tone="accent"
          />
          <AdminMetricCard
            label="有标题"
            value={String(titledCount)}
            detail="已经具备读者可见标题的通知。"
          />
          <AdminMetricCard
            label="有正文"
            value={String(bodyCount)}
            detail="包含正文而不是只剩标题壳子的通知。"
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="通知列表"
          description="在这里检查消息质量、清理过期通知，并确认整个通知队列读起来足够清楚。"
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="搜索通知 ID、标题或正文"
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
              {bulkDeleteMutation.isPending ? '正在删除...' : '删除通知'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || '通知加载失败。'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={notifications.length > 0}
            emptyMessage="当前视图下还没有匹配的通知。"
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
                      aria-label="选择全部通知"
                    />
                  </th>
                  <th className="px-4 py-3">通知</th>
                  <th className="px-4 py-3">预览</th>
                  <th className="px-4 py-3">创建时间</th>
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
                        aria-label={`选择通知 ${notification.id}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">{notification.title || '未命名通知'}</div>
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
          title="排序通知"
          label="排序方式"
          actionLabel="应用"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="删除通知"
          message={`确定删除所选 ${selectedIds.length} 条通知吗？`}
          confirmText="删除"
          cancelText="取消"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </AdminShell>
  );
}
