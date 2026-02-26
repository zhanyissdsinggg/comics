"use client";

import { memo } from "react";
import {
  Inbox,
  Search,
  BookOpen,
  Heart,
  ShoppingCart,
  Bell,
  FileText,
  AlertCircle
} from "lucide-react";

/**
 * 老王注释：空状态组件 - iOS风格
 * 功能：友好的空数据提示，支持多种场景
 * 遵循KISS原则：简洁的空状态展示
 * 遵循DRY原则：可复用的Empty组件
 */

const iconMap = {
  inbox: Inbox,
  search: Search,
  book: BookOpen,
  heart: Heart,
  cart: ShoppingCart,
  bell: Bell,
  file: FileText,
  alert: AlertCircle
};

export const EmptyState = memo(function EmptyState({
  icon = "inbox",
  title = "No data",
  description,
  action,
  actionText,
  className = ""
}) {
  const Icon = iconMap[icon] || Inbox;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {/* 老王注释：图标 */}
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 text-neutral-500">
        <Icon size={40} strokeWidth={1.5} />
      </div>

      {/* 老王注释：标题 */}
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>

      {/* 老王注释：描述 */}
      {description && (
        <p className="mb-6 max-w-sm text-center text-sm text-neutral-400">
          {description}
        </p>
      )}

      {/* 老王注释：操作按钮 */}
      {action && actionText && (
        <button
          type="button"
          onClick={action}
          className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-emerald-600 active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
});

// 预设的空状态组件

export const EmptyLibrary = memo(function EmptyLibrary({ onBrowse }) {
  return (
    <EmptyState
      icon="book"
      title="Your library is empty"
      description="Start adding series to your library to keep track of your reading progress."
      action={onBrowse}
      actionText="Browse Series"
    />
  );
});

export const EmptySearch = memo(function EmptySearch({ query }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description={query ? `We couldn't find anything matching "${query}". Try different keywords.` : "Try searching for something else."}
    />
  );
});

export const EmptyFavorites = memo(function EmptyFavorites({ onBrowse }) {
  return (
    <EmptyState
      icon="heart"
      title="No favorites yet"
      description="Mark series as favorites to easily find them later."
      action={onBrowse}
      actionText="Discover Series"
    />
  );
});

export const EmptyOrders = memo(function EmptyOrders({ onShop }) {
  return (
    <EmptyState
      icon="cart"
      title="No orders yet"
      description="You haven't made any purchases yet. Start shopping to unlock episodes!"
      action={onShop}
      actionText="Browse Store"
    />
  );
});

export const EmptyNotifications = memo(function EmptyNotifications() {
  return (
    <EmptyState
      icon="bell"
      title="No notifications"
      description="You're all caught up! We'll notify you when there's something new."
    />
  );
});

export const EmptyHistory = memo(function EmptyHistory({ onBrowse }) {
  return (
    <EmptyState
      icon="file"
      title="No reading history"
      description="Start reading to build your history and pick up where you left off."
      action={onBrowse}
      actionText="Start Reading"
    />
  );
});

export const ErrorState = memo(function ErrorState({ onRetry }) {
  return (
    <EmptyState
      icon="alert"
      title="Something went wrong"
      description="We couldn't load this content. Please try again."
      action={onRetry}
      actionText="Retry"
    />
  );
});

export default EmptyState;
