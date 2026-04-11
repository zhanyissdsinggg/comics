'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import AdminShell from '@/components/admin/AdminShell';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import {
  PromotionsListSection,
  PromotionsSummaryCards,
} from '@/components/admin/promotions-workspace/sections';
import {
  searchFields,
  sortFields,
  sortOptions,
} from '@/components/admin/promotions-workspace/utils';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

export default function AdminPromotionsPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: promotions,
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
  } = useAdminList('promotions', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const activeCount = useMemo(
    () => promotions.filter((promotion) => promotion.active !== false).length,
    [promotions],
  );

  const bulkDeleteMutation = useBulkDelete('promotions', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '已删除所选活动。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `删除所选活动失败：${mutationError.message}` });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ promotionId, currentStatus }) => {
      const response = await adminFetch(`/api/admin/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '更新活动状态失败。'));
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.currentStatus ? '活动已暂停。' : '活动已启用。',
      });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `更新活动状态失败：${mutationError.message}` });
    },
  });

  return (
    <AdminShell
      title="活动运营"
      subtitle="先看清哪些活动还在线、哪些已暂停，以及读者当前在前台还会感知到什么。"
    >
      <div className="space-y-6">
        <PromotionsSummaryCards
          total={pagination.total}
          activeCount={activeCount}
          pausedCount={Math.max(promotions.length - activeCount, 0)}
        />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <PromotionsListSection
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
          errorMessage={error?.message || '活动列表加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          promotions={promotions}
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          selectedIdsSet={selectedIdsSet}
          onSelectAll={(checked) => {
            if (checked) {
              selectAll(promotions);
              return;
            }
            clearSelection();
          }}
          onToggleSelect={toggleSelect}
          onToggleStatus={(promotionId, currentStatus) =>
            toggleStatusMutation.mutate({ promotionId, currentStatus })
          }
          toggleStatusMutation={toggleStatusMutation}
        />

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="排序活动"
          label="排序方式"
          actionLabel="应用"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="删除活动"
          message={`确定删除所选 ${selectedIds.length} 个活动吗？`}
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
