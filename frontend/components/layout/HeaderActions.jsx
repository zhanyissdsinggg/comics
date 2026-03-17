"use client";

import { Bell, Coins, User } from "lucide-react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../common/ThemeToggle";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function AuthSkeleton() {
  return (
    <>
      <div
        className="hidden h-10 w-24 animate-pulse rounded-full border border-white/10 bg-white/[0.04] sm:block"
        aria-hidden="true"
      />
      <div
        className="h-10 w-10 animate-pulse rounded-full border border-white/10 bg-white/[0.04] sm:hidden"
        aria-hidden="true"
      />
    </>
  );
}

const ICON_BUTTON_CLASS =
  "relative h-10 w-10 rounded-full border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white";

export default function HeaderActions({
  onWalletClick,
  onAdultToggleClick,
  onLoginClick,
  isAdultMode,
  legalAge,
}) {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const { paidPts, bonusPts } = useWalletStore();
  const { unreadCount } = useNotificationsStore();
  const walletTotal = paidPts + bonusPts;
  const showWallet = hydrated && isSignedIn;

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {showWallet ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onWalletClick}
          className="hidden h-10 rounded-full border-white/10 bg-white/[0.04] px-4 text-neutral-100 hover:border-white/20 hover:bg-white/[0.08] lg:inline-flex"
          aria-label="Wallet"
        >
          <Coins className="size-4" />
          <span className="text-sm font-semibold">Wallet</span>
          <span className="text-xs tabular-nums text-neutral-400">{walletTotal.toLocaleString()}</span>
        </Button>
      ) : null}

      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => router.push("/notifications")}
        className={ICON_BUTTON_CLASS}
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_10px_24px_rgba(239,68,68,0.35)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      <ThemeToggle />

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onAdultToggleClick}
        className={cn(
          "h-10 rounded-full px-3 text-xs font-semibold sm:px-3.5",
          isAdultMode
            ? "border-red-400/30 bg-red-500/[0.12] text-red-200 hover:border-red-300/45 hover:bg-red-500/[0.18]"
            : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-red-400/30 hover:bg-red-500/[0.08] hover:text-white",
        )}
        aria-label="Adult content"
        aria-pressed={isAdultMode}
        title={`Adult content ${legalAge}+ ${isAdultMode ? "on" : "off"}`}
        data-testid="adult-toggle-button"
      >
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.12em]",
            isAdultMode
              ? "border-red-300/30 bg-red-400/10 text-red-100"
              : "border-white/10 bg-white/[0.04] text-neutral-200",
          )}
        >
          {legalAge}+
        </span>
        <span className="hidden md:inline">{isAdultMode ? "18+ on" : "18+"}</span>
      </Button>

      {!hydrated ? (
        <AuthSkeleton />
      ) : isSignedIn ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/account")}
            className="hidden h-10 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08] sm:inline-flex"
          >
            <User className="size-4" />
            Account
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => router.push("/account")}
            className="h-10 w-10 rounded-full border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08] sm:hidden"
            aria-label="Profile"
            title="Open account"
          >
            <User className="size-4" />
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={onLoginClick}
            className="hidden h-10 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 sm:inline-flex"
          >
            Sign in
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onLoginClick}
            className={cn(ICON_BUTTON_CLASS, "sm:hidden")}
            aria-label="Sign in"
            title="Sign in"
          >
            <User className="size-4" />
          </Button>
        </>
      )}
    </div>
  );
}
