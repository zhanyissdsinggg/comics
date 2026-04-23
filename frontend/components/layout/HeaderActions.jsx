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
      className="hidden h-11 w-24 animate-pulse border-[3px] border-black bg-white sm:block"
      aria-hidden="true"
    />
  );
}

const ICON_BUTTON_CLASS =
  "relative h-11 w-11 border-[3px] border-[#ffe500] bg-black text-white shadow-[4px_4px_0_0_rgba(255,0,122,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ff007a] hover:shadow-none hover:text-white";

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
          className="hidden h-11 border-[3px] border-black bg-[#00e5ff] px-4 text-black shadow-[4px_4px_0_0_rgba(255,229,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#00d0e8] hover:shadow-none lg:inline-flex"
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
          "h-11 min-w-[4.75rem] border-[3px] border-black px-3 text-xs font-black uppercase tracking-[0.05em] shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none sm:min-w-[5.75rem] sm:px-3.5",
          isAdultMode
            ? "bg-[#ff007a] text-white"
            : "bg-white text-black/70 hover:bg-[#ffe500] hover:text-black",
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
                ? "bg-current opacity-90 shadow-[0_0_0_4px_rgba(239,68,68,0.14)]"
                : "bg-slate-400",
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
          className="hidden h-11 border-[3px] border-[#ffe500] bg-black px-4 text-sm font-black uppercase tracking-[0.05em] text-white shadow-[4px_4px_0_0_rgba(255,0,122,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ff007a] hover:shadow-none sm:inline-flex"
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
          className="hidden h-11 border-[3px] border-black bg-[#00e5ff] px-5 text-sm font-black uppercase tracking-[0.05em] text-black shadow-[4px_4px_0_0_rgba(255,229,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#00d0e8] hover:shadow-none sm:inline-flex"
        >
          Sign In
        </Button>
      )}
    </div>
  );
}
