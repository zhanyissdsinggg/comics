"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Compass,
  House,
  Trophy,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { storefrontSecondaryButtonClass } from "../common/StorefrontPagePrimitives";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";

const ACCOUNT_PREFIXES = [
  "/account",
  "/orders",
  "/notifications",
  "/profile",
  "/signin",
  "/login",
];

const TAB_ITEMS = [
  {
    id: "home",
    label: "Home",
    href: "/",
    icon: House,
    isActive: (pathname) =>
      !pathname.startsWith("/library") &&
      !pathname.startsWith("/search") &&
      !ACCOUNT_PREFIXES.some((prefix) => pathname.startsWith(prefix)),
  },
  {
    id: "explore",
    label: "Explore",
    href: "/search",
    icon: Compass,
    isActive: (pathname) =>
      pathname.startsWith("/search") ||
      pathname.startsWith("/comics") ||
      pathname.startsWith("/novels"),
  },
  {
    id: "library",
    label: "Library",
    href: "/library",
    icon: Bookmark,
    isActive: (pathname) => pathname.startsWith("/library"),
  },
  {
    id: "rankings",
    label: "Rankings",
    href: "/rankings",
    icon: Trophy,
    isActive: (pathname) => pathname.startsWith("/rankings"),
  },
  {
    id: "me",
    label: "Me",
    href: "/account",
    icon: User,
    isActive: (pathname) =>
      ACCOUNT_PREFIXES.some((prefix) => pathname.startsWith(prefix)),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      setIsMobileViewport(false);
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = (event) => {
      setIsMobileViewport(event.matches);
    };

    syncViewport(mediaQuery);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      document.body.classList.remove("has-mobile-bottom-nav");
      return undefined;
    }

    document.body.classList.add("has-mobile-bottom-nav");
    return () => document.body.classList.remove("has-mobile-bottom-nav");
  }, [isMobileViewport]);

  if (!isMobileViewport) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile bottom navigation"
      data-mobile-bottom-nav="1"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom,0px))] md:hidden"
    >
      <div
        className={cn(
          "mx-auto grid max-w-[560px] grid-cols-5 gap-1.5 rounded-[26px] border border-white/10 bg-[rgba(20,16,27,0.96)] px-2 py-2 shadow-[0_24px_48px_rgba(0,0,0,0.38)] backdrop-blur-2xl",
        )}
      >
        {TAB_ITEMS.map((item) => {
          const isActive = item.isActive(pathname);
          const Icon = item.icon;
          const useDocumentNavigation = shouldUseDocumentNavigation(
            pathname,
            item.href,
          );
          const NavItem = useDocumentNavigation ? "a" : Link;
          const navItemProps = useDocumentNavigation
            ? {
                href: item.href,
                onClick: (event) => {
                  event.preventDefault();
                  navigateWithDocument(item.href);
                },
              }
            : { href: item.href };

          return (
            <NavItem
              key={item.id}
              {...navItemProps}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[18px] px-1.5 py-2 text-center transition-all duration-150",
                isActive
                  ? "border border-white/12 bg-[linear-gradient(180deg,rgba(255,79,154,0.18)_0%,rgba(167,139,250,0.16)_100%)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_14px_26px_rgba(0,0,0,0.24)]"
                  : `${storefrontSecondaryButtonClass} h-auto border-transparent bg-[rgba(255,255,255,0.025)] px-1.5 py-2 text-white/62 shadow-none hover:border-white/10 hover:bg-[rgba(255,255,255,0.075)] hover:text-white`,
              )}
            >
              <span
                className={cn(
                  "absolute left-1/2 top-1.5 h-[3px] w-6 -translate-x-1/2 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-[var(--gush-cyan)] opacity-100"
                    : "bg-transparent opacity-0",
                )}
              />
              <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.95} />
              <span
                className={cn(
                  "text-[11px] leading-none",
                  isActive
                    ? "font-semibold uppercase tracking-[0.1em]"
                    : "font-medium uppercase tracking-[0.08em]",
                )}
              >
                {item.label}
              </span>
            </NavItem>
          );
        })}
      </div>
    </nav>
  );
}
