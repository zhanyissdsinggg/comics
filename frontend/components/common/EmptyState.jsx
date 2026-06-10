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
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "./StorefrontPagePrimitives";

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
  secondaryAction,
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
  const resolvedSecondaryAction =
    typeof secondaryAction === "function"
      ? { onClick: secondaryAction, label: "" }
      : secondaryAction && typeof secondaryAction === "object"
        ? {
            href:
              typeof secondaryAction.href === "string" &&
              secondaryAction.href.trim()
                ? secondaryAction.href.trim()
                : "",
            onClick:
              typeof secondaryAction.onClick === "function"
                ? secondaryAction.onClick
                : null,
            label: secondaryAction.label || "",
          }
        : null;

  const accentClass = isLight
    ? icon === "alert"
      ? "border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] text-rose-600 shadow-[0_12px_28px_rgba(244,63,94,0.08)]"
      : "border border-black/10 bg-[#f6f7f9] text-black shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
    : icon === "alert"
      ? "border border-[rgba(255,79,154,0.24)] bg-[rgba(255,79,154,0.14)] text-[var(--gush-danger)] shadow-[0_14px_30px_rgba(255,79,154,0.16)]"
      : "border border-[rgba(103,232,249,0.2)] bg-[rgba(103,232,249,0.12)] text-[var(--gush-cyan)] shadow-[0_14px_30px_rgba(8,6,20,0.22)]";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[30px] px-4 py-10 text-center",
        isLight
          ? "border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] shadow-[0_20px_46px_rgba(15,23,42,0.08)]"
          : "border border-white/12 bg-[linear-gradient(180deg,rgba(29,24,37,0.98)_0%,rgba(16,13,24,0.98)_100%)] text-white shadow-[0_24px_58px_rgba(8,6,20,0.32)]",
        className,
      )}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isLight
            ? "bg-transparent"
            : "bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.12),transparent_28%),radial-gradient(circle_at_82%_0%,rgba(103,232,249,0.1),transparent_24%)]"
        }`}
      />
      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <div
          className={cn(
            "mb-5 flex h-16 w-16 items-center justify-center rounded-[20px]",
            accentClass,
          )}
        >
          <Icon size={28} strokeWidth={1.7} />
        </div>

        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${isLight ? "text-black/55" : "text-white/48"}`}
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
            className={`mt-3 max-w-md text-sm leading-6 ${isLight ? "text-black/68" : "text-white/66"}`}
          >
            {description}
          </p>
        ) : null}

        {resolvedAction?.label || resolvedSecondaryAction?.label ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {resolvedAction?.label ? (
              resolvedAction.href ? (
                <Link
                  href={resolvedAction.href}
                  className={`${storefrontPrimaryButtonClass} gap-2`}
                >
                  <span>{resolvedAction.label}</span>
                  <ArrowRight size={16} />
                </Link>
              ) : resolvedAction.onClick ? (
                <button
                  type="button"
                  onClick={resolvedAction.onClick}
                  className={`${storefrontPrimaryButtonClass} gap-2`}
                >
                  <span>{resolvedAction.label}</span>
                  <ArrowRight size={16} />
                </button>
              ) : null
            ) : null}

            {resolvedSecondaryAction?.label ? (
              resolvedSecondaryAction.href ? (
                <Link
                  href={resolvedSecondaryAction.href}
                  className={`inline-flex items-center justify-center px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)] active:translate-y-px ${
                    isLight
                      ? "border-black/15 bg-white text-black hover:border-black/25 hover:bg-black/[0.03]"
                      : `${storefrontSecondaryButtonClass} text-white/88 hover:border-white/35 hover:bg-white/5`
                  }`}
                >
                  <span>{resolvedSecondaryAction.label}</span>
                </Link>
              ) : resolvedSecondaryAction.onClick ? (
                <button
                  type="button"
                  onClick={resolvedSecondaryAction.onClick}
                  className={`inline-flex items-center justify-center px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)] active:translate-y-px ${
                    isLight
                      ? "border-black/15 bg-white text-black hover:border-black/25 hover:bg-black/[0.03]"
                      : `${storefrontSecondaryButtonClass} text-white/88 hover:border-white/35 hover:bg-white/5`
                  }`}
                >
                  <span>{resolvedSecondaryAction.label}</span>
                </button>
              ) : null
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});

export const EmptyLibrary = memo(function EmptyLibrary({ onBrowse }) {
  return (
    <EmptyState
      icon="book"
      title="Save a story to build your shelf"
      description="Start from Trending Covers or Rankings, then return here when a title is worth keeping."
      action={onBrowse}
      actionText="Find a Story"
      eyebrow="Saved Series"
    />
  );
});

export const EmptySearch = memo(function EmptySearch({ query }) {
  return (
    <EmptyState
      icon="search"
      title="No perfect match yet"
      description={
        query
          ? `Try a genre, mood, or story title after "${query}".`
          : ""
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
      description="When a title sticks with you, save it here for later."
      action={onBrowse}
      actionText="View title"
      eyebrow="Favorites"
    />
  );
});

export const EmptyOrders = memo(function EmptyOrders({ onShop }) {
  return (
    <EmptyState
      icon="cart"
      title="No orders yet"
      description="Top-ups, passes, and unlocks will show up here once you make a purchase."
      action={onShop}
      actionText="View title"
      eyebrow="Orders"
    />
  );
});

export const EmptyNotifications = memo(function EmptyNotifications() {
  return (
    <EmptyState
      icon="bell"
      title="No notifications"
      description="New updates, replies, and account alerts will land here."
      eyebrow="Notifications"
    />
  );
});

export const EmptyHistory = memo(function EmptyHistory({ onBrowse }) {
  return (
    <EmptyState
      icon="file"
      title="No reading history yet"
      description="Your latest chapters will show up here as soon as you start reading."
      action={onBrowse}
      actionText="Start reading"
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
