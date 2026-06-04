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
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";

const PUBLIC_MENU_LINKS = [
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Interactive", href: "/interactive" },
  { label: "Search", href: "/search" },
]
  .concat(
    siteConfig.navigation.showRankingsInNav
      ? [{ label: "Rankings", href: "/rankings" }]
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
  showInteractiveNav = true,
}) {
  void variant;
  const pathname = usePathname();
  const { hydrated, isSignedIn } = useAuthStore();
  const { unreadCount } = useNotificationsStore();
  const { paidPts, bonusPts } = useWalletStore();
  const walletTotal = Number(paidPts || 0) + Number(bonusPts || 0);
  const menuLinks = PUBLIC_MENU_LINKS.filter(
    (item) => item.label !== "Interactive" || showInteractiveNav,
  );
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
        unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : "",
    },
  ];

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(6,7,16,0.8)] backdrop-blur-xl md:hidden"
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 top-0 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative mx-auto max-w-[30rem] overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,17,31,0.98)_0%,rgba(10,10,19,0.96)_100%)] text-white shadow-[0_30px_80px_rgba(5,5,15,0.46)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,92,163,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(92,228,255,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[31px] border border-white/6" />
          <div className="relative border-b border-white/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`${storefrontBadgeClass} text-white/62`}>
                  Gush
                </p>
                <h2 className="mt-3 font-display text-[2rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
                  Menu
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`${storefrontSecondaryButtonClass} h-11 w-11 px-0 text-white`}
                aria-label="Close menu"
              >
                <ChevronRight className="size-5 rotate-45" />
              </button>
            </div>
          </div>

          <div className={`relative m-4 ${storefrontInfoCardClass} rounded-[26px] p-4`}>
            {hydrated && isSignedIn ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/54">
                      Account
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-white">
                      Signed in
                    </p>
                  </div>
                  {siteConfig.monetization.pointPacksEnabled ? (
                    <span className="rounded-full border border-[rgba(255,214,130,0.22)] bg-[linear-gradient(135deg,#f7c35b_0%,#ffd97f_100%)] px-3 py-1 text-xs font-semibold tracking-[0.04em] text-[#25170a] shadow-[0_14px_28px_rgba(247,195,91,0.22)]">
                      {walletTotal.toLocaleString()} pts
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {accountLinks.map((item) => {
                    const Icon = item.icon;
                    return renderMenuLink(
                      item,
                      `flex min-h-12 items-center justify-between gap-3 rounded-[22px] px-4 py-3 text-sm font-semibold tracking-[0.01em] ${storefrontInfoCardClass} transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-300/26 hover:bg-[rgba(255,255,255,0.075)]`,
                      <>
                        <span className="flex items-center gap-3">
                          <span className={`${storefrontBadgeClass} h-9 w-9 justify-center px-0 py-0 text-white/90`}>
                            <Icon aria-hidden="true" className="size-4" />
                          </span>
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-full border border-[rgba(255,120,164,0.24)] bg-[linear-gradient(135deg,#ff4f9a_0%,#ff7ab1_100%)] px-2 py-0.5 text-[10px] font-semibold text-white shadow-[0_10px_22px_rgba(255,79,154,0.22)]">
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/54">
                  Account
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-white">
                  Sign in
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLogin?.();
                    }}
                    className={`inline-flex min-h-11 flex-1 px-4 py-3 ${storefrontPrimaryButtonClass}`}
                  >
                    Sign In
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="relative m-4 mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/54">
              Sections
            </p>
            <div className="mt-3 grid gap-2">
              {menuLinks.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return renderMenuLink(
                  item,
                  cn(
                    "flex min-h-12 items-center justify-between gap-3 rounded-[22px] border px-4 py-3 text-sm font-semibold tracking-[0.01em] shadow-[0_14px_30px_rgba(8,6,20,0.2)] transition-all duration-150 hover:-translate-y-0.5",
                    isActive
                      ? "border-[rgba(255,120,164,0.28)] bg-[linear-gradient(135deg,rgba(255,79,154,0.28)_0%,rgba(119,68,255,0.18)_100%)] text-white"
                      : `${storefrontInfoCardClass} text-white hover:border-[#ffd77a]/26 hover:bg-[rgba(255,255,255,0.075)]`,
                  ),
                  <>
                    <span className="flex items-center gap-3">
                      {Icon ? (
                        <span className={`${storefrontBadgeClass} h-9 w-9 justify-center px-0 py-0 text-white/90`}>
                          <Icon aria-hidden="true" className="size-4" />
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
