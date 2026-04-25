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
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";

const MENU_LINKS = [
  { label: "Library", href: "/library", icon: Library },
  { label: "Store", href: "/store", icon: ShoppingBag },
  { label: "Plans", href: "/subscribe", icon: Crown },
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Creators", href: "/creators" },
  { label: "Help", href: "/support" },
];

const HOME_MENU_LINKS = [
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Creators", href: "/creators" },
  { label: "Help", href: "/support" },
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
  variant = "default",
}) {
  const pathname = usePathname();
  const { hydrated, isSignedIn } = useAuthStore();
  const { unreadCount } = useNotificationsStore();
  const { paidPts, bonusPts } = useWalletStore();
  const walletTotal = Number(paidPts || 0) + Number(bonusPts || 0);
  const isHome = variant === "home";
  const menuLinks = variant === "home" ? HOME_MENU_LINKS : MENU_LINKS;
  const renderMenuLink = (item, className, content) => {
    const useDocumentNavigation = shouldUseDocumentNavigation(
      pathname,
      item.href,
    );
    if (useDocumentNavigation) {
      return (
        <a
          key={item.href}
          href={item.href}
          onClick={(event) => {
            event.preventDefault();
            onClose?.();
            navigateWithDocument(item.href);
          }}
          className={className}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={className}
      >
        {content}
      </Link>
    );
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/82 backdrop-blur-[6px] md:hidden"
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 top-0 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto max-w-[30rem] overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
          <div className="border-b border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex rounded-full border border-black/10 bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                Menu
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.06em] text-black">
                Menu
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-black/16 hover:bg-black/[0.03] hover:text-black"
              aria-label="Close menu"
            >
              <ChevronRight className="size-5 rotate-45" />
            </button>
          </div>
          </div>

          <div className="m-4 rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fff8eb_100%)] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
            {hydrated && isSignedIn ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                      Account
                    </p>
                    <p className="mt-2 text-lg font-black uppercase tracking-[0.03em] text-black">
                      Signed in
                    </p>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-black/72">
                    {walletTotal.toLocaleString()} pts
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {[
                    { label: "Account", href: "/account", icon: User },
                    { label: "Purchases", href: "/orders", icon: ShoppingBag },
                    {
                      label: "Notifications",
                      href: "/notifications",
                      icon: Bell,
                      badge:
                        unreadCount > 0
                          ? unreadCount > 99
                            ? "99+"
                            : String(unreadCount)
                          : "",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return renderMenuLink(
                      item,
                      "flex min-h-12 items-center justify-between gap-3 rounded-[20px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:border-black/16 hover:bg-black/[0.02]",
                      <>
                        <span className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-[#f8fafc] text-black">
                            <Icon className="size-4" />
                          </span>
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-full border border-rose-200/80 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                            {item.badge}
                          </span>
                        ) : (
                          <ChevronRight className="size-4 text-black/45" />
                        )}
                      </>,
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                  Account
                </p>
                <p className="mt-2 text-lg font-black uppercase tracking-[0.03em] text-black">
                  Sign in
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLogin?.();
                    }}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-black bg-black px-4 py-3 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-black/90"
                  >
                    Sign In
                  </button>
                  {renderMenuLink(
                    { label: "Help", href: "/support" },
                    "inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-black/12 bg-white px-4 py-3 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-black/16 hover:bg-black/[0.03]",
                    "Help",
                  )}
                </div>
              </>
            )}
          </div>

          <div className="m-4 mt-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
              Sections
            </p>
            <div className="mt-3 grid gap-2">
              {menuLinks.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return renderMenuLink(
                  item,
                  cn(
                    "flex min-h-12 items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-sm font-semibold tracking-[0.02em] transition",
                    isActive
                      ? "border-black bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
                      : "border-black/10 bg-white text-black/75 shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:border-black/16 hover:bg-black/[0.02]",
                  ),
                  <>
                    <span className="flex items-center gap-3">
                      {Icon ? (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-[#f8fafc] text-black">
                          <Icon className="size-4" />
                        </span>
                      ) : null}
                      {item.label}
                    </span>
                    <ChevronRight className="size-4 text-black/45" />
                  </>,
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
