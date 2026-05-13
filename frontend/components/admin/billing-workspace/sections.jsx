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

export function BillingSnapshotSection({
  billingSnapshotItems,
  membershipSnapshotItems,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <AdminPageSection
        title="支付状态概览"
        description="先确认当前运行模式和可用操作。"
        eyebrow="支付概况"
      >
        <AdminKeyValueList items={billingSnapshotItems} />
      </AdminPageSection>

      <AdminPageSection
        title="会员方案概览"
        description="快速看清会员价值。"
        eyebrow="会员概况"
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
      eyebrow="套餐管理"
    >
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            查找与排序
          </p>
          <p className="mt-2 text-sm text-slate-600">
            按套餐编号、名称或标签定位，再按时间顺序复核当前售卖内容。
          </p>
          <div className="mt-4">
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
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            批量清理
          </p>
          <p className="mt-2 text-sm text-slate-600">
            套餐删除单独放在这里，避免和价格、点数浏览信息混在一处。
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
                {deletePending ? "正在删除..." : "删除套餐"}
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
                    checked={
                      selectedIds.length === packages.length &&
                      packages.length > 0
                    }
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
                      <div className="mt-1 text-xs text-slate-500">
                        {pkg.id}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatCurrency(pkg.price, pkg.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">
                        {formatPoints(totalPoints)} 点
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        付费 {formatPoints(pkg.paidPts || pkg.points || 0)} 点 ·
                        赠送 {formatPoints(pkg.bonusPts || 0)} 点
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <AdminBadge tone={getStatusTone(isActive)}>
                        {isActive ? "启用中" : "已暂停"}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatDate(pkg.createdAt)}
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
