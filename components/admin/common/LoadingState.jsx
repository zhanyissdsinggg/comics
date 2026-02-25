/**
 * 通用加载状态组件
 * 统一所有admin页面的加载UI
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * 骨架屏加载组件
 */
export const SkeletonLoader = React.memo(function SkeletonLoader({ count = 5, height = 'h-12' }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} animate-pulse rounded-lg bg-neutral-800`} />
      ))}
    </div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

/**
 * 旋转加载器
 */
export const Spinner = React.memo(function Spinner({ size = 'md', text = '加载中...' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <RefreshCw className={`${sizeClasses[size]} animate-spin text-emerald-500`} />
      {text && <p className="text-sm text-neutral-400">{text}</p>}
    </div>
  );
});

Spinner.displayName = 'Spinner';

/**
 * 通用加载状态组件
 */
export const LoadingState = React.memo(function LoadingState({
  isLoading,
  type = 'skeleton', // 'skeleton' | 'spinner'
  count = 5,
  height = 'h-12',
  text = '加载中...',
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

/**
 * 空状态组件
 */
export const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title = '暂无数据',
  description = '没有找到相关数据',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 py-12">
      {Icon && <Icon className="h-12 w-12 text-neutral-600" />}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-300">{title}</h3>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

/**
 * 错误状态组件
 */
export const ErrorState = React.memo(function ErrorState({
  error,
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-900/30 bg-red-900/10 py-12">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-red-400">加载失败</h3>
        <p className="mt-1 text-sm text-red-300">{error || '发生了一个错误'}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          重试
        </button>
      )}
    </div>
  );
});

ErrorState.displayName = 'ErrorState';
