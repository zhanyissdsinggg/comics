import React from 'react';
import { RefreshCw } from 'lucide-react';

const DEFAULT_EMPTY_TITLE = 'No data yet';
const DEFAULT_EMPTY_DESCRIPTION = 'No matching records were found.';
const DEFAULT_LOADING_TEXT = 'Loading...';
const DEFAULT_ERROR_TITLE = 'Unable to load data';
const DEFAULT_ERROR_MESSAGE = 'Something went wrong while loading this view.';
const RETRY_LABEL = 'Retry';

export const SkeletonLoader = React.memo(function SkeletonLoader({ count = 5, height = 'h-12' }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`${height} animate-pulse rounded-lg bg-neutral-800`} />
      ))}
    </div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

export const Spinner = React.memo(function Spinner({ size = 'md', text = DEFAULT_LOADING_TEXT }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <RefreshCw className={`${sizeClasses[size]} animate-spin text-emerald-500`} />
      {text ? <p className="text-sm text-neutral-400">{text}</p> : null}
    </div>
  );
});

Spinner.displayName = 'Spinner';

export const LoadingState = React.memo(function LoadingState({
  isLoading,
  type = 'skeleton',
  count = 5,
  height = 'h-12',
  text = DEFAULT_LOADING_TEXT,
  children,
}) {
  if (!isLoading) {
    return children;
  }

  if (type === 'skeleton') {
    return <SkeletonLoader count={count} height={height} />;
  }

  return <Spinner size="md" text={text} />;
});

LoadingState.displayName = 'LoadingState';

export const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title = DEFAULT_EMPTY_TITLE,
  description = DEFAULT_EMPTY_DESCRIPTION,
  message,
  action,
}) {
  const resolvedTitle = message && title === DEFAULT_EMPTY_TITLE ? message : title;
  const resolvedDescription =
    message && title === DEFAULT_EMPTY_TITLE && description === DEFAULT_EMPTY_DESCRIPTION
      ? ''
      : description;

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 py-12">
      {Icon ? <Icon className="h-12 w-12 text-neutral-600" /> : null}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-300">{resolvedTitle}</h3>
        {resolvedDescription ? <p className="mt-1 text-sm text-neutral-500">{resolvedDescription}</p> : null}
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export const ErrorState = React.memo(function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-900/30 bg-red-900/10 py-12">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-red-400">{DEFAULT_ERROR_TITLE}</h3>
        <p className="mt-1 text-sm text-red-300">{error || DEFAULT_ERROR_MESSAGE}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          {RETRY_LABEL}
        </button>
      ) : null}
    </div>
  );
});

ErrorState.displayName = 'ErrorState';

LoadingState.SkeletonLoader = SkeletonLoader;
LoadingState.Spinner = Spinner;
LoadingState.EmptyState = EmptyState;
LoadingState.ErrorState = ErrorState;