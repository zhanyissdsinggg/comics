"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHomeStore } from "../../store/useHomeStore";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";

const PUBLIC_NAV_ITEMS = [
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "interactive", label: "Interactive", href: "/interactive" },
  { id: "rankings", label: "Rankings", href: "/rankings" },
];

export default function HeaderNav({ variant = "default", showInteractiveNav = true }) {
  const pathname = usePathname();
  const { setHomeTab } = useHomeStore();
  void variant;
  const navItems = PUBLIC_NAV_ITEMS.filter(
    (item) => item.id !== "interactive" || showInteractiveNav,
  );

  return (
    <nav aria-label="Primary" className="hidden flex-1 justify-center md:flex">
      <div className="inline-flex items-center gap-1.5">
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
              className={`relative inline-flex h-10 items-center rounded-full px-3.5 text-sm font-medium tracking-[0.01em] transition-all duration-150 ${
                isActive
                  ? "bg-[linear-gradient(135deg,rgba(236,72,153,0.18)_0%,rgba(124,58,237,0.16)_100%)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_14px_28px_rgba(0,0,0,0.22)]"
                  : "text-white/72 hover:bg-[rgba(255,255,255,0.045)] hover:text-[#F9A8D4]"
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
