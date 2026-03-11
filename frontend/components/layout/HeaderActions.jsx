"use client";

import { Bell, User } from "lucide-react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../common/ThemeToggle";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";

function AuthSkeleton() {
  return (
    <>
      <div
        className="hidden h-11 w-24 animate-pulse rounded-full border border-white/5 bg-white/5 sm:block"
        aria-hidden="true"
      />
      <div
        className="h-11 w-11 animate-pulse rounded-full border border-white/5 bg-white/5 sm:hidden"
        aria-hidden="true"
      />
    </>
  );
}

export default function HeaderActions({
  onWalletClick,
  onAdultToggleClick,
  onLoginClick,
  isAdultMode,
}) {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const { paidPts, bonusPts } = useWalletStore();
  const { unreadCount } = useNotificationsStore();

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={onWalletClick}
        className="group relative hidden min-h-[44px] items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:shadow-ios-glow active:scale-95 sm:flex touch-manipulation"
        aria-label="Wallet"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <svg
          className="h-4 w-4 text-emerald-400 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs font-bold text-emerald-400 tabular-nums">
          {(paidPts + bonusPts).toLocaleString()}
        </span>
      </button>

      <button
        type="button"
        onClick={() => router.push("/notifications")}
        className="group relative min-h-[44px] min-w-[44px] rounded-full border border-white/10 bg-white/5 p-2.5 text-neutral-300 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white hover:shadow-ios active:scale-95 touch-manipulation"
        aria-label="Notifications"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Bell
          size={18}
          className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
        />
        {unreadCount > 0 ? (
          <>
            <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-red-500/50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        ) : null}
      </button>

      <div className="flex">
        <ThemeToggle />
      </div>

      <button
        type="button"
        onClick={onAdultToggleClick}
        className={`flex min-h-[44px] items-center gap-1 rounded-full border px-3 py-2.5 text-[11px] font-bold backdrop-blur-xl transition-all duration-300 touch-manipulation hover:scale-105 active:scale-95 sm:gap-2 sm:px-5 sm:text-xs ${
          isAdultMode
            ? "border-red-500/40 bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-300 shadow-lg shadow-red-500/30"
            : "border-white/10 bg-white/5 text-neutral-300 hover:border-red-500/30 hover:bg-red-500/10"
        }`}
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-label="Adult content"
        aria-pressed={isAdultMode}
        title={`Adult content ${isAdultMode ? "on" : "off"}`}
        data-testid="adult-toggle-button"
      >
        <span className={`transition-transform duration-300 ${isAdultMode ? "scale-110" : ""}`}>
          18+
        </span>
        <span
          className={`hidden text-[10px] font-bold sm:inline ${
            isAdultMode ? "text-red-400" : "text-neutral-500"
          }`}
        >
          {isAdultMode ? "ON" : "OFF"}
        </span>
      </button>

      {!hydrated ? (
        <AuthSkeleton />
      ) : isSignedIn ? (
        <button
          type="button"
          onClick={() => router.push("/account")}
          className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:shadow-ios-glow active:scale-95"
          aria-label="Profile"
          title="Open Account"
        >
          <User
            size={20}
            className="text-emerald-400 transition-transform duration-300 group-hover:scale-110"
          />
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onLoginClick}
            className="hidden rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-neutral-200 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white hover:shadow-ios active:scale-95 sm:inline-flex"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onLoginClick}
            className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:border-emerald-500/30 hover:bg-emerald-500/10 active:scale-95 sm:hidden"
            aria-label="Sign in"
            title="Sign in"
          >
            <User
              size={18}
              className="text-neutral-200 transition-transform duration-300 group-hover:scale-110"
            />
          </button>
        </>
      )}
    </div>
  );
}
