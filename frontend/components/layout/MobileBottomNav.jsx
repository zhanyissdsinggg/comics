"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bookmark, House, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCOUNT_PREFIXES = ["/account", "/orders", "/notifications", "/profile", "/signin", "/login"];

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
    isActive: (pathname) => ACCOUNT_PREFIXES.some((prefix) => pathname.startsWith(prefix)),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--gush-border)] bg-[rgba(252,248,242,0.82)] shadow-[0_-10px_30px_rgba(32,25,18,0.06)] backdrop-blur-2xl dark:bg-[rgba(11,16,24,0.9)] dark:shadow-[0_-14px_36px_rgba(0,0,0,0.28)] md:hidden"
    >
      <div className="mx-auto grid max-w-[1320px] grid-cols-4 gap-1.5 px-2 pb-[calc(0.55rem+env(safe-area-inset-bottom,0px))] pt-2">
        {TAB_ITEMS.map((item) => {
          const isActive = item.isActive(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[1.35rem] px-2 py-2 text-center transition-all duration-200",
                isActive
                  ? "border border-[rgba(36,30,20,0.08)] bg-[rgba(255,255,255,0.84)] text-[color:var(--gush-ink-strong)] shadow-[0_10px_22px_rgba(32,25,18,0.06)] dark:border-white/8 dark:bg-white/[0.08] dark:text-white dark:shadow-[0_12px_28px_rgba(0,0,0,0.26)]"
                  : "text-[color:var(--gush-ink-faint)] hover:bg-white/60 hover:text-[color:var(--gush-ink)] dark:hover:bg-white/[0.05]",
              )}
            >
              <span
                className={cn(
                  "absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full transition-all duration-200",
                  isActive ? "bg-[rgba(54,87,183,0.22)] dark:bg-[rgba(137,167,255,0.45)]" : "bg-transparent",
                )}
              />
              <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.95} />
              <span className={cn("text-[11px] leading-none", isActive ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
