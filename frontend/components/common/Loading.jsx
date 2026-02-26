"use client";

import { memo } from "react";
import { Loader2 } from "lucide-react";

/**
 * 老王注释：通用Loading加载组件 - iOS风格
 * 功能：显示加载状态，支持多种尺寸和样式
 * 遵循KISS原则：简洁的加载动画
 * 遵循DRY原则：可复用的Loading组件
 */

// 基础Loading组件
export const Loading = memo(function Loading({
  size = "md",
  variant = "default",
  text,
  fullScreen = false,
  className = ""
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  const variantClasses = {
    default: "text-emerald-400",
    light: "text-white",
    dark: "text-neutral-600"
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2
        className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`}
      />
      {text && (
        <p className="text-sm text-neutral-400 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
});

// 页面Loading组件
export const PageLoading = memo(function PageLoading({ text = "Loading..." }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loading size="lg" text={text} />
    </div>
  );
});

// 按钮Loading组件
export const ButtonLoading = memo(function ButtonLoading({ text = "Loading..." }) {
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </span>
  );
});

// 卡片Loading组件（带毛玻璃背景）
export const CardLoading = memo(function CardLoading({ text }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900/40 backdrop-blur-md p-8">
      <Loading size="md" text={text} />
    </div>
  );
});

// Spinner组件（纯旋转图标）
export const Spinner = memo(function Spinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <Loader2 className={`animate-spin text-emerald-400 ${sizeClasses[size]} ${className}`} />
  );
});

// 默认导出
export default Loading;
