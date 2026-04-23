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
      className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[6px] md:hidden"
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 top-0 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto max-w-[30rem] rounded-[28px] border-[3px] border-black bg-[#fffdf7] p-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
                Menu
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-black">
                Quick links.
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-black bg-white text-black transition hover:bg-[#ffe500]"
              aria-label="Close menu"
            >
              <ChevronRight className="size-5 rotate-45" />
            </button>
          </div>

          <div className="mt-5 rounded-[24px] border-[3px] border-black bg-white p-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
            {hydrated && isSignedIn ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                      Account
                    </p>
                    <p className="mt-2 text-lg font-black uppercase tracking-[0.03em] text-black">
                      {isHome
                        ? "Signed in and ready to keep reading."
                        : "Signed in and ready to pick up fast."}
                    </p>
                  </div>
                  <span className="rounded-full border-[2px] border-black bg-[#ffe500] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-black">
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
                      "flex min-h-12 items-center justify-between gap-3 rounded-[18px] border-[3px] border-black bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.04em] text-black transition hover:-translate-y-0.5 hover:bg-[#fffdf7]",
                      <>
                        <span className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-[2px] border-black bg-[#eefcff] text-black">
                            <Icon className="size-4" />
                          </span>
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-full border-[2px] border-black bg-[#ff007a] px-2 py-0.5 text-[10px] font-black text-white">
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
                  {isHome
                    ? "Sign in to keep your library and progress together."
                    : "Sign in to keep your library and progress in one place."}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLogin?.();
                    }}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border-[3px] border-black bg-[#ff007a] px-4 py-3 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  >
                    Sign In
                  </button>
                  {renderMenuLink(
                    { label: "Get Help", href: "/support" },
                    "inline-flex min-h-11 flex-1 items-center justify-center rounded-full border-[3px] border-black bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.06em] text-black transition hover:-translate-y-0.5 hover:bg-[#eefcff]",
                    "Get Help",
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
              Browse
            </p>
            <div className="mt-3 grid gap-2">
              {menuLinks.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return renderMenuLink(
                  item,
                  cn(
                    "flex min-h-12 items-center justify-between gap-3 rounded-[18px] border-[3px] px-4 py-3 text-sm font-bold uppercase tracking-[0.04em] transition",
                    isActive
                      ? "border-black bg-[#ffe500] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                      : "border-black bg-white text-black/75 hover:-translate-y-0.5 hover:bg-[#fffdf7]",
                  ),
                  <>
                    <span className="flex items-center gap-3">
                      {Icon ? (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-[2px] border-black bg-[#eefcff] text-black">
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
