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
  AdminBadge,
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
  { field: 'userId', type: 'string' },
  { field: 'userEmail', type: 'string' },
  { field: 'content', type: 'string' },
  { field: 'text', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'userId', type: 'string' },
  { field: 'rating', type: 'number' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'rating', label: '评分' },
  { value: 'userId', label: '读者 ID' },
];

function getContentPreview(content) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 120)}...` : text || '暂无评论内容';
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

function formatRating(value) {
  if (value === null || value === undefined || value === '') {
    return '未评分';
  }

  const rating = Number(value);
  if (!Number.isFinite(rating)) {
    return '未评分';
  }

  return `${rating}/5`;
}

export default function AdminCommentsPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: comments,
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
  } = useAdminList('comments', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const ratedCount = useMemo(
    () =>
      comments.filter(
        (comment) => comment.rating !== null && comment.rating !== undefined && comment.rating !== '',
      ).length,
    [comments],
  );
  const uniqueReaders = useMemo(
    () => new Set(comments.map((comment) => comment.userEmail || comment.userId).filter(Boolean)).size,
    [comments],
  );

  const bulkDeleteMutation = useBulkDelete('comments', {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: 'success', message: '已删除所选评论。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `删除所选评论失败：${mutationError.message}` });
    },
  });

  return (
    <AdminShell
      title="评论管理"
      subtitle="把读者反馈收进一个安静、好读的目录里，先判断内容本身，再处理不该继续留在线上的评论。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="当前评论"
            value={String(pagination.total)}
            detail="按当前搜索和排序条件统计。"
            tone="accent"
          />
          <AdminMetricCard
            label="含评分评论"
            value={String(ratedCount)}
            detail="同时包含文字反馈和评分的评论数量。"
          />
          <AdminMetricCard
            label="当前读者数"
            value={String(uniqueReaders)}
            detail="当前视图里涉及到的唯一读者数量。"
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="评论列表"
          description="让表格先回答最关键的事：谁写的、写了什么、现在要不要处理。"
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="搜索评论 ID、读者 ID、邮箱或正文"
            onOpenFilters={() => setIsSortModalOpen(true)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            filtersLabel="排序"
            ascendingLabel="更早优先"
            descendingLabel="最新优先"
          />

          <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? '删除中...' : '删除评论'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || '评论加载失败。'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={comments.length > 0}
            emptyMessage="当前视图下还没有匹配的评论。"
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
                      checked={selectedIds.length === comments.length && comments.length > 0}
                      onChange={(event) => {
                        if (event.target.checked) {
                          selectAll(comments);
                          return;
                        }

                        clearSelection();
                      }}
                      className="rounded"
                      aria-label="选择全部评论"
                    />
                  </th>
                  <th className="px-4 py-3">评论</th>
                  <th className="px-4 py-3">读者</th>
                  <th className="px-4 py-3">评分</th>
                  <th className="px-4 py-3">提交时间</th>
                </tr>
              </AdminTableHeader>
              <tbody>
                {comments.map((comment) => (
                  <AdminTableRow key={comment.id}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIdsSet.has(comment.id)}
                        onChange={() => toggleSelect(comment.id)}
                        className="rounded"
                        aria-label={`选择评论 ${comment.id}`}
                      />
                    </td>
                    <td className="max-w-[34rem] px-4 py-4">
                      <div className="font-medium text-slate-950">
                        {getContentPreview(comment.content || comment.text)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{comment.id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">
                        {comment.userEmail || comment.userId || '未知读者'}
                      </div>
                      {comment.userEmail && comment.userId ? (
                        <div className="mt-1 text-xs text-slate-500">{comment.userId}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <AdminBadge tone={comment.rating ? 'warning' : 'default'}>
                        {formatRating(comment.rating)}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(comment.createdAt)}</td>
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
          title="排序评论"
          label="排序方式"
          actionLabel="应用"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="删除评论"
          message={`确定删除所选 ${selectedIds.length} 条评论吗？`}
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
