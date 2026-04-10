import React from "react";
import { RefreshCw } from "lucide-react";
import SharedEmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

const DEFAULT_EMPTY_TITLE = "暂时没有内容";
const DEFAULT_EMPTY_DESCRIPTION = "当前视图下还没有可显示的记录。";
const DEFAULT_LOADING_TEXT = "正在加载后台内容";
const DEFAULT_ERROR_TITLE = "这个页面暂时无法加载";
const DEFAULT_ERROR_MESSAGE = "这次请求没有正常完成，请稍后再试。";
const RETRY_LABEL = "重新加载";

export const SkeletonLoader = React.memo(function SkeletonLoader({
  count = 5,
  height = "h-12",
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${height} skeleton rounded-[20px] border border-[color:var(--gush-border)] bg-white/70`}
        />
      ))}
    </div>
  );
});

SkeletonLoader.displayName = "SkeletonLoader";

export const Spinner = React.memo(function Spinner({
  size = "md",
  text = DEFAULT_LOADING_TEXT,
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] border border-[color:var(--gush-border)] bg-white/96 px-6 py-10 text-center shadow-[var(--gush-shadow-soft)]">
      <RefreshCw className={`${sizeClasses[size]} animate-spin text-slate-900`} />
      {text ? <p className="text-sm text-slate-500">{text}</p> : null}
    </div>
  );
});

Spinner.displayName = "Spinner";

export const LoadingState = React.memo(function LoadingState({
  isLoading,
  type = "skeleton",
  count = 5,
  height = "h-12",
  text = DEFAULT_LOADING_TEXT,
  children,
}) {
  if (!isLoading) {
    return children;
  }

  if (type === "skeleton") {
    return <SkeletonLoader count={count} height={height} />;
  }

  return <Spinner size="md" text={text} />;
});

LoadingState.displayName = "LoadingState";

export const EmptyState = React.memo(function AdminEmptyState({
  icon,
  title = DEFAULT_EMPTY_TITLE,
  description = DEFAULT_EMPTY_DESCRIPTION,
  message,
  action,
}) {
  const resolvedTitle = message && title === DEFAULT_EMPTY_TITLE ? message : title;
  const resolvedDescription =
    message && title === DEFAULT_EMPTY_TITLE && description === DEFAULT_EMPTY_DESCRIPTION
      ? ""
      : description;

  return (
    <SharedEmptyState
      icon={icon || "inbox"}
      title={resolvedTitle}
      description={resolvedDescription}
      action={action}
      appearance="light"
      eyebrow="后台"
    />
  );
});

EmptyState.displayName = "AdminEmptyState";

export const ErrorState = React.memo(function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-[28px] border border-red-200 bg-red-50/90 px-6 py-10 text-center shadow-[var(--gush-shadow-soft)]">
      <h3 className="text-lg font-semibold text-red-700">{DEFAULT_ERROR_TITLE}</h3>
      <p className="mt-2 text-sm leading-6 text-red-600">{error || DEFAULT_ERROR_MESSAGE}</p>
      {onRetry ? (
        <div className="mt-5 flex justify-center">
          <Button type="button" variant="destructive" onClick={onRetry}>
            {RETRY_LABEL}
          </Button>
        </div>
      ) : null}
    </div>
  );
});

ErrorState.displayName = "ErrorState";

LoadingState.SkeletonLoader = SkeletonLoader;
LoadingState.Spinner = Spinner;
LoadingState.EmptyState = EmptyState;
LoadingState.ErrorState = ErrorState;
