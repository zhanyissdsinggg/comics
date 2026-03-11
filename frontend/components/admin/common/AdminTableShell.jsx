import React from 'react';
import { LoadingState } from './LoadingState';
import { AdminListPagination } from './AdminListPagination';

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
  containerClassName = 'overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800',
  tableWrapperClassName = 'overflow-x-auto',
  paginationProps = {},
  children,
}) {
  if (isError) {
    return <LoadingState.ErrorState error={errorMessage} onRetry={onRetry} />;
  }

  if (isLoading) {
    return loadingFallback || <LoadingState.Spinner size="md" />;
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
