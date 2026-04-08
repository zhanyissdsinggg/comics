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
  const isLight =
    variant === "light" || variant === "home" || variant === "default";
  const navItems = variant === "home" ? HOME_NAV_ITEMS : DEFAULT_NAV_ITEMS;

  return (
    <nav className="hidden flex-1 justify-center md:flex">
      <div
        className={`inline-flex items-center gap-1 rounded-full p-1.5 ${
          isHome
            ? "border border-[color:var(--gush-border)] bg-[rgba(255,252,247,0.74)] shadow-[0_10px_22px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_34px_rgba(0,0,0,0.2)]"
            : isLight
              ? "border border-[color:var(--gush-border)] bg-[rgba(255,252,247,0.72)] shadow-[0_10px_22px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_34px_rgba(0,0,0,0.2)]"
              : "border border-white/8 bg-white/[0.04]"
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
                  ? isHome
                    ? "bg-[rgba(255,253,249,0.96)] text-[color:var(--gush-ink-strong)] shadow-[0_12px_24px_rgba(15,23,42,0.045)] dark:bg-white/[0.1] dark:text-white dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
                    : isLight
                      ? "bg-[rgba(255,253,249,0.96)] text-[color:var(--gush-ink-strong)] shadow-[0_12px_24px_rgba(15,23,42,0.045)] dark:bg-white/[0.1] dark:text-white dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
                      : "bg-white text-neutral-950 shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
                  : isHome
                    ? "text-[color:var(--gush-ink-soft)] hover:bg-[rgba(255,255,255,0.72)] hover:text-[color:var(--gush-ink-strong)] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    : isLight
                      ? "text-[color:var(--gush-ink-soft)] hover:bg-[rgba(255,255,255,0.72)] hover:text-[color:var(--gush-ink-strong)] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
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
