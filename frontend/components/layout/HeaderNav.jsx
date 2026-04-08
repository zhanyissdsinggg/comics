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
  const isLight =
    variant === "light" || variant === "home" || variant === "default";
  const navItems = variant === "home" ? HOME_NAV_ITEMS : DEFAULT_NAV_ITEMS;

  return (
    <nav className="hidden flex-1 justify-center md:flex">
      <div
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-1 ${
          isLight
            ? "border border-black/8 bg-[rgba(255,255,255,0.72)] shadow-[0_10px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_34px_rgba(0,0,0,0.2)]"
            : "border border-white/10 bg-white/[0.04] shadow-[0_14px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl"
        }`}
      >
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const useDocumentNavigation = shouldUseDocumentNavigation(
            pathname,
            item.href,
          );
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
                  ? isLight
                    ? "bg-white text-[color:var(--gush-ink-strong)] shadow-[0_10px_22px_rgba(0,0,0,0.06)] dark:bg-white/[0.1] dark:text-white dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
                    : "bg-white/[0.12] text-white shadow-[0_12px_26px_rgba(0,0,0,0.24)]"
                  : isLight
                    ? "text-[color:var(--gush-ink-soft)] hover:bg-black/[0.04] hover:text-[color:var(--gush-ink-strong)] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    : "text-white/68 hover:bg-white/[0.06] hover:text-white"
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
