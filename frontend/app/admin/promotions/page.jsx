'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import AdminShell from '@/components/admin/AdminShell';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import {
  AdminBadge,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkDelete } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'title', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'title', type: 'string' },
  { field: 'active', type: 'boolean' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'title', label: '标题' },
  { value: 'active', label: '状态' },
];

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

function getStatusLabel(isActive) {
  return isActive ? '进行中' : '已暂停';
}

function getStatusTone(isActive) {
  return isActive ? 'success' : 'default';
}

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
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="当前活动"
            value={String(pagination.total)}
            detail="当前搜索和排序条件下的活动数量。"
            tone="accent"
          />
          <AdminMetricCard
            label="进行中"
            value={String(activeCount)}
            detail="在当前结果里仍标记为在线的活动。"
          />
          <AdminMetricCard
            label="已暂停"
            value={String(Math.max(promotions.length - activeCount, 0))}
            detail="已保留但当前没有继续运行的活动。"
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="活动列表"
          description="先用一个简单状态视图看清活动是什么、现在是否在线，以及接下来应该做什么。"
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="搜索活动 ID 或标题"
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
              {bulkDeleteMutation.isPending ? '正在删除...' : '删除活动'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || '活动列表加载失败。'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={promotions.length > 0}
            emptyMessage="当前视图下还没有匹配的活动。"
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
                      checked={selectedIds.length === promotions.length && promotions.length > 0}
                      onChange={(event) => {
                        if (event.target.checked) {
                          selectAll(promotions);
                          return;
                        }

                        clearSelection();
                      }}
                      className="rounded"
                      aria-label="选择全部活动"
                    />
                  </th>
                  <th className="px-4 py-3">活动</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">创建时间</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </AdminTableHeader>
              <tbody>
                {promotions.map((promotion) => {
                  const isActive = promotion.active !== false;
                  const isUpdating =
                    toggleStatusMutation.isPending
                    && toggleStatusMutation.variables?.promotionId === promotion.id;

                  return (
                    <AdminTableRow key={promotion.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(promotion.id)}
                          onChange={() => toggleSelect(promotion.id)}
                          className="rounded"
                          aria-label={`选择活动 ${promotion.id}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{promotion.title || '未命名活动'}</div>
                        <div className="mt-1 text-xs text-slate-500">{promotion.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={getStatusTone(isActive)}>{getStatusLabel(isActive)}</AdminBadge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(promotion.createdAt)}</td>
                      <td className="px-4 py-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              promotionId: promotion.id,
                              currentStatus: isActive,
                            })
                          }
                          disabled={isUpdating}
                        >
                          {isUpdating ? '正在更新...' : isActive ? '暂停' : '启用'}
                        </Button>
                      </td>
                    </AdminTableRow>
                  );
                })}
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
