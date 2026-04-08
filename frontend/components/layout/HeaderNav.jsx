"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHomeStore } from "../../store/useHomeStore";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";

const DEFAULT_NAV_ITEMS = [
  { id: "home", label: "Home", href: "/" },
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "creators", label: "Creators", href: "/creators" },
  { id: "help", label: "Support", href: "/support" },
];

const HOME_NAV_ITEMS = [
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "creators", label: "Creators", href: "/creators" },
  { id: "help", label: "Support", href: "/support" },
];

export default function HeaderNav({ variant = "default" }) {
  const pathname = usePathname();
  const { setHomeTab } = useHomeStore();
  const isHome = variant === "home";
  const isLight = variant === "light";
  const navItems = variant === "home" ? HOME_NAV_ITEMS : DEFAULT_NAV_ITEMS;

  return (
    <nav className="hidden flex-1 justify-center md:flex">
      <div
        className={`inline-flex items-center gap-1 rounded-full p-1 ${
          isHome
            ? "border border-white/10 bg-white/[0.04] shadow-[0_18px_34px_rgba(0,0,0,0.12)] backdrop-blur-md"
            : isLight
              ? "border border-black/6 bg-white/55 shadow-[0_8px_18px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_34px_rgba(0,0,0,0.2)]"
              : "border border-white/8 bg-white/[0.04]"
        }`}
      >
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const useDocumentNavigation = shouldUseDocumentNavigation(pathname, item.href);
          const NavItem = useDocumentNavigation ? "a" : Link;
          const navItemProps = useDocumentNavigation
            ? {
                href: item.href,
                onClick: (event) => {
                  if (item.id === "home") {
                    setHomeTab("home");
                  }
                  event.preventDefault();
                  navigateWithDocument(item.href);
                },
              }
            : {
                href: item.href,
                onClick: () => {
                  if (item.id === "home") {
                    setHomeTab("home");
                  }
                },
              };

          return (
            <NavItem
              key={item.id}
              {...navItemProps}
              aria-current={isActive ? "page" : undefined}
              className={`relative rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? isHome
                    ? "bg-white text-neutral-950 shadow-[0_12px_24px_rgba(255,255,255,0.12)]"
                    : isLight
                      ? "bg-white text-slate-950 shadow-[0_10px_18px_rgba(15,23,42,0.05)] dark:bg-white/[0.1] dark:text-white dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
                      : "bg-white text-neutral-950 shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
                  : isHome
                    ? "text-white/64 hover:bg-white/[0.05] hover:text-white"
                    : isLight
                      ? "text-slate-500 hover:bg-white/80 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {item.label}
            </NavItem>
          );
        })}
      </div>
    </nav>
  );
}
