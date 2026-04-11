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
      description="按订单或用户 ID 搜索，在不把页面做成金融控制台的前提下处理退款和导出。"
      action={
        <Button type="button" variant="outline" onClick={onExport} disabled={exportDisabled}>
          <Download className="size-4" />
          导出所选
        </Button>
      }
    >
      <AdminListToolbar
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        searchPlaceholder="搜索订单 ID 或用户 ID"
        onOpenFilters={onOpenSortModal}
        sortOrder={sortOrder}
        onToggleSortOrder={onToggleSortOrder}
        filtersLabel="排序"
        ascendingLabel="最早优先"
        descendingLabel="最新优先"
      />

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
                    className="h-4 w-4 rounded border-black/20 bg-transparent"
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
                      className="h-4 w-4 rounded border-black/20 bg-transparent"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-950">{order.id}</p>
                      <p className="text-xs text-slate-500">
                        {order.orderId ? `支付网关 ID：${order.orderId}` : '站内订单记录'}
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
                        variant="outline"
                        size="sm"
                        onClick={() => onRefundOne(order.id)}
                        disabled={refundPending}
                      >
                        发起退款
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-500">已记录退款</span>
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
