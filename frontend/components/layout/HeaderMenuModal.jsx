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
import { siteConfig } from "../../lib/siteConfig";
import { cn } from "@/lib/utils";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";

const PUBLIC_MENU_LINKS = [
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Search", href: "/search" },
]
  .concat(
    siteConfig.navigation.showRankingsInNav
      ? [{ label: "Trending", href: "/rankings" }]
      : [],
  )
  .concat(
    siteConfig.navigation.showCreatorsInNav
      ? [{ label: "Creators", href: "/creators" }]
      : [],
  )
  .concat(
    siteConfig.navigation.enableMonetizationNav &&
      siteConfig.monetization.pointPacksEnabled
      ? [{ label: "Store", href: "/store", icon: ShoppingBag }]
      : [],
  )
  .concat(
    siteConfig.navigation.enableMonetizationNav &&
      siteConfig.monetization.membershipEnabled
      ? [{ label: "Plans", href: "/subscribe", icon: Crown }]
      : [],
  );

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
  const menuLinks = PUBLIC_MENU_LINKS;
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
  const accountLinks = [
    { label: "Library", href: "/library", icon: Library },
    { label: "Account", href: "/account", icon: User },
    ...(siteConfig.navigation.enableMonetizationNav &&
    siteConfig.monetization.checkoutEnabled
      ? [{ label: "Purchases", href: "/orders", icon: ShoppingBag }]
      : []),
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
  ];

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
        <div className="mx-auto max-w-[30rem] overflow-hidden rounded-[30px] border-2 border-[#FFE500] bg-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-2 border-[#FFE500] bg-black p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  Menu
                </p>
                <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.06em] text-white">
                  Menu
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-[#FFE500] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                aria-label="Close menu"
              >
                <ChevronRight className="size-5 rotate-45" />
              </button>
            </div>
          </div>

          <div className="m-4 rounded-[24px] border-2 border-white/20 bg-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {hydrated && isSignedIn ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                      Account
                    </p>
                    <p className="mt-2 text-lg font-black uppercase tracking-[0.03em] text-white">
                      Signed in
                    </p>
                  </div>
                  {siteConfig.monetization.pointPacksEnabled ? (
                    <span className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      {walletTotal.toLocaleString()} pts
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {accountLinks.map((item) => {
                    const Icon = item.icon;
                    return renderMenuLink(
                      item,
                      "flex min-h-12 items-center justify-between gap-3 rounded-[20px] border-2 border-white/20 bg-black px-4 py-3 text-sm font-black uppercase tracking-[0.02em] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:border-[#00E5FF] hover:bg-[#111111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
                      <>
                        <span className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/20 bg-black text-white">
                            <Icon className="size-4" />
                          </span>
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-full border-2 border-black bg-[#FF007A] px-2 py-0.5 text-[10px] font-semibold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            {item.badge}
                          </span>
                        ) : (
                          <ChevronRight className="size-4 text-white/60" />
                        )}
                      </>,
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                  Account
                </p>
                <p className="mt-2 text-lg font-black uppercase tracking-[0.03em] text-white">
                  Sign in
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLogin?.();
                    }}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border-2 border-black bg-[#00E5FF] px-4 py-3 text-sm font-semibold tracking-[0.02em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                  >
                    Sign In
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="m-4 mt-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
              Sections
            </p>
            <div className="mt-3 grid gap-2">
              {menuLinks.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return renderMenuLink(
                  item,
                  cn(
                    "flex min-h-12 items-center justify-between gap-3 rounded-[20px] border-2 px-4 py-3 text-sm font-semibold tracking-[0.02em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
                    isActive
                      ? "border-black bg-[#FF007A] text-white"
                      : "border-white/20 bg-black text-white hover:border-[#FFE500] hover:bg-[#111111]",
                  ),
                  <>
                    <span className="flex items-center gap-3">
                      {Icon ? (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/20 bg-black text-white">
                          <Icon className="size-4" />
                        </span>
                      ) : null}
                      {item.label}
                    </span>
                    <ChevronRight className="size-4 text-white/60" />
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
