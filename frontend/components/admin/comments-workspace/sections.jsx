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
  buildCommentsMetricCards,
  formatDate,
  formatRating,
  getContentPreview,
} from "./utils";

export function CommentsSummaryCards({ total, ratedCount, uniqueReaders }) {
  const cards = buildCommentsMetricCards({ total, ratedCount, uniqueReaders });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function CommentsListSection(props) {
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
    comments,
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
      title="评论列表"
      description="先看谁写的、写了什么、要不要处理。"
    >
      <AdminListToolbar
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        searchPlaceholder="搜索评论编号、读者编号、邮箱或正文"
        onOpenFilters={onOpenSortModal}
        sortOrder={sortOrder}
        onToggleSortOrder={onToggleSortOrder}
        filtersLabel="排序"
        ascendingLabel="更早优先"
        descendingLabel="最新优先"
      />

      <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onOpenDeleteConfirm}
          disabled={selectedIds.length === 0 || deletePending}
        >
          {deletePending ? "删除中..." : "删除所选"}
        </Button>
      </AdminSelectionBar>

      <AdminTableShell
        isError={isError}
        errorMessage={errorMessage}
        onRetry={onRetry}
        isLoading={isLoading}
        hasItems={comments.length > 0}
        emptyMessage="当前视图下还没有匹配的评论。"
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      >
        <AdminDataTable className="border-0 shadow-none">
          <table className="w-full min-w-[880px]">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === comments.length && comments.length > 0}
                    onChange={(event) => onSelectAll(event.target.checked)}
                    className={adminCheckboxClassName}
                    aria-label="选择全部评论"
                  />
                </th>
                <th className="px-4 py-4">评论</th>
                <th className="px-4 py-4">读者</th>
                <th className="px-4 py-4">评分</th>
                <th className="px-4 py-4">提交时间</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {comments.map((comment) => (
                <AdminTableRow key={comment.id}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIdsSet.has(comment.id)}
                      onChange={() => onToggleSelect(comment.id)}
                        className={adminCheckboxClassName}
                      aria-label={`选择评论 ${comment.id}`}
                    />
                  </td>
                  <td className="max-w-[34rem] px-4 py-4">
                    <div className="font-medium text-slate-950">
                      {getContentPreview(comment.content || comment.text)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{comment.id}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-950">
                      {comment.userEmail || comment.userId || "未知读者"}
                    </div>
                    {comment.userEmail && comment.userId ? (
                      <div className="mt-1 text-xs text-slate-500">{comment.userId}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <AdminBadge tone={comment.rating ? "warning" : "default"}>
                      {formatRating(comment.rating)}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(comment.createdAt)}</td>
                </AdminTableRow>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </AdminTableShell>
    </AdminPageSection>
  );
}
