"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Crown,
  Library,
  ShoppingBag,
  User,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useWalletStore } from "../../store/useWalletStore";
import { cn } from "@/lib/utils";

const MENU_LINKS = [
  { label: "Library", href: "/library", icon: Library },
  { label: "Store", href: "/store", icon: ShoppingBag },
  { label: "Membership", href: "/subscribe", icon: Crown },
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Creators", href: "/creators" },
  { label: "Top Series", href: "/rankings" },
];

function isActivePath(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function HeaderMenuModal({
  open,
  onClose,
  onOpenLogin,
}) {
  const pathname = usePathname();
  const { hydrated, isSignedIn } = useAuthStore();
  const { unreadCount } = useNotificationsStore();
  const { paidPts, bonusPts } = useWalletStore();
  const walletTotal = Number(paidPts || 0) + Number(bonusPts || 0);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(15,23,42,0.22)] backdrop-blur-sm md:hidden"
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 top-0 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto max-w-[30rem] rounded-[28px] border border-black/8 bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Menu
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Browse without the header taking over.
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white text-slate-600 transition hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)] hover:text-slate-950"
              aria-label="Close menu"
            >
              <ChevronRight className="size-5 rotate-45" />
            </button>
          </div>

          <div className="mt-5 rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            {hydrated && isSignedIn ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Account
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      Signed in and ready to pick up fast.
                    </p>
                  </div>
                  <span className="rounded-full border border-[rgba(49,87,214,0.14)] bg-[rgba(49,87,214,0.08)] px-3 py-1 text-xs font-semibold text-[var(--gush-accent,#3157d6)]">
                    {walletTotal.toLocaleString()} pts
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {[
                    { label: "Account", href: "/account", icon: User },
                    { label: "Purchases", href: "/orders", icon: ShoppingBag },
                    { label: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : "" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className="flex min-h-12 items-center justify-between gap-3 rounded-[18px] border border-black/8 bg-[rgba(246,243,237,0.92)] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-black/10 hover:bg-white"
                      >
                        <span className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/6 bg-white text-slate-600">
                            <Icon className="size-4" />
                          </span>
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            {item.badge}
                          </span>
                        ) : (
                          <ChevronRight className="size-4 text-slate-400" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Account
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  Sign in once, keep library, billing, and reading progress in one place.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLogin?.();
                    }}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Sign in
                  </button>
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)]"
                  >
                    Account help
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Browse
            </p>
            <div className="mt-3 grid gap-2">
              {MENU_LINKS.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm font-semibold transition",
                      isActive
                        ? "border-[rgba(49,87,214,0.14)] bg-[rgba(49,87,214,0.08)] text-slate-950"
                        : "border-black/8 bg-white text-slate-800 hover:border-black/10 hover:bg-[rgba(246,243,237,0.92)]",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {Icon ? (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/6 bg-[rgba(246,243,237,0.92)] text-slate-600">
                          <Icon className="size-4" />
                        </span>
                      ) : null}
                      {item.label}
                    </span>
                    <ChevronRight className="size-4 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
