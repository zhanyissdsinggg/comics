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
import { storefrontPrimaryButtonClass } from "./StorefrontPagePrimitives";

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
  title = "Nothing here yet",
  description,
  action,
  actionText,
  eyebrow = "Next step",
  className = "",
  appearance = "default",
}) {
  const Icon = iconMap[icon] || Inbox;
  const isLight = appearance === "light" || appearance === "default";
  const resolvedAction =
    typeof action === "function"
      ? { onClick: action, label: actionText }
      : action && typeof action === "object"
        ? {
            onClick:
              typeof action.onClick === "function" ? action.onClick : null,
            label: action.label || actionText,
          }
        : null;
  const accentClass =
    icon === "alert"
      ? isLight
        ? "border-[3px] border-black bg-[#ffe7ec] text-[#ff007a]"
        : "border-red-400/20 bg-red-500/[0.08] text-red-200"
      : isLight
        ? "border-[3px] border-black bg-[#ffe500] text-black"
        : "border-sky-400/20 bg-sky-400/[0.08] text-sky-100";

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(14,18,28,0.9),rgba(8,11,16,0.98))] px-4 py-10 text-center shadow-[0_22px_80px_rgba(0,0,0,0.2)]",
        isLight &&
          "border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]",
        className,
      )}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isLight
            ? "bg-transparent"
            : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_82%_0%,rgba(41,151,255,0.14),transparent_24%)]"
        }`}
      />
      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <div
          className={cn(
            "mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] border shadow-[5px_5px_0_0_rgba(0,0,0,1)]",
            accentClass,
          )}
        >
          <Icon size={28} strokeWidth={1.7} />
        </div>

        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${isLight ? "text-black/55" : "text-neutral-500"}`}
        >
          {eyebrow}
        </p>

        <h3
          className={`mt-3 font-display text-2xl font-black uppercase tracking-[-0.05em] ${isLight ? "text-black" : "text-white"}`}
        >
          {title}
        </h3>

        {description ? (
          <p
            className={`mt-3 max-w-md text-sm leading-6 ${isLight ? "text-black/68" : "text-neutral-400"}`}
          >
            {description}
          </p>
        ) : null}

        {resolvedAction?.onClick && resolvedAction?.label ? (
          <button
            type="button"
            onClick={resolvedAction.onClick}
            className={`mt-6 ${
              isLight
                ? icon === "alert"
                  ? "inline-flex items-center gap-2 border-[3px] border-black bg-[#ffe7ec] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#ff007a] transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffd3e0] hover:shadow-none"
                  : `${storefrontPrimaryButtonClass} gap-2`
                : "inline-flex items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-100 transition-all duration-200 hover:border-emerald-300/50 hover:bg-emerald-400/16"
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
      description="Saved titles appear here."
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
      title="No results"
      description={
        query
          ? `No match for "${query}". Try another keyword.`
          : "Try another keyword."
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
      description="Favorites appear here."
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
      description="Store purchases will appear here."
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
      description="You're caught up."
      eyebrow="Notifications"
    />
  );
});

export const EmptyHistory = memo(function EmptyHistory({ onBrowse }) {
  return (
    <EmptyState
      icon="file"
      title="No reading history"
      description="Recent reading appears here."
      action={onBrowse}
      actionText="Start Reading"
      eyebrow="History"
    />
  );
});

export const ErrorState = memo(function ErrorState({
  onRetry,
  title = "We couldn't load this yet.",
  description = "Connection looks shaky. Your data is safe. Try again.",
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
