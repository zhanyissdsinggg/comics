import React from 'react';
import { LoadingState } from './LoadingState';

const DEFAULT_CONTAINER_CLASS = 'rounded-lg border border-neutral-700 bg-neutral-800 p-4';

export function AdminDataState({
  isLoading,
  hasData,
  emptyMessage = null,
  wrap = true,
  containerClassName = DEFAULT_CONTAINER_CLASS,
  spinnerSize = 'md',
  children,
}) {
  if (isLoading) {
    return <LoadingState.Spinner size={spinnerSize} />;
  }

  if (!hasData) {
    return emptyMessage ? <LoadingState.EmptyState message={emptyMessage} /> : null;
  }

  const resolvedChildren = typeof children === 'function' ? children() : children;

  if (!wrap) {
    return resolvedChildren;
  }

  return <div className={containerClassName}>{resolvedChildren}</div>;
}
