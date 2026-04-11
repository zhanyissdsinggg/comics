'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import AdminShell from '@/components/admin/AdminShell';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { UsersDirectorySection, UsersGuideSection, UsersSummaryCards } from '@/components/admin/users-workspace/sections';
import { searchFields, sortFields, sortOptions } from '@/components/admin/users-workspace/utils';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkMutation } from '@/lib/hooks/useBulkMutation';

export default function AdminUsersPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const {
    items: users,
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
  } = useAdminList('users', searchFields, sortFields, 'createdAt', 'desc');

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const blockedCount = useMemo(
    () => users.filter((user) => Boolean(user?.isBlocked)).length,
    [users],
  );
  const walletBalance = useMemo(
    () =>
      users.reduce(
        (total, user) =>
          total + Number(user?.wallet?.paidPts || 0) + Number(user?.wallet?.bonusPts || 0),
        0,
      ),
    [users],
  );

  const bulkBlockMutation = useBulkMutation(
    {
      endpoint: 'users/block',
      method: 'PATCH',
      appendIdToPath: false,
      bodyBuilder: (userId) => ({ userId, blocked: true }),
    },
    {
      onSuccess: () => {
        clearSelection();
        setFeedback({ type: 'success', message: '已封禁所选账号。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `封禁所选账号失败：${mutationError.message}` });
      },
    },
  );

  const bulkUnblockMutation = useBulkMutation(
    {
      endpoint: 'users/block',
      method: 'PATCH',
      appendIdToPath: false,
      bodyBuilder: (userId) => ({ userId, blocked: false }),
    },
    {
      onSuccess: () => {
        clearSelection();
        setFeedback({ type: 'success', message: '已恢复所选账号。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `恢复所选账号失败：${mutationError.message}` });
      },
    },
  );

  const bulkDeleteMutation = useBulkMutation(
    {
      endpoint: 'users',
      method: 'DELETE',
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsDeleteConfirmOpen(false);
        setFeedback({ type: 'success', message: '已删除所选账号。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `删除所选账号失败：${mutationError.message}` });
      },
    },
  );

  const userBlockMutation = useMutation({
    mutationFn: async ({ userId, blocked }) => {
      const response = await adminFetch('/api/admin/users/block', {
        method: 'PATCH',
        body: JSON.stringify({ userId, blocked }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '更新账号状态失败。'));
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.blocked ? '账号已封禁。' : '账号已恢复。',
      });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `更新账号状态失败：${mutationError.message}` });
    },
  });

  return (
    <AdminShell
      title="用户"
      subtitle="把读者账号、钱包余额和访问状态放在一个安静可读的目录里，批量操作只在真的省事时出现。"
    >
      <div className="space-y-6">
        <UsersSummaryCards
          total={pagination.total}
          blockedCount={blockedCount}
          walletBalance={walletBalance}
        />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <UsersDirectorySection
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onOpenSortModal={() => setIsSortModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          selectedIds={selectedIds}
          clearSelection={clearSelection}
          onBulkBlock={() => bulkBlockMutation.mutate(selectedIds)}
          bulkBlockPending={bulkBlockMutation.isPending}
          onBulkUnblock={() => bulkUnblockMutation.mutate(selectedIds)}
          bulkUnblockPending={bulkUnblockMutation.isPending}
          onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
          bulkDeletePending={bulkDeleteMutation.isPending}
          isError={isError}
          errorMessage={error?.message || '用户目录加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          users={users}
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          selectedIdsSet={selectedIdsSet}
          onSelectAll={(checked) => {
            if (checked) {
              selectAll(users);
              return;
            }
            clearSelection();
          }}
          onToggleSelect={toggleSelect}
          onToggleUserBlock={(user) =>
            userBlockMutation.mutate({ userId: user.id, blocked: !user.isBlocked })
          }
          userBlockPending={userBlockMutation.isPending}
        />

        <UsersGuideSection />
      </div>

      <AdminSortModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        options={sortOptions}
        title="排序用户"
        label="排序方式"
        actionLabel="完成"
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="删除所选用户"
        message={`确定删除 ${selectedIds.length} 个已选账号吗？此操作无法撤销。`}
        confirmText="删除用户"
        cancelText="取消"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </AdminShell>
  );
}
