"use client";

import { Bell, Menu, User, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import ThemeToggle from "../common/ThemeToggle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function AuthSkeleton({ variant = "default" }) {
  const isHome = variant === "home";
  const isLight = variant === "light";
  return (
    <div
      className={`hidden h-10 w-24 animate-pulse rounded-full border sm:block ${
        isHome ? "border-white/10 bg-white/[0.05]" : isLight ? "border-black/8 bg-white/90" : "border-white/10 bg-white/[0.04]"
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
  const isLight = variant === "light";
  const iconButtonClass = isHome
    ? "relative h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-white/74 shadow-[0_12px_28px_rgba(0,0,0,0.18)] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
    : isLight
      ? "relative h-10 w-10 rounded-full border border-black/8 bg-white text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)] hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)] hover:text-slate-900"
    : ICON_BUTTON_CLASS;

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
      <ThemeToggle variant={isLight ? "light" : "default"} />

      {showWallet ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onWalletClick}
          className={`hidden h-10 rounded-full px-4 lg:inline-flex ${
            isHome
              ? "border-white/10 bg-white/[0.04] text-white hover:border-white/18 hover:bg-white/[0.08]"
              : isLight
                ? "border-black/8 bg-white text-slate-800 hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)]"
              : "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]"
          }`}
          aria-label={`View your wallet${walletTotal > 0 ? ` with ${walletTotal.toLocaleString()} points` : ""}`}
        >
          <Wallet className="size-4" strokeWidth={2} />
          <span className="text-sm font-semibold">Wallet</span>
          <span className={`text-xs tabular-nums ${isHome ? "text-white/52" : isLight ? "text-slate-500" : "text-neutral-400"}`}>{walletTotal.toLocaleString()}</span>
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
            "h-10 min-w-[3rem] rounded-full px-3 text-xs font-semibold sm:px-3.5",
            isHome
              ? isAdultMode
                ? "border-red-400/25 bg-red-500/[0.16] text-red-100 hover:border-red-300/40 hover:bg-red-500/[0.22]"
                : "border-white/10 bg-white/[0.04] text-white/72 hover:border-red-400/30 hover:bg-red-500/[0.1] hover:text-white"
              : isLight
                ? isAdultMode
                  ? "border-red-300/30 bg-red-500/[0.08] text-red-600 hover:border-red-400/40 hover:bg-red-500/[0.12]"
                : "border-black/8 bg-white text-slate-600 hover:border-red-300/35 hover:bg-red-500/[0.05] hover:text-red-600"
              : isAdultMode
                ? "border-red-400/30 bg-red-500/[0.12] text-red-200 hover:border-red-300/45 hover:bg-red-500/[0.18]"
                : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-red-400/30 hover:bg-red-500/[0.08] hover:text-white",
        )}
        aria-label="Adult content"
        aria-pressed={isAdultMode}
        title={`Adult content ${legalAge}+ ${isAdultMode ? "on" : "off"}`}
        data-testid="adult-toggle-button"
      >
        <span>{legalAge}+</span>
      </Button>

      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onMenuClick}
        className={cn(iconButtonClass, "sm:hidden")}
        aria-label={hydrated && isSignedIn ? "Open menu and account options" : "Open main menu"}
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
              ? "border-white/10 bg-white/[0.04] text-white hover:border-white/18 hover:bg-white/[0.08]"
              : isLight
                ? "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)]"
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
              ? "bg-[var(--gush-home-accent)] text-slate-950 hover:bg-[#ffd6a0]"
              : isLight
                ? "bg-slate-950 text-white hover:bg-slate-800"
                : "bg-white text-neutral-950 hover:bg-neutral-200"
          }`}
        >
          Sign In
        </Button>
      )}
    </div>
  );
}
