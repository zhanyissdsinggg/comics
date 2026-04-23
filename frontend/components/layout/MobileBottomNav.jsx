"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bookmark, House, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
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
    id: "library",
    label: "Library",
    href: "/library",
    icon: Bookmark,
    isActive: (pathname) => pathname.startsWith("/library"),
  },
  {
    id: "search",
    label: "Search",
    href: "/search",
    icon: Search,
    isActive: (pathname) => pathname.startsWith("/search"),
  },
  {
    id: "account",
    label: "Account",
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
      className="fixed inset-x-0 bottom-0 z-50 border-t-[3px] border-[#ffe500] bg-black shadow-[0_-6px_0_0_rgba(255,229,0,1)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-[1320px] grid-cols-4 gap-1.5 px-2 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] pt-2.5">
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
                "relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[1.35rem] px-2 py-2 text-center transition-all duration-200",
                isActive
                  ? "border-[2px] border-black bg-[#ffe500] text-black shadow-[3px_3px_0_0_rgba(255,255,255,0.18)]"
                  : "text-white/50 hover:bg-white/10 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "absolute left-1/2 top-1.5 h-[3px] w-7 -translate-x-1/2 rounded-full transition-all duration-200",
                  isActive ? "bg-[#ff007a] opacity-100" : "bg-transparent",
                )}
              />
              <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.95} />
              <span
                className={cn(
                  "text-[11px] leading-none",
                  isActive ? "font-black uppercase tracking-[0.05em]" : "font-semibold uppercase tracking-[0.04em]",
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
