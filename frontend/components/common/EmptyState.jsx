"use client";

import { memo } from "react";
import Link from "next/link";
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
  const isLight = appearance === "light";
  const resolvedAction =
    typeof action === "function"
      ? { onClick: action, label: actionText }
      : action && typeof action === "object"
        ? {
            href:
              typeof action.href === "string" && action.href.trim()
                ? action.href.trim()
                : "",
            onClick:
              typeof action.onClick === "function" ? action.onClick : null,
            label: action.label || actionText,
          }
        : null;
  const accentClass =
    icon === "alert"
      ? isLight
        ? "border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] text-rose-600"
        : "border-2 border-black bg-[#FF007A] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      : isLight
        ? "border border-black/10 bg-[#f6f7f9] text-black"
        : "border-2 border-black bg-[#00E5FF] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[30px] px-4 py-10 text-center",
        isLight
          ? "border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] shadow-[0_20px_46px_rgba(15,23,42,0.08)]"
          : "border-2 border-black bg-[#0b0b0b] text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
        className,
      )}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isLight
            ? "bg-transparent"
            : "bg-[radial-gradient(circle_at_top_left,rgba(255,229,0,0.16),transparent_28%),radial-gradient(circle_at_82%_0%,rgba(0,229,255,0.12),transparent_24%)]"
        }`}
      />
      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <div
          className={cn(
            "mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] border shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
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
          className={`mt-3 font-display text-2xl font-semibold tracking-[-0.05em] ${isLight ? "text-black" : "text-white"}`}
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

        {resolvedAction?.label ? (
          resolvedAction.href ? (
            <Link
              href={resolvedAction.href}
              className={`mt-6 ${
                isLight
                  ? icon === "alert"
                    ? "inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-rose-700 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-[linear-gradient(180deg,#fff0f4_0%,#ffe7ee_100%)] hover:shadow-[0_12px_24px_rgba(244,63,94,0.1)] active:translate-y-px"
                    : `${storefrontPrimaryButtonClass} gap-2`
                  : `${storefrontPrimaryButtonClass} gap-2`
              }`}
            >
              <span>{resolvedAction.label}</span>
              <ArrowRight size={16} />
            </Link>
          ) : resolvedAction.onClick ? (
            <button
              type="button"
              onClick={resolvedAction.onClick}
              className={`mt-6 ${
                isLight
                  ? icon === "alert"
                    ? "inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-rose-700 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-[linear-gradient(180deg,#fff0f4_0%,#ffe7ee_100%)] hover:shadow-[0_12px_24px_rgba(244,63,94,0.1)] active:translate-y-px"
                    : `${storefrontPrimaryButtonClass} gap-2`
                  : `${storefrontPrimaryButtonClass} gap-2`
              }`}
            >
              <span>{resolvedAction.label}</span>
              <ArrowRight size={16} />
            </button>
          ) : null
        ) : null}
      </div>
    </div>
  );
});

export const EmptyLibrary = memo(function EmptyLibrary({ onBrowse }) {
  return (
    <EmptyState
      icon="book"
      title="Library is empty"
      description=""
      action={onBrowse}
      actionText="Top Picks"
      eyebrow="Library"
    />
  );
});

export const EmptySearch = memo(function EmptySearch({ query }) {
  return (
    <EmptyState
      icon="search"
      title="No results"
      description={query ? `"${query}" didn't match anything.` : ""}
      eyebrow="Search"
    />
  );
});

export const EmptyFavorites = memo(function EmptyFavorites({ onBrowse }) {
  return (
    <EmptyState
      icon="heart"
      title="No favorites"
      description=""
      action={onBrowse}
      actionText="Top Picks"
      eyebrow="Favorites"
    />
  );
});

export const EmptyOrders = memo(function EmptyOrders({ onShop }) {
  return (
    <EmptyState
      icon="cart"
      title="No orders"
      description=""
      action={onShop}
      actionText="Store"
      eyebrow="Orders"
    />
  );
});

export const EmptyNotifications = memo(function EmptyNotifications() {
  return (
    <EmptyState
      icon="bell"
      title="No notifications"
      description=""
      eyebrow="Notifications"
    />
  );
});

export const EmptyHistory = memo(function EmptyHistory({ onBrowse }) {
  return (
    <EmptyState
      icon="file"
      title="No history"
      description=""
      action={onBrowse}
      actionText="Start Reading"
      eyebrow="History"
    />
  );
});

export const ErrorState = memo(function ErrorState({
  onRetry,
  title = "Couldn't load.",
  description = "Try again.",
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
