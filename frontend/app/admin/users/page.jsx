'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkMutation } from '@/lib/hooks/useBulkMutation';

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'email', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'email', type: 'string' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'email', label: '邮箱' },
];

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export default function AdminUsersPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
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
        setFeedback({ type: 'success', message: '已封禁所选用户。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `封禁失败：${mutationError.message}` });
      },
    }
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
        setFeedback({ type: 'success', message: '已解除封禁所选用户。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `解除封禁失败：${mutationError.message}` });
      },
    }
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
        setFeedback({ type: 'success', message: '已删除所选用户。' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `删除失败：${mutationError.message}` });
      },
    }
  );

  const userBlockMutation = useMutation({
    mutationFn: async ({ userId, blocked }) => {
      const response = await adminFetch('/api/admin/users/block', {
        method: 'PATCH',
        body: JSON.stringify({ userId, blocked }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '更新用户状态失败。'));
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.blocked ? '用户已封禁。' : '用户已解除封禁。',
      });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `更新失败：${mutationError.message}` });
    },
  });

  const handleBulkBlock = () => bulkBlockMutation.mutate(selectedIds);
  const handleBulkUnblock = () => bulkUnblockMutation.mutate(selectedIds);
  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);
  const handleUserBlock = (userId, blocked) => userBlockMutation.mutate({ userId, blocked });

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">用户管理</h1>
          <p className="mt-2 text-neutral-400">在同一页面统一管理用户状态、访问权限与钱包余额。</p>
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          className="mb-6"
        />

        <AdminListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="按用户 ID 或邮箱搜索"
          onOpenFilters={() => setIsFilterModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        />

        <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <button
            type="button"
            onClick={handleBulkBlock}
            disabled={selectedIds.length === 0 || bulkBlockMutation.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {bulkBlockMutation.isPending ? '封禁中...' : '封禁'}
          </button>
          <button
            type="button"
            onClick={handleBulkUnblock}
            disabled={selectedIds.length === 0 || bulkUnblockMutation.isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {bulkUnblockMutation.isPending ? '解除封禁中...' : '解除封禁'}
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white transition hover:bg-red-800 disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? '删除中...' : '删除'}
          </button>
        </AdminSelectionBar>

        <AdminTableShell
          isError={isError}
          errorMessage={error?.message || '用户加载失败。'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={users.length > 0}
          emptyMessage="暂无用户。"
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 bg-neutral-900">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    aria-label="选择全部用户"
                    checked={users.length > 0 && selectedIds.length === users.length}
                    onChange={(event) => {
                      if (event.target.checked) {
                        selectAll(users);
                        return;
                      }
                      clearSelection();
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-neutral-400">用户 ID</th>
                <th className="px-4 py-3 text-left text-neutral-400">邮箱</th>
                <th className="px-4 py-3 text-left text-neutral-400">注册时间</th>
                <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                <th className="px-4 py-3 text-left text-neutral-400">钱包</th>
                <th className="px-4 py-3 text-left text-neutral-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`选择用户 ${user.id}`}
                      checked={selectedIdsSet.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-300">{user.id}</td>
                  <td className="px-4 py-3 text-neutral-300">{user.email || '-'}</td>
                  <td className="px-4 py-3 text-neutral-400">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'rounded px-2 py-1 text-xs font-medium',
                        user.isBlocked ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400',
                      ].join(' ')}
                    >
                      {user.isBlocked ? '已封禁' : '正常'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    <div className="text-xs">
                      <div>付费点数：{user.wallet?.paidPts || 0}</div>
                      <div>赠送点数：{user.wallet?.bonusPts || 0}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleUserBlock(user.id, !user.isBlocked)}
                      disabled={userBlockMutation.isPending}
                      className={[
                        'text-sm transition disabled:opacity-50',
                        user.isBlocked ? 'text-emerald-400 hover:text-emerald-300' : 'text-red-400 hover:text-red-300',
                      ].join(' ')}
                    >
                      {user.isBlocked ? '解除封禁' : '封禁'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      </div>

      <AdminSortModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        options={sortOptions}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="删除所选用户"
        message={`确定删除 ${selectedIds.length} 个选中用户吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
