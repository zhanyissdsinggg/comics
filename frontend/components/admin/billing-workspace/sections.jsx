"use client";

import { AdminListToolbar } from "@/components/admin/common/AdminListToolbar";
import { AdminSelectionBar } from "@/components/admin/common/AdminSelectionBar";
import { AdminTableShell } from "@/components/admin/common/AdminTableShell";
import {
  AdminBadge,
  adminCheckboxClassName,
  AdminDataTable,
  AdminKeyValueList,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import {
  formatCurrency,
  formatDate,
  formatPoints,
  getPackageTotalPoints,
  getStatusTone,
} from "./utils";

export function BillingSummaryCards({ cards }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function BillingSnapshotSection({ billingSnapshotItems, membershipSnapshotItems }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <AdminPageSection
        title="支付状态概览"
        description="先确认当前运行模式和可用操作。"
      >
        <AdminKeyValueList items={billingSnapshotItems} />
      </AdminPageSection>

      <AdminPageSection
        title="会员方案概览"
        description="快速看清会员价值。"
      >
        <AdminKeyValueList items={membershipSnapshotItems} />
      </AdminPageSection>
    </div>
  );
}

export function BillingPackagesSection(props) {
  const {
    searchTerm,
    onSearchTermChange,
    sortOrder,
    onToggleSortOrder,
    onOpenSortModal,
    selectedIds,
    clearSelection,
    onOpenDeleteConfirm,
    deletePending,
    isError,
    errorMessage,
    onRetry,
    isLoading,
    hasItems,
    pagination,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    packages,
    selectedIdsSet,
    onSelectAll,
    onToggleSelect,
  } = props;

  return (
    <AdminPageSection
      title="充值套餐"
      description="看套餐内容、价格、点数和状态。"
    >
      <AdminListToolbar
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        searchPlaceholder="搜索套餐编号、名称或标签"
        onOpenFilters={onOpenSortModal}
        sortOrder={sortOrder}
        onToggleSortOrder={onToggleSortOrder}
        filtersLabel="排序"
        ascendingLabel="较早创建优先"
        descendingLabel="最新创建优先"
      />

      <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onOpenDeleteConfirm}
          disabled={selectedIds.length === 0 || deletePending}
        >
          {deletePending ? "正在删除..." : "删除套餐"}
        </Button>
      </AdminSelectionBar>

      <AdminTableShell
        isError={isError}
        errorMessage={errorMessage}
        onRetry={onRetry}
        isLoading={isLoading}
        hasItems={hasItems}
        emptyMessage="当前视图下还没有匹配的充值套餐。"
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      >
        <AdminDataTable className="border-0 shadow-none">
          <table className="w-full min-w-[920px]">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === packages.length && packages.length > 0}
                    onChange={(event) => onSelectAll(event.target.checked)}
                    className={adminCheckboxClassName}
                    aria-label="选择全部套餐"
                  />
                </th>
                <th className="px-4 py-4">套餐</th>
                <th className="px-4 py-4">价格</th>
                <th className="px-4 py-4">点数</th>
                <th className="px-4 py-4">状态</th>
                <th className="px-4 py-4">创建时间</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {packages.map((pkg) => {
                const totalPoints = getPackageTotalPoints(pkg);
                const isActive = pkg.active !== false;

                return (
                  <AdminTableRow key={pkg.id}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIdsSet.has(pkg.id)}
                        onChange={() => onToggleSelect(pkg.id)}
                        className={adminCheckboxClassName}
                        aria-label={`选择套餐 ${pkg.id}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">
                        {pkg.name || pkg.label || "未命名套餐"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{pkg.id}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatCurrency(pkg.price, pkg.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">{formatPoints(totalPoints)} 点</div>
                      <div className="mt-1 text-xs text-slate-500">
                        付费 {formatPoints(pkg.paidPts || pkg.points || 0)} 点 · 赠送{" "}
                        {formatPoints(pkg.bonusPts || 0)} 点
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <AdminBadge tone={getStatusTone(isActive)}>
                        {isActive ? "启用中" : "已暂停"}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(pkg.createdAt)}</td>
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
