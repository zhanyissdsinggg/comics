"use client";

import { memo } from "react";

/**
 * 老王注释：骨架屏组件 - iOS风格
 * 功能：在内容加载时显示占位动画
 * 遵循KISS原则：简单的脉冲动画
 * 遵循DRY原则：可复用的骨架屏组件
 * shimmer动画已经在globals.css里定义好了
 */

// 基础骨架屏组件
export const Skeleton = memo(function Skeleton({
  className = "",
  variant = "default",
  width,
  height,
  rounded = "md",
}) {
  const roundedClasses = {
    none: "",
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    full: "rounded-full",
  };

  const variantClasses = {
    default: "bg-neutral-800/50",
    light: "bg-neutral-700/30",
    dark: "bg-neutral-900/50",
  };

  return (
    <div
      className={`skeleton animate-pulse ${variantClasses[variant]} ${roundedClasses[rounded]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
});

// 文本骨架屏
export const SkeletonText = memo(function SkeletonText({
  lines = 1,
  className = "",
  lastLineWidth = "60%",
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="1rem"
          width={index === lines - 1 ? lastLineWidth : "100%"}
          rounded="sm"
        />
      ))}
    </div>
  );
});

// 卡片骨架屏
export const SkeletonCard = memo(function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 ${className}`}
    >
      <Skeleton height="12rem" className="mb-4" rounded="lg" />
      <Skeleton height="1.5rem" width="80%" className="mb-2" rounded="sm" />
      <Skeleton height="1rem" width="60%" rounded="sm" />
    </div>
  );
});

// Episode卡片骨架屏
export const SkeletonEpisode = memo(function SkeletonEpisode({
  className = "",
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 ${className}`}
    >
      {/* 缩略图 */}
      <Skeleton width="6rem" height="8rem" rounded="lg" />

      {/* 内容 */}
      <div className="flex-1 space-y-3">
        <div>
          <Skeleton
            height="1.25rem"
            width="40%"
            className="mb-2"
            rounded="sm"
          />
          <Skeleton height="0.875rem" width="30%" rounded="sm" />
        </div>
        <Skeleton height="0.75rem" width="50%" rounded="sm" />
      </div>

      {/* 按钮 */}
      <Skeleton width="6rem" height="2.5rem" rounded="full" />
    </div>
  );
});

// 系列详情头部骨架屏
export const SkeletonSeriesHeader = memo(function SkeletonSeriesHeader({
  className = "",
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 标题和描述 */}
      <div>
        <Skeleton height="2rem" width="70%" className="mb-3" rounded="sm" />
        <SkeletonText lines={2} />
      </div>

      {/* 标签 */}
      <div className="flex gap-2">
        <Skeleton width="4rem" height="1.5rem" rounded="full" />
        <Skeleton width="5rem" height="1.5rem" rounded="full" />
      </div>

      {/* 按钮组 */}
      <div className="flex gap-2">
        <Skeleton width="8rem" height="3rem" rounded="full" />
        <Skeleton width="8rem" height="3rem" rounded="full" />
      </div>

      {/* 信息栏 */}
      <Skeleton height="3rem" rounded="lg" />
    </div>
  );
});

// 漫画卡片骨架屏（Portrait）
export const SkeletonPortraitCard = memo(function SkeletonPortraitCard({
  className = "",
}) {
  return (
    <div className={`w-full ${className}`}>
      {/* 封面 */}
      <Skeleton height="16rem" className="mb-3" rounded="lg" />

      {/* 标题 */}
      <Skeleton height="1rem" width="90%" className="mb-2" rounded="sm" />

      {/* 类型 */}
      <Skeleton height="0.875rem" width="60%" rounded="sm" />
    </div>
  );
});

// 列表骨架屏（多个项目）
export const SkeletonList = memo(function SkeletonList({
  count = 3,
  type = "card",
  className = "",
}) {
  const SkeletonComponent =
    {
      card: SkeletonCard,
      episode: SkeletonEpisode,
      portrait: SkeletonPortraitCard,
    }[type] || SkeletonCard;

  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </div>
  );
});

// 默认导出基础组件（保持向后兼容）
export default function SkeletonBase({ className = "" }) {
  return <div className={`skeleton ${className}`.trim()} />;
}
