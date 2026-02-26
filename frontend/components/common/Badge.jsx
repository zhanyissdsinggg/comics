"use client";

import { memo } from "react";

/**
 * 老王注释：Badge徽章组件 - iOS风格
 * 功能：显示标签、状态、数字等
 * 遵循KISS原则：简洁的徽章展示
 * 遵循DRY原则：可复用的Badge组件
 */

export const Badge = memo(function Badge({
  children,
  variant = "default",
  size = "md",
  rounded = "full",
  className = ""
}) {
  const variantClasses = {
    default: "bg-neutral-800 text-neutral-300 border-neutral-700",
    primary: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5"
  };

  const roundedClasses = {
    none: "rounded-none",
    sm: "rounded",
    md: "rounded-lg",
    lg: "rounded-xl",
    full: "rounded-full"
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold border ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClasses[rounded]} ${className}`}
    >
      {children}
    </span>
  );
});

// 数字徽章（用于通知数量等）
export const NumberBadge = memo(function NumberBadge({
  count = 0,
  max = 99,
  showZero = false,
  variant = "error",
  size = "md",
  className = ""
}) {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge variant={variant} size={size} className={className}>
      {displayCount}
    </Badge>
  );
});

// 点徽章（用于未读标记等）
export const DotBadge = memo(function DotBadge({
  variant = "error",
  size = "md",
  className = ""
}) {
  const sizeClasses = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5"
  };

  const variantClasses = {
    default: "bg-neutral-500",
    primary: "bg-emerald-500",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-500"
  };

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    />
  );
});

// 状态徽章（带图标）
export const StatusBadge = memo(function StatusBadge({
  status = "default",
  text,
  showDot = true,
  size = "md",
  className = ""
}) {
  const statusConfig = {
    online: { variant: "success", text: text || "Online" },
    offline: { variant: "default", text: text || "Offline" },
    away: { variant: "warning", text: text || "Away" },
    busy: { variant: "error", text: text || "Busy" }
  };

  const config = statusConfig[status] || statusConfig.default;

  return (
    <Badge variant={config.variant} size={size} className={`gap-1.5 ${className}`}>
      {showDot && <DotBadge variant={config.variant} size="sm" />}
      {config.text}
    </Badge>
  );
});

// 标签徽章（用于分类、类型等）
export const TagBadge = memo(function TagBadge({
  children,
  variant = "default",
  onRemove,
  className = ""
}) {
  return (
    <Badge variant={variant} size="md" className={`gap-1.5 ${className}`}>
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded-full hover:bg-white/10 p-0.5 transition-colors"
          aria-label="Remove"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </Badge>
  );
});

export default Badge;
