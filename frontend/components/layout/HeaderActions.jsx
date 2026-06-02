"use client";

import { Bell, Menu, User, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { siteConfig } from "../../lib/siteConfig";
import { cn } from "@/lib/utils";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function AuthSkeleton({ variant = "default" }) {
  return (
    <div
      className="hidden h-11 w-24 animate-pulse rounded-full border border-white/10 bg-[rgba(255,255,255,0.035)] sm:block"
      aria-hidden="true"
    />
  );
}

const ICON_BUTTON_CLASS =
  `relative inline-flex h-11 w-11 items-center justify-center px-0 ${storefrontSecondaryButtonClass}`;

export default function HeaderActions({
  onWalletClick,
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
  const { paidPts, bonusPts } = useWalletStore();
  const { unreadCount } = useNotificationsStore();
  const adultToggleLabel = isAdultMode ? "Normal" : `${legalAge}+`;
  const adultToggleAriaLabel = isAdultMode
    ? "Switch to standard mode"
    : `Switch to ${legalAge}+ mode`;
  const walletTotal = paidPts + bonusPts;
  const showWallet = hydrated && isSignedIn && variant !== "home";
  const iconButtonClass = ICON_BUTTON_CLASS;

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
      {showWallet ? (
        <button
          type="button"
          onClick={onWalletClick}
          className={`hidden h-11 items-center gap-2 px-4 text-white lg:inline-flex ${storefrontSecondaryButtonClass}`}
          aria-label={`View your wallet${walletTotal > 0 ? ` with ${walletTotal.toLocaleString()} points` : ""}`}
        >
          <Wallet className="size-4" strokeWidth={2} />
          <span className="text-sm font-semibold tracking-[0.01em]">
            Wallet
          </span>
          <span className="text-xs font-semibold tabular-nums text-white/62">
            {walletTotal.toLocaleString()}
          </span>
        </button>
      ) : null}

      {hydrated && isSignedIn ? (
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className={cn(
            iconButtonClass,
            "hidden items-center justify-center sm:inline-flex",
          )}
          aria-label={
            unreadCount > 0
              ? `View your notifications, ${unreadCount > 99 ? "99 plus" : unreadCount} unread`
              : "View your notifications"
          }
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_10px_24px_rgba(239,68,68,0.35)]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {showAdultToggle ? (
        <button
          type="button"
          onClick={onAdultToggleClick}
          className={cn(
            "inline-flex h-11 min-w-[5.3rem] items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-150 sm:min-w-[6.3rem] sm:px-3.5",
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
        <>
          <button
            type="button"
            onClick={() => router.push("/account")}
            className={`hidden h-11 items-center gap-2 border-[rgba(255,255,255,0.12)] bg-[linear-gradient(135deg,rgba(103,232,249,0.14)_0%,rgba(255,255,255,0.04)_100%)] px-4 text-sm font-medium tracking-[0.01em] text-white sm:inline-flex ${storefrontSecondaryButtonClass}`}
          >
            <User className="size-4" />
            Account
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onLoginClick}
          className={`hidden h-11 items-center justify-center px-5 text-sm font-semibold tracking-[0.01em] text-[#160d13] sm:inline-flex ${storefrontPrimaryButtonClass}`}
        >
          Sign In
        </button>
      )}
    </div>
  );
}
