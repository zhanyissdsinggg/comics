'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldOff, ShieldX, Trash2, Users } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSelectionBar } from '@/components/admin/common/AdminSelectionBar';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import {
  AdminBadge,
  AdminDataTable,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
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
  { value: 'email', label: '邮箱地址' },
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

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0));
}

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
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="当前视图账号数"
            value={formatNumber(pagination.total)}
            detail="按当前搜索和排序条件统计。"
            tone="accent"
          />
          <AdminMetricCard
            label="已封禁账号"
            value={formatNumber(blockedCount)}
            detail="当前结果里被限制访问的账号数量。"
          />
          <AdminMetricCard
            label="钱包余额"
            value={formatNumber(walletBalance)}
            detail="当前视图内账号的付费点数和赠送点数总和。"
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="读者目录"
          description="按邮箱或账号 ID 搜索，再处理状态变更，不把页面做成吵闹的 CRM。"
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="搜索账号 ID 或邮箱..."
            onOpenFilters={() => setIsSortModalOpen(true)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            filtersLabel="排序"
            ascendingLabel="最早创建优先"
            descendingLabel="最新创建优先"
          />

          <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => bulkBlockMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || bulkBlockMutation.isPending}
            >
              <ShieldX className="size-4" />
              {bulkBlockMutation.isPending ? '封禁中...' : '封禁'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => bulkUnblockMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || bulkUnblockMutation.isPending}
            >
              <ShieldOff className="size-4" />
              {bulkUnblockMutation.isPending ? '恢复中...' : '恢复'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
            >
              <Trash2 className="size-4" />
              {bulkDeleteMutation.isPending ? '删除中...' : '删除'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || '用户目录加载失败。'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={users.length > 0}
            emptyMessage="当前视图下还没有匹配的用户。"
            pagination={pagination}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          >
            <AdminDataTable className="border-0 shadow-none">
              <table className="w-full min-w-[860px]">
                <AdminTableHeader>
                  <tr>
                    <th className="px-4 py-4">
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
                        className="h-4 w-4 rounded border-black/20 bg-transparent"
                      />
                    </th>
                    <th className="px-4 py-4">账号</th>
                    <th className="px-4 py-4">加入时间</th>
                    <th className="px-4 py-4">状态</th>
                    <th className="px-4 py-4">钱包</th>
                    <th className="px-4 py-4">操作</th>
                  </tr>
                </AdminTableHeader>
                <tbody>
                  {users.map((user) => (
                    <AdminTableRow key={user.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`选择用户 ${user.id}`}
                          checked={selectedIdsSet.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="h-4 w-4 rounded border-black/20 bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-950">{user.email || '未填写邮箱'}</p>
                          <p className="text-xs text-slate-500">{user.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={user.isBlocked ? 'danger' : 'success'}>
                          {user.isBlocked ? '已封禁' : '正常'}
                        </AdminBadge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-sm text-slate-600">
                          <p>付费点数：{formatNumber(user.wallet?.paidPts || 0)}</p>
                          <p>赠送点数：{formatNumber(user.wallet?.bonusPts || 0)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          type="button"
                          variant={user.isBlocked ? 'outline' : 'destructive'}
                          size="sm"
                          onClick={() => userBlockMutation.mutate({ userId: user.id, blocked: !user.isBlocked })}
                          disabled={userBlockMutation.isPending}
                        >
                          {user.isBlocked ? '恢复' : '封禁'}
                        </Button>
                      </td>
                    </AdminTableRow>
                  ))}
                </tbody>
              </table>
            </AdminDataTable>
          </AdminTableShell>
        </AdminPageSection>

        <AdminPageSection
          title="这个页面要保持什么样子"
          description="用户后台就回答三件事：这是谁、能不能正常使用、钱包状态有没有需要处理的地方。"
          accent="amber"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
              <p className="text-sm font-semibold text-slate-950">先看账号状态</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                封禁和恢复按钮保持可见，但不过度抢戏，让处理动作不至于压过账号信息本身。
              </p>
            </div>
            <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
              <p className="text-sm font-semibold text-slate-950">不要做成 CRM</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                这里不做销售控制台，只保留账号身份、钱包状态和访问状态这些真正有用的信息。
              </p>
            </div>
            <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
              <p className="text-sm font-semibold text-slate-950">只在真省事时批量处理</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                批量操作只在选中后出现，默认页面先保持安静、清楚、好扫一眼。
              </p>
            </div>
          </div>
        </AdminPageSection>
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

