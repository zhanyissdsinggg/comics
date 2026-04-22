"use client";

import { Download, RotateCcw, Trash2 } from "lucide-react";

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

import { formatAmount, formatDate, getStatusLabel, getStatusTone, isRefunded } from "./utils";

export function OrdersSummaryCards({ cards }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function OrdersTableSection(props) {
  const {
    onExport,
    exportDisabled,
    searchTerm,
    onSearchTermChange,
    onOpenSortModal,
    sortOrder,
    onToggleSortOrder,
    selectedIds,
    clearSelection,
    onBulkRefund,
    refundPending,
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
    orders,
    selectedIdsSet,
    onSelectAll,
    onToggleSelect,
    onRefundOne,
  } = props;

  return (
    <AdminPageSection
      title="订单队列"
      description="按订单或用户编号搜索，再处理退款或导出。"
      eyebrow="交易处理"
      action={
        <Button type="button" variant="secondary" onClick={onExport} disabled={exportDisabled}>
          <Download className="size-4" />
          导出所选
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">查找与排序</p>
          <p className="mt-2 text-sm text-slate-600">先锁定订单或用户，再按时间顺序复核退款与异常支付。</p>
          <div className="mt-4">
            <AdminListToolbar
              searchTerm={searchTerm}
              onSearchTermChange={onSearchTermChange}
              searchPlaceholder="搜索订单编号或用户编号"
              onOpenFilters={onOpenSortModal}
              sortOrder={sortOrder}
              onToggleSortOrder={onToggleSortOrder}
              filtersLabel="排序"
              ascendingLabel="最早优先"
              descendingLabel="最新优先"
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">批量动作</p>
          <p className="mt-2 text-sm text-slate-600">先看清选择范围，再统一退款或删除记录，导出用于复核留档。</p>
          <div className="mt-4">
            <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
              <Button
                type="button"
                variant="outline"
                onClick={onBulkRefund}
                disabled={selectedIds.length === 0 || refundPending}
              >
                <RotateCcw className="size-4" />
                {refundPending ? "正在发起退款..." : "发起退款"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onOpenDeleteConfirm}
                disabled={selectedIds.length === 0 || deletePending}
              >
                <Trash2 className="size-4" />
                {deletePending ? "正在删除..." : "删除"}
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
        emptyMessage="当前视图下还没有匹配的订单。"
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      >
        <AdminDataTable className="border-0 shadow-none">
          <table className="w-full min-w-[900px]">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4">
                  <input
                    type="checkbox"
                    aria-label="选择全部订单"
                    checked={orders.length > 0 && selectedIds.length === orders.length}
                    onChange={(event) => onSelectAll(event.target.checked)}
                    className={adminCheckboxClassName}
                  />
                </th>
                <th className="px-4 py-4">订单</th>
                <th className="px-4 py-4">读者</th>
                <th className="px-4 py-4">金额</th>
                <th className="px-4 py-4">状态</th>
                <th className="px-4 py-4">创建时间</th>
                <th className="px-4 py-4">操作</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {orders.map((order) => (
                <AdminTableRow key={order.id}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      aria-label={`选择订单 ${order.id}`}
                      checked={selectedIdsSet.has(order.id)}
                      onChange={() => onToggleSelect(order.id)}
                      className={adminCheckboxClassName}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-950">{order.id}</p>
                      <p className="text-xs text-slate-500">
                        {order.orderId ? `支付网关编号：${order.orderId}` : '站内订单记录'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{order.userId || "未知用户"}</td>
                  <td className="px-4 py-4 font-semibold text-slate-950">
                    {formatAmount(order.amount, order.currency)}
                  </td>
                  <td className="px-4 py-4">
                    <AdminBadge tone={getStatusTone(order.status)}>
                      {getStatusLabel(order.status)}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-4">
                    {!isRefunded(order.status) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onRefundOne(order.id)}
                        disabled={refundPending}
                      >
                        发起退款
                      </Button>
                    ) : (
                      <AdminBadge tone="default">已记录退款</AdminBadge>
                    )}
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
