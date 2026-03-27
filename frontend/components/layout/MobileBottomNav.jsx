"use client";

import Link from "next/link";
import { useEffect } from "react";
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

  useEffect(() => {
    document.body.classList.add("has-mobile-bottom-nav");
    return () => document.body.classList.remove("has-mobile-bottom-nav");
  }, []);

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black/8 bg-[rgba(250,247,241,0.82)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-[1320px] grid-cols-4 gap-1 px-2 pb-[calc(0.55rem+env(safe-area-inset-bottom,0px))] pt-2">
        {TAB_ITEMS.map((item) => {
          const isActive = item.isActive(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center transition-all duration-200",
                isActive
                  ? "bg-[rgba(67,56,202,0.08)] text-indigo-700"
                  : "text-slate-400 hover:bg-white/60 hover:text-slate-700",
              )}
            >
              <Icon className="size-5" strokeWidth={2} />
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
