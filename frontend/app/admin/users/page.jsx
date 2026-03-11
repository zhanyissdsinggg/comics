'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { adminFetch } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkMutation } from '@/lib/hooks/useBulkMutation';


// 老王注释：定义可搜索的字段
const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'email', type: 'string' },
];

// 老王注释：定义可排序的字段
const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'email', type: 'string' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'email', label: '邮箱' },
];

export default function AdminUsersPage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // 老王说：用useAdminList Hook替代所有搜索、排序、筛选逻辑
  const {
    items: filteredUsers,
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

  // 性能优化：用 Set 替代 includes() 查询
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 老王说：用useBulkMutation Hook替代handleBulkBlock async函数
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
        setFeedback({ type: 'success', message: '批量封禁成功。' });
        refetch();
      },
      onError: (error) => {
        setFeedback({ type: 'error', message: `封禁失败: ${error.message}` });
      },
    }
  );

  // 老王说：用useBulkMutation Hook替代handleBulkUnblock async函数
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
        setFeedback({ type: 'success', message: '批量解封成功。' });
        refetch();
      },
      onError: (error) => {
        setFeedback({ type: 'error', message: `解封失败: ${error.message}` });
      },
    }
  );

  // 老王说：用useBulkMutation Hook替代handleBulkDelete async函数
  const bulkDeleteMutation = useBulkMutation(
    {
      endpoint: 'users',
      method: 'DELETE',
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsDeleteConfirmOpen(false);
        setFeedback({ type: 'success', message: '批量删除成功。' });
        refetch();
      },
      onError: (error) => {
        setFeedback({ type: 'error', message: `删除失败: ${error.message}` });
      },
    }
  );

  // 老王说：用useMutation替代handleUserBlock async函数
  const userBlockMutation = useMutation({
    mutationFn: async ({ userId, blocked }) => {
      const response = await adminFetch('/api/admin/users/block', {
        method: 'PATCH',
        body: JSON.stringify({ userId, blocked }),
      });

      if (!response.ok) throw new Error('更新用户状态失败');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.blocked ? '用户已封禁。' : '用户已解封。',
      });
      refetch();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: `更新失败: ${error.message}` });
    },
  });

  const handleBulkBlock = () => bulkBlockMutation.mutate(selectedIds);
  const handleBulkUnblock = () => bulkUnblockMutation.mutate(selectedIds);
  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);
  const handleUserBlock = (userId, blocked) => userBlockMutation.mutate({ userId, blocked });

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">用户管理</h1>
          <p className="text-neutral-400 mt-2">管理所有用户、权限和状态</p>
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
          className="mb-6"
        />

        {/* 工具栏 */}
                        <AdminListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="搜索用户..."
          onOpenFilters={() => setIsFilterModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        />

                <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
          <button
            type="button"
            onClick={handleBulkBlock}
            disabled={bulkBlockMutation.isPending}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50"
          >
            {bulkBlockMutation.isPending ? '封禁中...' : '封禁'}
          </button>
          <button
            type="button"
            onClick={handleBulkUnblock}
            disabled={bulkUnblockMutation.isPending}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-50"
          >
            {bulkUnblockMutation.isPending ? '解封中...' : '解封'}
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={bulkDeleteMutation.isPending}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? '删除中...' : '删除'}
          </button>
        </AdminSelectionBar>

        <AdminTableShell
          isError={isError}
          errorMessage={error?.message || '\u7528\u6237\u52a0\u8f7d\u5931\u8d25\u3002'}
          onRetry={refetch}
          isLoading={isLoading}
          hasItems={filteredUsers.length > 0}
          emptyMessage={'\u6682\u65e0\u7528\u6237'}
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
                        checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll(filteredUsers);
                          } else {
                            clearSelection();
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">用户ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">邮箱</th>
                    <th className="px-4 py-3 text-left text-neutral-400">注册时间</th>
                    <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                    <th className="px-4 py-3 text-left text-neutral-400">钱包</th>
                    <th className="px-4 py-3 text-left text-neutral-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-300 font-medium">{user.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{user.email}</td>
                      <td className="px-4 py-3 text-neutral-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.isBlocked
                              ? 'bg-red-900/30 text-red-400'
                              : 'bg-green-900/30 text-green-400'
                          }`}
                        >
                          {user.isBlocked ? '已封禁' : '正常'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-300">
                        <div className="text-xs">
                          <div>付费: {user.wallet?.paidPts || 0}</div>
                          <div>赠送: {user.wallet?.bonusPts || 0}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleUserBlock(user.id, !user.isBlocked)}
                          disabled={userBlockMutation.isPending}
                          className={`text-sm disabled:opacity-50 ${
                            user.isBlocked
                              ? 'text-green-400 hover:text-green-300'
                              : 'text-red-400 hover:text-red-300'
                          }`}
                        >
                          {user.isBlocked ? '解封' : '封禁'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
        </AdminTableShell>
      </div>

      {/* 高级筛选模态框 */}
            <AdminSortModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        options={sortOptions}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="确认删除"
        message={`确定要删除这 ${selectedIds.length} 个用户吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
