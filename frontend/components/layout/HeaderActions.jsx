"use client";

import { Bell, Coins, Sparkles, User } from "lucide-react";
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

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onWalletClick}
        className="hidden h-10 rounded-full border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(16,185,129,0.08))] px-4 text-emerald-200 hover:border-emerald-300/40 hover:bg-emerald-400/[0.12] sm:inline-flex"
        aria-label="Points store"
      >
        <Coins className="size-4" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/80">Pts</span>
        <span className="text-xs font-semibold tabular-nums">{walletTotal.toLocaleString()}</span>
      </Button>

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
          "h-10 rounded-full px-3 text-xs font-semibold sm:px-4",
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
        <span className="hidden sm:inline">{isAdultMode ? "Mature on" : "Mature"}</span>
      </Button>

      {!hydrated ? (
        <AuthSkeleton />
      ) : isSignedIn ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => router.push("/account")}
          className="h-10 w-10 rounded-full border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200 hover:border-emerald-300/40 hover:bg-emerald-400/[0.12]"
          aria-label="Profile"
          title="Open account"
        >
          <User className="size-4" />
        </Button>
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={onLoginClick}
            className="hidden h-10 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 sm:inline-flex"
          >
            <Sparkles className="size-4" />
            Sign in free
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
