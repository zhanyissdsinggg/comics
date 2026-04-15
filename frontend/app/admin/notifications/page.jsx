'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';

import AdminShell from '@/components/admin/AdminShell';
import {
  NotificationsListSection,
  NotificationsSummaryCards,
} from '@/components/admin/notifications-workspace/sections';
import {
  searchFields,
  sortFields,
  sortOptions,
} from '@/components/admin/notifications-workspace/utils';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

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
    <AdminShell title="读者通知" subtitle="查看通知内容和待清理积压。">
      <div className="space-y-6">
        <NotificationsSummaryCards
          total={pagination.total}
          titledCount={titledCount}
          bodyCount={bodyCount}
        />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <NotificationsListSection
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onOpenSortModal={() => setIsSortModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          selectedIds={selectedIds}
          clearSelection={clearSelection}
          onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
          deletePending={bulkDeleteMutation.isPending}
          isError={isError}
          errorMessage={error?.message || '通知加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          notifications={notifications}
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          selectedIdsSet={selectedIdsSet}
          onSelectAll={(checked) => {
            if (checked) {
              selectAll(notifications);
              return;
            }
            clearSelection();
          }}
          onToggleSelect={toggleSelect}
        />

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="通知排序"
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
