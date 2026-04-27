"use client";

import { Bell, Menu, User, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function AuthSkeleton({ variant = "default" }) {
  return (
    <div
      className="hidden h-11 w-24 animate-pulse rounded-full border border-black/10 bg-black/[0.04] sm:block"
      aria-hidden="true"
    />
  );
}

const ICON_BUTTON_CLASS =
  "relative h-11 w-11 rounded-full border border-black/10 bg-white/70 text-black/70 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-white hover:text-black hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)] active:translate-y-px";

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
  const iconButtonClass = ICON_BUTTON_CLASS;

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
      {showWallet ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onWalletClick}
          className="hidden h-11 rounded-full border border-black/10 bg-white/70 px-4 text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)] active:translate-y-px lg:inline-flex"
          aria-label={`View your wallet${walletTotal > 0 ? ` with ${walletTotal.toLocaleString()} points` : ""}`}
        >
          <Wallet className="size-4" strokeWidth={2} />
          <span className="text-sm font-black uppercase tracking-[0.05em]">Wallet</span>
          <span className="text-xs font-bold tabular-nums text-black/60">
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
          "h-11 min-w-[4.75rem] rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.08em] transition-[background-color,border-color,box-shadow,transform,color] duration-200 active:translate-y-px sm:min-w-[5.75rem] sm:px-3.5",
          isAdultMode
            ? "border-[#FF007A] bg-[#FF007A] text-white"
            : "border-black/10 bg-white/70 text-black/70 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:border-black/16 hover:bg-white hover:text-black hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)]",
        )}
        aria-label={`Switch ${isAdultMode ? "to standard mode" : `to ${legalAge}+ mode`}`}
        aria-pressed={isAdultMode}
        title={`Switch between standard mode and ${legalAge}+ mode. Current: ${isAdultMode ? `${legalAge}+ on` : "standard"}`}
        data-testid="adult-toggle-button"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-2 w-2 rounded-full shadow-[0_0_0_4px_rgba(15,23,42,0.06)]",
              isAdultMode
                ? "bg-white opacity-90 shadow-[0_0_0_4px_rgba(255,0,122,0.22)]"
                : "bg-black/30 shadow-[0_0_0_4px_rgba(15,23,42,0.06)]",
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
          className="hidden h-11 rounded-full border border-black/10 bg-white/70 px-4 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)] active:translate-y-px sm:inline-flex"
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
          className="hidden h-11 rounded-full border border-black bg-black px-5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-black/90 active:translate-y-px sm:inline-flex"
        >
          Sign In
        </Button>
      )}
    </div>
  );
}
