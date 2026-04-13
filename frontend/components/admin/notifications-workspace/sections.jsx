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

import { buildNotificationsMetricCards, formatDate, getContentPreview } from "./utils";

export function NotificationsSummaryCards({ total, titledCount, bodyCount }) {
  const cards = buildNotificationsMetricCards({ total, titledCount, bodyCount });

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
      description="在这里检查消息质量、清理过期通知，并确认整个通知队列读起来足够清楚。"
    >
      <AdminListToolbar
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        searchPlaceholder="搜索通知编号、标题或正文"
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
          {deletePending ? "正在删除..." : "删除通知"}
        </Button>
      </AdminSelectionBar>

      <AdminTableShell
        isError={isError}
        errorMessage={errorMessage}
        onRetry={onRetry}
        isLoading={isLoading}
        hasItems={notifications.length > 0}
        emptyMessage="当前视图下还没有匹配的通知。"
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
                    checked={selectedIds.length === notifications.length && notifications.length > 0}
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
                    <div className="mt-1 text-xs text-slate-500">{notification.id}</div>
                  </td>
                  <td className="max-w-[36rem] px-4 py-4 text-slate-600">
                    {getContentPreview(notification.content)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(notification.createdAt)}</td>
                </AdminTableRow>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </AdminTableShell>
    </AdminPageSection>
  );
}
