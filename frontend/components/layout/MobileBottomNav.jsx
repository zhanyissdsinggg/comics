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
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom,0px))] md:hidden"
    >
      <div className="mx-auto grid max-w-[720px] grid-cols-4 gap-1 border-2 border-[#FFE500] bg-black px-1.5 py-1.5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] backdrop-blur-xl">
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
                  ? "border-2 border-black bg-[#00E5FF] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  : "border-2 border-transparent text-white/68 hover:border-white/10 hover:bg-[#111111] hover:text-white",
              )}
            >
              <span
                className={cn(
                  "absolute left-1/2 top-1.5 h-[3px] w-6 -translate-x-1/2 rounded-full transition-all duration-200",
                  isActive ? "bg-black opacity-100" : "bg-transparent opacity-0",
                )}
              />
              <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.95} />
              <span
                className={cn(
                  "text-[10px] leading-none",
                  isActive ? "font-semibold uppercase tracking-[0.08em]" : "font-medium uppercase tracking-[0.06em]",
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
