"use client";

import { Bell, Bookmark, Menu, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { cn } from "@/lib/utils";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function AuthSkeleton({ variant = "default" }) {
  return (
    <div
      className="hidden h-11 w-11 animate-pulse rounded-full border border-white/10 bg-[rgba(255,255,255,0.035)] sm:block lg:w-24"
      aria-hidden="true"
    />
  );
}

const ICON_BUTTON_CLASS =
  `relative inline-flex h-11 w-11 items-center justify-center px-0 text-white/82 [&>svg]:stroke-current ${storefrontSecondaryButtonClass}`;
const HEADER_ACTION_PILL_CLASS =
  `relative inline-flex h-11 items-center justify-center gap-2 rounded-full px-3 text-white/82 [&>svg]:stroke-current ${storefrontSecondaryButtonClass}`;

export default function HeaderActions({
  onAdultToggleClick,
  onLoginClick,
  onMenuClick,
  isAdultMode,
  legalAge,
  variant = "default",
  showAdultToggle = true,
}) {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const { unreadCount } = useNotificationsStore();
  const adultToggleLabel = isAdultMode ? "Normal" : `${legalAge}+`;
  const adultToggleAriaLabel = isAdultMode
    ? "Switch to standard mode"
    : `Switch to ${legalAge}+ mode`;
  void variant;
  const iconButtonClass = ICON_BUTTON_CLASS;

  const handleNotificationsClick = () => {
    if (!hydrated || !isSignedIn) {
      onLoginClick?.();
      return;
    }
    router.push("/notifications");
  };

  const handleLibraryClick = () => {
    router.push("/library");
  };

  const handleLoginRouteClick = () => {
    if (typeof window === "undefined") {
      router.push("/login");
      return;
    }

    const returnTo = `${window.location.pathname}${window.location.search || ""}`;
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleAccountClick = () => {
    if (!hydrated || !isSignedIn) {
      onLoginClick?.();
      return;
    }
    router.push("/account");
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5 lg:gap-3">
      {hydrated && isSignedIn ? (
        <button
          type="button"
          onClick={handleNotificationsClick}
          className={cn(
            HEADER_ACTION_PILL_CLASS,
            "hidden min-w-11 items-center justify-center md:inline-flex lg:px-4",
          )}
          aria-label={
            unreadCount > 0
              ? `View notifications, ${unreadCount > 99 ? "99 plus" : unreadCount} unread`
              : "Open notifications"
          }
          title="Notifications"
        >
          <Bell aria-hidden="true" className="size-4 shrink-0" />
          <span className="hidden text-xs font-semibold lg:inline">Alerts</span>
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff4f9a_0%,#ff7ab1_100%)] px-1 text-[10px] font-bold text-white shadow-[0_10px_24px_rgba(255,79,154,0.32)]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      ) : null}

      <button
        type="button"
        onClick={handleLibraryClick}
        className={cn(
          HEADER_ACTION_PILL_CLASS,
          "hidden min-w-11 items-center justify-center md:inline-flex lg:px-4",
        )}
        aria-label="Open library"
        title="Library"
      >
        <Bookmark aria-hidden="true" className="size-4 shrink-0" />
        <span className="hidden text-xs font-semibold lg:inline">Library</span>
      </button>

      {showAdultToggle ? (
        <button
          type="button"
          onClick={onAdultToggleClick}
          className={cn(
            "inline-flex h-11 min-w-[5.3rem] items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-150 lg:min-w-[6.3rem] lg:px-3.5",
            isAdultMode
              ? "border-[rgba(255,79,154,0.34)] bg-[linear-gradient(135deg,rgba(255,79,154,0.22)_0%,rgba(120,54,84,0.3)_100%)] text-white shadow-[0_16px_32px_rgba(255,79,154,0.18)]"
              : storefrontSecondaryButtonClass,
          )}
          aria-label={adultToggleAriaLabel}
          aria-pressed={isAdultMode}
          title={adultToggleAriaLabel}
          data-testid="adult-toggle-button"
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className={cn(
                "inline-flex h-2 w-2 rounded-full",
                isAdultMode
                  ? "bg-[#ffd6e8] shadow-[0_0_0_6px_rgba(255,79,154,0.16)]"
                  : "bg-[var(--gush-cyan)] shadow-[0_0_0_6px_rgba(103,232,249,0.14)]",
              )}
            />
            <span className="text-white">{adultToggleLabel}</span>
          </span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={onMenuClick}
        className={cn(
          iconButtonClass,
          "inline-flex items-center justify-center sm:hidden",
        )}
        aria-label={
          hydrated && isSignedIn
            ? "Open menu and account options"
            : "Open main menu"
        }
        title="Open menu"
      >
        <Menu className="size-4" />
      </button>

      {!hydrated ? (
        <AuthSkeleton variant={variant} />
      ) : isSignedIn ? (
        <button
          type="button"
          onClick={handleAccountClick}
          className={cn(
            iconButtonClass,
            "hidden items-center justify-center md:inline-flex",
          )}
          aria-label="Open profile"
          title="Profile"
        >
          <User aria-hidden="true" className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleLoginRouteClick}
          className={`hidden h-11 items-center justify-center px-5 text-sm font-semibold tracking-[0.01em] text-[#160d13] sm:inline-flex ${storefrontPrimaryButtonClass}`}
        >
          Sign In
        </button>
      )}
    </div>
  );
}
