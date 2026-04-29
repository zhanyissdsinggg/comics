"use client";

import { Bell, Menu, User, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { cn } from "@/lib/utils";

function AuthSkeleton({ variant = "default" }) {
  return (
    <div
      className="hidden h-11 w-24 animate-pulse border-2 border-white/20 bg-black sm:block"
      aria-hidden="true"
    />
  );
}

const ICON_BUTTON_CLASS =
  "relative h-11 w-11 border-2 border-white/20 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-[#FFE500] hover:bg-[#111111]";

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
        <button
          type="button"
          onClick={onWalletClick}
          className="hidden h-11 border-2 border-white/20 bg-black px-4 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-[#FFE500] hover:bg-[#111111] lg:inline-flex"
          aria-label={`View your wallet${walletTotal > 0 ? ` with ${walletTotal.toLocaleString()} points` : ""}`}
        >
          <Wallet className="size-4" strokeWidth={2} />
          <span className="text-sm font-black uppercase tracking-[0.05em]">Wallet</span>
          <span className="text-xs font-bold tabular-nums text-white/70">
            {walletTotal.toLocaleString()}
          </span>
        </button>
      ) : null}

      {hydrated && isSignedIn ? (
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className={cn(iconButtonClass, "hidden items-center justify-center sm:inline-flex")}
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

      <button
        type="button"
        onClick={onAdultToggleClick}
        className={cn(
          "inline-flex h-11 min-w-[4.75rem] items-center justify-center gap-2 border-2 px-3 text-xs font-semibold uppercase tracking-[0.08em] transition-all sm:min-w-[5.75rem] sm:px-3.5",
          isAdultMode
            ? "border-[#FF007A] bg-[#FF007A] text-white"
            : "border-white/20 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-[#FFE500] hover:bg-[#111111]",
        )}
        aria-label={`Switch ${isAdultMode ? "to standard mode" : `to ${legalAge}+ mode`}`}
        aria-pressed={isAdultMode}
        title={`Switch between standard mode and ${legalAge}+ mode. Current: ${isAdultMode ? `${legalAge}+ on` : "standard"}`}
        data-testid="adult-toggle-button"
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              "inline-flex h-2 w-2 rounded-full shadow-[0_0_0_4px_rgba(15,23,42,0.06)]",
              isAdultMode
                ? "bg-white opacity-90 shadow-[0_0_0_4px_rgba(255,0,122,0.22)]"
                : "bg-[#FFE500] shadow-[0_0_0_4px_rgba(255,229,0,0.16)]",
            )}
          />
          <span className="text-white">{legalAge}+</span>
        </span>
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.16em] text-white",
            isAdultMode ? "opacity-85" : "opacity-55",
          )}
        >
          {isAdultMode ? "On" : "Off"}
        </span>
      </button>

      <button
        type="button"
        onClick={onMenuClick}
        className={cn(iconButtonClass, "inline-flex items-center justify-center sm:hidden")}
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
            className="hidden h-11 items-center gap-2 border-2 border-black bg-[#00E5FF] px-4 text-sm font-semibold tracking-[0.02em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:inline-flex"
          >
            <User className="size-4" />
            Account
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onLoginClick}
          className="hidden h-11 items-center justify-center border-2 border-black bg-[#00E5FF] px-5 text-sm font-semibold tracking-[0.02em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:inline-flex"
        >
          Sign In
        </button>
      )}
    </div>
  );
}
