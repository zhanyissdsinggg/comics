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
  containerClassName = "overflow-hidden rounded-[30px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(246,246,248,0.96))] shadow-[0_16px_38px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]",
  tableWrapperClassName = "overflow-x-auto",
  paginationProps = {},
  children,
}) {
  if (isError) {
    return <LoadingState.ErrorState error={errorMessage} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      loadingFallback || (
        <LoadingState.Spinner size="md" text="正在加载列表内容" />
      )
    );
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
