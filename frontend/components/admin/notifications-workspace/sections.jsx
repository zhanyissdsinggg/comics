"use client";

import { AdminListToolbar } from "@/components/admin/common/AdminListToolbar";
import { AdminSelectionBar } from "@/components/admin/common/AdminSelectionBar";
import { AdminTableShell } from "@/components/admin/common/AdminTableShell";
import {
  adminCheckboxClassName,
  AdminDataTable,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import {
  buildNotificationsMetricCards,
  formatDate,
  getContentPreview,
} from "./utils";

export function NotificationsSummaryCards({ total, titledCount, bodyCount }) {
  const cards = buildNotificationsMetricCards({
    total,
    titledCount,
    bodyCount,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function NotificationsListSection(props) {
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
    notifications,
    pagination,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    selectedIdsSet,
    onSelectAll,
    onToggleSelect,
  } = props;

  return (
    <AdminPageSection
      title="通知列表"
      description="检查内容并清理过期通知。"
      eyebrow="站内通知"
    >
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            查找与排序
          </p>
          <p className="mt-2 text-sm text-slate-600">
            按标题、正文和通知编号快速定位，再切换时间顺序清理历史通知。
          </p>
          <div className="mt-4">
            <AdminListToolbar
              searchTerm={searchTerm}
              onSearchTermChange={onSearchTermChange}
              searchPlaceholder="搜索通知编号、标题或正文"
              onOpenFilters={onOpenSortModal}
              sortOrder={sortOrder}
              onToggleSortOrder={onToggleSortOrder}
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            当前动作
          </p>
          <p className="mt-2 text-sm text-slate-600">
            先确认已选通知，再统一删除过期或错误下发的消息。
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
        hasItems={notifications.length > 0}
        emptyMessage="当前筛选下没有通知。"
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      >
        <AdminDataTable className="border-0 shadow-none">
          <table className="w-full min-w-[820px]">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === notifications.length &&
                      notifications.length > 0
                    }
                    onChange={(event) => onSelectAll(event.target.checked)}
                    className={adminCheckboxClassName}
                    aria-label="选择全部通知"
                  />
                </th>
                <th className="px-4 py-4">通知</th>
                <th className="px-4 py-4">预览</th>
                <th className="px-4 py-4">创建时间</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {notifications.map((notification) => (
                <AdminTableRow key={notification.id}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIdsSet.has(notification.id)}
                      onChange={() => onToggleSelect(notification.id)}
                      className={adminCheckboxClassName}
                      aria-label={`选择通知 ${notification.id}`}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-950">
                      {notification.title || "未命名通知"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {notification.id}
                    </div>
                  </td>
                  <td className="max-w-[36rem] px-4 py-4 text-slate-600">
                    {getContentPreview(notification.content)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatDate(notification.createdAt)}
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
