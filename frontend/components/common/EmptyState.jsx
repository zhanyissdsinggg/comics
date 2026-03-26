"use client";

import { memo } from "react";
import NetworkFallback from "./NetworkFallback";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  FileText,
  Heart,
  Inbox,
  Search,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  inbox: Inbox,
  search: Search,
  book: BookOpen,
  heart: Heart,
  cart: ShoppingCart,
  bell: Bell,
  file: FileText,
  alert: AlertCircle,
};

export const EmptyState = memo(function EmptyState({
  icon = "inbox",
  title = "Nothing is here yet",
  description,
  action,
  actionText,
  eyebrow = "Next step",
  className = "",
  appearance = "default",
}) {
  const Icon = iconMap[icon] || Inbox;
  const isLight = appearance === "light";
  const resolvedAction =
    typeof action === "function"
      ? { onClick: action, label: actionText }
      : action && typeof action === "object"
        ? {
            onClick: typeof action.onClick === "function" ? action.onClick : null,
            label: action.label || actionText,
          }
        : null;
  const accentClass =
    icon === "alert"
      ? isLight
        ? "border-red-200 bg-red-50 text-red-500"
        : "border-red-400/20 bg-red-500/[0.08] text-red-200"
      : isLight
        ? "border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.06)] text-[var(--gush-accent,#2f6bff)]"
        : "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(14,18,28,0.9),rgba(8,11,16,0.98))] px-4 py-12 text-center shadow-[0_22px_80px_rgba(0,0,0,0.2)]",
        isLight &&
          "border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] shadow-[0_18px_42px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isLight
            ? "bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.08),transparent_26%),radial-gradient(circle_at_82%_0%,rgba(255,255,255,0.7),transparent_24%)]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_82%_0%,rgba(16,185,129,0.12),transparent_24%)]"
        }`}
      />
      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <div
          className={cn(
            "mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] border shadow-[0_18px_50px_rgba(0,0,0,0.16)]",
            accentClass,
          )}
        >
          <Icon size={36} strokeWidth={1.6} />
        </div>

        <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${isLight ? "text-slate-500" : "text-neutral-500"}`}>
          {eyebrow}
        </p>

        <h3 className={`mt-3 font-display text-2xl font-semibold tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
          {title}
        </h3>

        {description ? (
          <p className={`mt-3 max-w-md text-sm leading-7 ${isLight ? "text-slate-600" : "text-neutral-400"}`}>{description}</p>
        ) : null}

        {resolvedAction?.onClick && resolvedAction?.label ? (
          <button
            type="button"
            onClick={resolvedAction.onClick}
            className={`mt-6 inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200 ${
              isLight
                ? icon === "alert"
                  ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  : "border-black/8 bg-slate-950 text-white hover:bg-slate-800"
                : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300/50 hover:bg-emerald-400/16"
            }`}
          >
            <span>{resolvedAction.label}</span>
            <ArrowRight size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
});

export const EmptyLibrary = memo(function EmptyLibrary({ onBrowse }) {
  return (
    <EmptyState
      icon="book"
      title="Your library is empty"
      description="Start adding series to your library to keep track of your reading progress."
      action={onBrowse}
      actionText="Browse Series"
      eyebrow="Library"
    />
  );
});

export const EmptySearch = memo(function EmptySearch({ query }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description={
        query
          ? `We couldn't find anything matching "${query}". Try different keywords.`
          : "Try searching for something else."
      }
      eyebrow="Search"
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
      eyebrow="Favorites"
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
      eyebrow="Orders"
    />
  );
});

export const EmptyNotifications = memo(function EmptyNotifications() {
  return (
    <EmptyState
      icon="bell"
      title="No notifications"
      description="You're all caught up! We'll notify you when there's something new."
      eyebrow="Notifications"
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
      eyebrow="History"
    />
  );
});

export const ErrorState = memo(function ErrorState({
  onRetry,
  title = "Oops! We're having trouble loading this.",
  description = "We're having trouble connecting. Your data is safe, let's try that again.",
  retryLabel = "Retry",
  className = "",
}) {
  return (
    <NetworkFallback
      compact
      title={title}
      description={description}
      retryLabel={retryLabel}
      onRetry={onRetry}
      className={className}
    />
  );
});

export default EmptyState;
