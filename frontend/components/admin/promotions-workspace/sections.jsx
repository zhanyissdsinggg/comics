"use client";

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
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import { buildPromotionsMetricCards, formatDate, getStatusLabel, getStatusTone } from "./utils";

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
      description="先用一个简单状态视图看清活动是什么、现在是否在线，以及接下来应该做什么。"
    >
      <AdminListToolbar
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        searchPlaceholder="搜索活动 ID 或标题"
        onOpenFilters={onOpenSortModal}
        sortOrder={sortOrder}
        onToggleSortOrder={onToggleSortOrder}
      />

      <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onOpenDeleteConfirm}
          disabled={selectedIds.length === 0 || deletePending}
        >
          {deletePending ? "正在删除..." : "删除活动"}
        </Button>
      </AdminSelectionBar>

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
                    checked={selectedIds.length === promotions.length && promotions.length > 0}
                    onChange={(event) => onSelectAll(event.target.checked)}
                    className="rounded"
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
                        className="rounded"
                        aria-label={`选择活动 ${promotion.id}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">
                        {promotion.title || "未命名活动"}
                      </div>
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
                        onClick={() => onToggleStatus(promotion.id, isActive)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "正在更新..." : isActive ? "暂停" : "启用"}
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
