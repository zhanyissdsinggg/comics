"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import {
  CommentsListSection,
  CommentsSummaryCards,
} from "@/components/admin/comments-workspace/sections";
import {
  searchFields,
  sortFields,
  sortOptions,
} from "@/components/admin/comments-workspace/utils";
import { AdminFeedbackBanner } from "@/components/admin/common/AdminFeedbackBanner";
import { ConfirmDialog } from "@/components/admin/common/ConfirmDialog";
import { AdminSortModal } from "@/components/admin/common/AdminSortModal";
import { useAdminList } from "@/lib/hooks/useAdminList";
import { useBulkDelete } from "@/lib/hooks/useBulkMutation";

export default function AdminCommentsPage() {
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const {
    items: comments,
    pagination,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    isError,
    error,
    refetch,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useAdminList("comments", searchFields, sortFields, "createdAt", "desc");

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const ratedCount = useMemo(
    () =>
      comments.filter(
        (comment) =>
          comment.rating !== null &&
          comment.rating !== undefined &&
          comment.rating !== "",
      ).length,
    [comments],
  );
  const uniqueReaders = useMemo(
    () =>
      new Set(
        comments
          .map((comment) => comment.userEmail || comment.userId)
          .filter(Boolean),
      ).size,
    [comments],
  );

  const bulkDeleteMutation = useBulkDelete("comments", {
    onSuccess: () => {
      clearSelection();
      setIsDeleteConfirmOpen(false);
      setFeedback({ type: "success", message: "已删除所选评论。" });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({
        type: "error",
        message: `删除所选评论失败：${mutationError.message}`,
      });
    },
  });

  return (
    <AdminShell title="评论管理" subtitle="处理读者评论和下线项。">
      <div className="space-y-6">
        <CommentsSummaryCards
          total={pagination.total}
          ratedCount={ratedCount}
          uniqueReaders={uniqueReaders}
        />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: "", message: "" })}
        />

        <CommentsListSection
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onOpenSortModal={() => setIsSortModalOpen(true)}
          sortOrder={sortOrder}
          onToggleSortOrder={() =>
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
          }
          selectedIds={selectedIds}
          clearSelection={clearSelection}
          onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
          deletePending={bulkDeleteMutation.isPending}
          isError={isError}
          errorMessage={error?.message || "评论加载失败。"}
          onRetry={refetch}
          isLoading={isLoading}
          comments={comments}
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          selectedIdsSet={selectedIdsSet}
          onSelectAll={(checked) => {
            if (checked) {
              selectAll(comments);
              return;
            }
            clearSelection();
          }}
          onToggleSelect={toggleSelect}
        />

        <AdminSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          options={sortOptions}
          title="评论排序"
          label="排序方式"
          actionLabel="应用"
        />

        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="删除评论"
          message={`确定删除所选 ${selectedIds.length} 条评论吗？`}
          confirmText="删除"
          cancelText="取消"
          isDangerous={true}
          isLoading={bulkDeleteMutation.isPending}
          onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </AdminShell>
  );
}
