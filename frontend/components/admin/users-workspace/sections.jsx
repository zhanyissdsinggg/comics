"use client";

import { ShieldOff, ShieldX, Trash2 } from "lucide-react";

import { AdminListToolbar } from "@/components/admin/common/AdminListToolbar";
import { AdminSelectionBar } from "@/components/admin/common/AdminSelectionBar";
import { AdminTableShell } from "@/components/admin/common/AdminTableShell";
import {
  AdminBadge,
  AdminDataTable,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  adminCheckboxClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import { buildUsersMetricCards, formatDate, formatNumber } from "./utils";

export function UsersSummaryCards({ total, blockedCount, walletBalance }) {
  const cards = buildUsersMetricCards({ total, blockedCount, walletBalance });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function UsersDirectorySection(props) {
  const {
    searchTerm,
    onSearchTermChange,
    onOpenSortModal,
    sortOrder,
    onToggleSortOrder,
    selectedIds,
    clearSelection,
    onBulkBlock,
    bulkBlockPending,
    onBulkUnblock,
    bulkUnblockPending,
    onOpenDeleteConfirm,
    bulkDeletePending,
    isError,
    errorMessage,
    onRetry,
    isLoading,
    users,
    pagination,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    selectedIdsSet,
    onSelectAll,
    onToggleSelect,
    onToggleUserBlock,
    userBlockPending,
  } = props;

  return (
    <AdminPageSection
      title="读者目录"
      description="按邮箱或账号编号搜索。"
      eyebrow="账号管理"
    >
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">查找与排序</p>
          <p className="mt-2 text-sm text-slate-600">按邮箱或账号编号定位用户，再按创建顺序复核账号状态。</p>
          <div className="mt-4">
            <AdminListToolbar
              searchTerm={searchTerm}
              onSearchTermChange={onSearchTermChange}
              searchPlaceholder="搜索账号编号或邮箱..."
              onOpenFilters={onOpenSortModal}
              sortOrder={sortOrder}
              onToggleSortOrder={onToggleSortOrder}
              filtersLabel="排序"
              ascendingLabel="最早创建优先"
              descendingLabel="最新创建优先"
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">批量动作</p>
          <p className="mt-2 text-sm text-slate-600">批量封禁、恢复和删除都放在这里，避免和行内操作混在一起。</p>
          <div className="mt-4">
            <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
              <Button
                type="button"
                variant="secondary"
                onClick={onBulkBlock}
                disabled={selectedIds.length === 0 || bulkBlockPending}
              >
                <ShieldX className="size-4" />
                {bulkBlockPending ? "封禁中..." : "封禁"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onBulkUnblock}
                disabled={selectedIds.length === 0 || bulkUnblockPending}
              >
                <ShieldOff className="size-4" />
                {bulkUnblockPending ? "恢复中..." : "恢复"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onOpenDeleteConfirm}
                disabled={selectedIds.length === 0 || bulkDeletePending}
              >
                <Trash2 className="size-4" />
                {bulkDeletePending ? "删除中..." : "删除"}
              </Button>
            </AdminSelectionBar>
          </div>
        </div>
      </div>

      <AdminTableShell
        isError={isError}
        errorMessage={errorMessage}
        onRetry={onRetry}
        isLoading={isLoading}
        hasItems={users.length > 0}
        emptyMessage="当前筛选下没有用户。"
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
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
                    onChange={(event) => onSelectAll(event.target.checked)}
                    className={adminCheckboxClassName}
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
                      onChange={() => onToggleSelect(user.id)}
                      className={adminCheckboxClassName}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-950">{user.email || "未填写邮箱"}</p>
                      <p className="text-xs text-slate-500">{user.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-4">
                    <AdminBadge tone={user.isBlocked ? "danger" : "success"}>
                      {user.isBlocked ? "已封禁" : "正常"}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="grid min-w-[240px] gap-2 sm:grid-cols-2">
                      <div className="rounded-[18px] border border-[color:var(--gush-border)] bg-white px-3 py-2.5 shadow-[0_6px_14px_rgba(15,23,42,0.02)] ring-1 ring-black/[0.015]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          付费点数
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {formatNumber(user.wallet?.paidPts || 0)}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-[color:var(--gush-border)] bg-white px-3 py-2.5 shadow-[0_6px_14px_rgba(15,23,42,0.02)] ring-1 ring-black/[0.015]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          赠送点数
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {formatNumber(user.wallet?.bonusPts || 0)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      type="button"
                      variant={user.isBlocked ? "outline" : "destructive"}
                      size="sm"
                      onClick={() => onToggleUserBlock(user)}
                      disabled={userBlockPending}
                    >
                      {user.isBlocked ? "恢复" : "封禁"}
                    </Button>
                  </td>
                </AdminTableRow>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </AdminTableShell>
    </AdminPageSection>
  );
}

export function UsersGuideSection() {
  const items = [
    {
      title: "先看账号状态",
      description: "封禁和恢复要清楚，但不要盖过账号本身。",
    },
    {
      title: "钱包信息只看核心值",
      description: "这里只看账号身份、钱包状态和访问状态。",
    },
    {
      title: "批量操作只在需要时出现",
      description: "默认页面保持安静，选中后再处理。",
    },
  ];

  return (
    <AdminPageSection
      title="操作要点"
      description="只保留最关键的三件事。"
      accent="amber"
      eyebrow="使用说明"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]"
          >
            <p className="text-sm font-semibold text-slate-950">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </div>
        ))}
      </div>
    </AdminPageSection>
  );
}
