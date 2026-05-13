"use client";

import { AdminListToolbar } from "@/components/admin/common/AdminListToolbar";
import { AdminSelectionBar } from "@/components/admin/common/AdminSelectionBar";
import { AdminTableShell } from "@/components/admin/common/AdminTableShell";
import {
  AdminBadge,
  adminCheckboxClassName,
  AdminDataTable,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import {
  buildPromotionsMetricCards,
  formatDate,
  getStatusLabel,
  getStatusTone,
} from "./utils";

export function PromotionsSummaryCards({ total, activeCount, pausedCount }) {
  const cards = buildPromotionsMetricCards({ total, activeCount, pausedCount });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function PromotionsListSection(props) {
  const {
    searchTerm,
    onSearchTermChange,
    onOpenSortModal,
    sortOrder,
    onToggleSortOrder,
    selectedIds,
    clearSelection,
    onOpenDeleteConfirm,
    deletePending,
    isError,
    errorMessage,
    onRetry,
    isLoading,
    promotions,
    pagination,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    selectedIdsSet,
    onSelectAll,
    onToggleSelect,
    onToggleStatus,
    toggleStatusMutation,
  } = props;

  return (
    <AdminPageSection
      title="活动列表"
      description="先看活动内容、当前状态和下一步动作。"
      eyebrow="活动管理"
    >
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            查找与排序
          </p>
          <p className="mt-2 text-sm text-slate-600">
            先按活动编号或标题定位，再按时间顺序复核还在运行的活动。
          </p>
          <div className="mt-4">
            <AdminListToolbar
              searchTerm={searchTerm}
              onSearchTermChange={onSearchTermChange}
              searchPlaceholder="搜索活动编号或标题"
              onOpenFilters={onOpenSortModal}
              sortOrder={sortOrder}
              onToggleSortOrder={onToggleSortOrder}
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            批量清理
          </p>
          <p className="mt-2 text-sm text-slate-600">
            停用动作在行内处理，批量区只保留删除，避免把活动状态操作混乱。
          </p>
          <div className="mt-4">
            <AdminSelectionBar
              selectedCount={selectedIds.length}
              onClear={clearSelection}
            >
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onOpenDeleteConfirm}
                disabled={selectedIds.length === 0 || deletePending}
              >
                {deletePending ? "正在删除..." : "删除所选"}
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
        hasItems={promotions.length > 0}
        emptyMessage="当前视图下还没有匹配的活动。"
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      >
        <AdminDataTable className="border-0 shadow-none">
          <table className="w-full min-w-[760px]">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === promotions.length &&
                      promotions.length > 0
                    }
                    onChange={(event) => onSelectAll(event.target.checked)}
                    className={adminCheckboxClassName}
                    aria-label="选择全部活动"
                  />
                </th>
                <th className="px-4 py-4">活动</th>
                <th className="px-4 py-4">状态</th>
                <th className="px-4 py-4">创建时间</th>
                <th className="px-4 py-4">操作</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {promotions.map((promotion) => {
                const isActive = promotion.active !== false;
                const isUpdating =
                  toggleStatusMutation.isPending &&
                  toggleStatusMutation.variables?.promotionId === promotion.id;

                return (
                  <AdminTableRow key={promotion.id}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIdsSet.has(promotion.id)}
                        onChange={() => onToggleSelect(promotion.id)}
                        className={adminCheckboxClassName}
                        aria-label={`选择活动 ${promotion.id}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">
                        {promotion.title || "未命名活动"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {promotion.id}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <AdminBadge tone={getStatusTone(isActive)}>
                        {getStatusLabel(isActive)}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatDate(promotion.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        type="button"
                        variant={isActive ? "secondary" : "default"}
                        size="sm"
                        onClick={() => onToggleStatus(promotion.id, isActive)}
                        disabled={isUpdating}
                      >
                        {isUpdating
                          ? "正在更新..."
                          : isActive
                            ? "暂停"
                            : "启用"}
                      </Button>
                    </td>
                  </AdminTableRow>
                );
              })}
            </tbody>
          </table>
        </AdminDataTable>
      </AdminTableShell>
    </AdminPageSection>
  );
}
