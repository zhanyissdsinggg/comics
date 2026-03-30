import React from "react";
import { LoadingState } from "./LoadingState";

const DEFAULT_CONTAINER_CLASS =
  "rounded-[24px] border border-black/8 bg-white/88 p-4 shadow-[var(--gush-shadow-soft)]";

export function AdminDataState({
  isLoading,
  hasData,
  emptyMessage = null,
  wrap = true,
  containerClassName = DEFAULT_CONTAINER_CLASS,
  spinnerSize = "md",
  children,
}) {
  if (isLoading) {
    return <LoadingState.Spinner size={spinnerSize} text="Loading content" />;
  }

  if (!hasData) {
    return emptyMessage ? (
      <LoadingState.EmptyState message={emptyMessage} />
    ) : null;
  }

  const resolvedChildren = typeof children === "function" ? children() : children;

  if (!wrap) {
    return resolvedChildren;
  }

  return <div className={containerClassName}>{resolvedChildren}</div>;
}
