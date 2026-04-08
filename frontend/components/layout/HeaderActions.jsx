"use client";

import { Bell, Menu, User, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function AuthSkeleton({ variant = "default" }) {
  const isHome = variant === "home";
  const isLight =
    variant === "light" || variant === "home" || variant === "default";
  return (
    <div
      className={`hidden h-10 w-24 animate-pulse rounded-full border sm:block ${
        isHome
          ? "border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.9)] dark:border-white/10 dark:bg-white/[0.06]"
          : isLight
            ? "border-black/8 bg-white/90"
            : "border-white/10 bg-white/[0.04]"
      }`}
      aria-hidden="true"
    />
  );
}

const ICON_BUTTON_CLASS =
  "relative h-10 w-10 rounded-full border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white";

export default function HeaderActions({
  onWalletClick,
  onAdultToggleClick,
  onLoginClick,
  onMenuClick,
  isAdultMode,
  legalAge,
  variant = "default",
}) {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const { paidPts, bonusPts } = useWalletStore();
  const { unreadCount } = useNotificationsStore();
  const walletTotal = paidPts + bonusPts;
  const showWallet = hydrated && isSignedIn;
  const isHome = variant === "home";
  const isLight =
    variant === "light" || variant === "home" || variant === "default";
  const iconButtonClass = isHome
    ? "relative h-10 w-10 rounded-full border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.92)] text-[color:var(--gush-ink-soft)] shadow-[0_8px_18px_rgba(15,23,42,0.04)] hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-[color:var(--gush-ink-strong)] dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200 dark:shadow-[0_14px_30px_rgba(0,0,0,0.22)] dark:hover:border-white/18 dark:hover:bg-white/[0.1] dark:hover:text-white"
    : isLight
      ? "relative h-10 w-10 rounded-full border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.9)] text-[color:var(--gush-ink-soft)] shadow-[0_8px_18px_rgba(15,23,42,0.04)] hover:border-[color:var(--gush-border-strong)] hover:bg-[rgba(255,255,255,0.96)] hover:text-[color:var(--gush-ink-strong)] dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200 dark:shadow-[0_14px_30px_rgba(0,0,0,0.22)] dark:hover:border-white/18 dark:hover:bg-white/[0.1] dark:hover:text-white"
      : ICON_BUTTON_CLASS;

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
      {showWallet ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onWalletClick}
          className={`hidden h-10 rounded-full px-4 lg:inline-flex ${
            isHome
              ? "border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.92)] text-[color:var(--gush-ink-strong)] hover:border-[color:var(--gush-border-strong)] hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:border-white/18 dark:hover:bg-white/[0.1]"
              : isLight
                ? "border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.92)] text-[color:var(--gush-ink-strong)] hover:border-[color:var(--gush-border-strong)] hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:border-white/18 dark:hover:bg-white/[0.1]"
                : "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]"
          }`}
          aria-label={`View your wallet${walletTotal > 0 ? ` with ${walletTotal.toLocaleString()} points` : ""}`}
        >
          <Wallet className="size-4" strokeWidth={2} />
          <span className="text-sm font-semibold">Wallet</span>
          <span
            className={`text-xs tabular-nums ${isHome ? "text-[color:var(--gush-ink-faint)] dark:text-neutral-400" : isLight ? "text-slate-500 dark:text-neutral-400" : "text-neutral-400"}`}
          >
            {walletTotal.toLocaleString()}
          </span>
        </Button>
      ) : null}

      {hydrated && isSignedIn ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => router.push("/notifications")}
          className={cn(iconButtonClass, "hidden sm:inline-flex")}
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
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onAdultToggleClick}
        className={cn(
          "h-10 min-w-[4.5rem] rounded-full px-3 text-xs font-semibold sm:min-w-[5.5rem] sm:px-3.5",
          isHome
            ? isAdultMode
              ? "border-red-300/30 bg-red-500/[0.08] text-red-600 hover:border-red-400/40 hover:bg-red-500/[0.12] dark:border-red-300/35 dark:bg-red-500/[0.14] dark:text-red-200 dark:hover:border-red-300/45 dark:hover:bg-red-500/[0.2]"
              : "border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.9)] text-[color:var(--gush-ink-soft)] shadow-[0_8px_18px_rgba(15,23,42,0.04)] hover:border-[color:var(--gush-border-strong)] hover:bg-[rgba(134,98,69,0.05)] hover:text-[color:var(--gush-ink-strong)] dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200 dark:hover:border-red-300/35 dark:hover:bg-red-500/[0.12] dark:hover:text-white"
            : isLight
              ? isAdultMode
                ? "border-red-300/30 bg-red-500/[0.08] text-red-600 hover:border-red-400/40 hover:bg-red-500/[0.12] dark:border-red-300/35 dark:bg-red-500/[0.14] dark:text-red-200 dark:hover:border-red-300/45 dark:hover:bg-red-500/[0.2]"
                : "border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.9)] text-[color:var(--gush-ink-soft)] shadow-[0_8px_18px_rgba(15,23,42,0.04)] hover:border-[color:var(--gush-border-strong)] hover:bg-[rgba(134,98,69,0.05)] hover:text-[color:var(--gush-ink-strong)] dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200 dark:hover:border-red-300/35 dark:hover:bg-red-500/[0.12] dark:hover:text-white"
              : isAdultMode
                ? "border-red-400/30 bg-red-500/[0.12] text-red-200 hover:border-red-300/45 hover:bg-red-500/[0.18]"
                : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-red-400/30 hover:bg-red-500/[0.08] hover:text-white",
        )}
        aria-label={`Switch ${isAdultMode ? "to standard mode" : `to ${legalAge}+ mode`}`}
        aria-pressed={isAdultMode}
        title={`Switch between standard mode and ${legalAge}+ mode. Current: ${isAdultMode ? `${legalAge}+ on` : "standard"}`}
        data-testid="adult-toggle-button"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-2 w-2 rounded-full shadow-[0_0_0_4px_rgba(134,98,69,0.08)]",
              isAdultMode
                ? "bg-current opacity-90 shadow-[0_0_0_4px_rgba(239,68,68,0.14)]"
                : isHome
                  ? "bg-[color:var(--gush-ink-faint)] dark:bg-neutral-500"
                  : isLight
                    ? "bg-slate-400 dark:bg-neutral-500"
                    : "bg-neutral-500",
            )}
          />
          <span>{legalAge}+</span>
        </span>
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.16em]",
            isAdultMode ? "opacity-85" : "opacity-55",
          )}
        >
          {isAdultMode ? "On" : "Off"}
        </span>
      </Button>

      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onMenuClick}
        className={cn(iconButtonClass, "sm:hidden")}
        aria-label={
          hydrated && isSignedIn
            ? "Open menu and account options"
            : "Open main menu"
        }
        title="Open menu"
      >
        <Menu className="size-4" />
      </Button>

      {!hydrated ? (
        <AuthSkeleton variant={variant} />
      ) : isSignedIn ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/account")}
            className={`hidden h-10 rounded-full px-4 text-sm font-semibold sm:inline-flex ${
              isHome
                ? "border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.92)] text-[color:var(--gush-ink-strong)] hover:border-[color:var(--gush-border-strong)] hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:border-white/18 dark:hover:bg-white/[0.1]"
                : isLight
                  ? "border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.92)] text-[color:var(--gush-ink-strong)] hover:border-[color:var(--gush-border-strong)] hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:border-white/18 dark:hover:bg-white/[0.1]"
                  : "border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.08]"
            }`}
          >
            <User className="size-4" />
            Account
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={onLoginClick}
          className={`hidden h-10 rounded-full px-5 text-sm font-semibold sm:inline-flex ${
            isHome
              ? "bg-[var(--gush-ink-strong)] text-white shadow-[var(--gush-shadow-button)] hover:bg-[#241d18] dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200"
              : isLight
                ? "bg-[var(--gush-ink-strong)] text-white shadow-[var(--gush-shadow-button)] hover:bg-[#241d18] dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200"
                : "bg-white text-neutral-950 hover:bg-neutral-200"
          }`}
        >
          Sign In
        </Button>
      )}
    </div>
  );
}
