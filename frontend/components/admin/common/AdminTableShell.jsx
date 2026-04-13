import React from "react";

import { LoadingState } from "./LoadingState";
import { AdminListPagination } from "./AdminListPagination";

export function AdminTableShell({
  isError,
  errorMessage,
  onRetry,
  isLoading,
  hasItems,
  emptyMessage,
  loadingFallback = null,
  emptyFallback = null,
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  containerClassName = "overflow-hidden rounded-[28px] border border-[color:var(--gush-border)] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]",
  tableWrapperClassName = "overflow-x-auto",
  paginationProps = {},
  children,
}) {
  if (isError) {
    return <LoadingState.ErrorState error={errorMessage} onRetry={onRetry} />;
  }

  if (isLoading) {
    return loadingFallback || <LoadingState.Spinner size="md" text="正在加载表格" />;
  }

  if (!hasItems) {
    return emptyFallback || <LoadingState.EmptyState message={emptyMessage} />;
  }

  return (
    <div className={containerClassName}>
      <div className={tableWrapperClassName}>{children}</div>
      <AdminListPagination
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        {...paginationProps}
      />
    </div>
  );
}
