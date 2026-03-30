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
  { value: 'createdAt', label: 'Created date' },
  { value: 'email', label: 'Email address' },
];

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
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
        setFeedback({ type: 'success', message: 'The selected accounts were blocked.' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `Could not block the selected users: ${mutationError.message}` });
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
        setFeedback({ type: 'success', message: 'The selected accounts were unblocked.' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `Could not unblock the selected users: ${mutationError.message}` });
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
        setFeedback({ type: 'success', message: 'The selected accounts were removed.' });
        refetch();
      },
      onError: (mutationError) => {
        setFeedback({ type: 'error', message: `Could not remove the selected users: ${mutationError.message}` });
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
        throw new Error(await readAdminResponseMessage(response, 'Could not update the user status.'));
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.blocked ? 'The account is now blocked.' : 'The account is now active again.',
      });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `Could not update the account: ${mutationError.message}` });
    },
  });

  return (
    <AdminShell
      title="Users"
      subtitle="A calmer directory for reader accounts, wallet balance, and access status. Keep the table readable and use bulk actions only when they save real time."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="Accounts in view"
            value={formatNumber(pagination.total)}
            detail="Search and sort against the current directory view."
            tone="accent"
          />
          <AdminMetricCard
            label="Blocked accounts"
            value={formatNumber(blockedCount)}
            detail="Readers currently restricted in this result set."
          />
          <AdminMetricCard
            label="Wallet balance"
            value={formatNumber(walletBalance)}
            detail="Combined paid and bonus points for the visible accounts."
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="Reader directory"
          description="Search by email or account ID, then handle status changes without turning the page into a noisy CRM."
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="Search by account ID or email..."
            onOpenFilters={() => setIsSortModalOpen(true)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            filtersLabel="Sort"
            ascendingLabel="Oldest first"
            descendingLabel="Newest first"
          />

          <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
            <Button
              type="button"
              variant="destructive"
              onClick={() => bulkBlockMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || bulkBlockMutation.isPending}
            >
              <ShieldX className="size-4" />
              {bulkBlockMutation.isPending ? 'Blocking...' : 'Block'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => bulkUnblockMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || bulkUnblockMutation.isPending}
            >
              <ShieldOff className="size-4" />
              {bulkUnblockMutation.isPending ? 'Restoring...' : 'Unblock'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
            >
              <Trash2 className="size-4" />
              {bulkDeleteMutation.isPending ? 'Removing...' : 'Delete'}
            </Button>
          </AdminSelectionBar>

          <AdminTableShell
            isError={isError}
            errorMessage={error?.message || 'The user directory could not be loaded.'}
            onRetry={refetch}
            isLoading={isLoading}
            hasItems={users.length > 0}
            emptyMessage="No users match this view yet."
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
                        aria-label="Select all users"
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
                    <th className="px-4 py-4">Account</th>
                    <th className="px-4 py-4">Joined</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Wallet</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </AdminTableHeader>
                <tbody>
                  {users.map((user) => (
                    <AdminTableRow key={user.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select user ${user.id}`}
                          checked={selectedIdsSet.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="h-4 w-4 rounded border-black/20 bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-950">{user.email || 'No email listed'}</p>
                          <p className="text-xs text-slate-500">{user.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={user.isBlocked ? 'danger' : 'success'}>
                          {user.isBlocked ? 'Blocked' : 'Active'}
                        </AdminBadge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-sm text-slate-600">
                          <p>Paid: {formatNumber(user.wallet?.paidPts || 0)}</p>
                          <p>Bonus: {formatNumber(user.wallet?.bonusPts || 0)}</p>
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
                          {user.isBlocked ? 'Unblock' : 'Block'}
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
          title="What this page is for"
          description="Keep user operations small and direct. The page should answer who the account belongs to, whether access is restricted, and what wallet state needs attention."
          accent="amber"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
              <p className="text-sm font-semibold text-slate-950">Status first</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Block and unblock actions stay visible, but quiet, so moderation work does not dominate the whole page.
              </p>
            </div>
            <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
              <p className="text-sm font-semibold text-slate-950">No CRM sprawl</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We keep the table focused on account identity, wallet state, and reader access rather than building a noisy sales console.
              </p>
            </div>
            <div className="rounded-[24px] border border-black/6 bg-[rgba(250,247,241,0.78)] p-4">
              <p className="text-sm font-semibold text-slate-950">Bulk when helpful</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Bulk actions appear only after selection so the default page stays calm and readable.
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
        title="Sort users"
        label="Sort by"
        actionLabel="Done"
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete selected users"
        message={`Remove ${selectedIds.length} selected account${selectedIds.length === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText="Delete users"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </AdminShell>
  );
}
