"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHomeStore } from "../../store/useHomeStore";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";
import { siteConfig } from "../../lib/siteConfig";
import { storefrontSecondaryButtonClass } from "../common/StorefrontPagePrimitives";

const PUBLIC_NAV_ITEMS = [
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "interactive", label: "Interactive", href: "/interactive" },
]
  .concat(
    siteConfig.navigation.showRankingsInNav
      ? [{ id: "rankings", label: "Rankings", href: "/rankings" }]
      : [],
  )
  .concat(
    siteConfig.navigation.showCreatorsInNav
      ? [{ id: "creators", label: "Creators", href: "/creators" }]
      : [],
  );

export default function HeaderNav({ variant = "default", showInteractiveNav = true }) {
  const pathname = usePathname();
  const { setHomeTab } = useHomeStore();
  const navItems = PUBLIC_NAV_ITEMS.filter(
    (item) => item.id !== "interactive" || showInteractiveNav,
  );

  return (
    <nav className="hidden flex-1 justify-center md:flex">
      <div className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.02] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
              className={`rounded-full px-4 py-2.5 text-sm font-medium tracking-[0.01em] transition-all duration-150 ${isActive ? "bg-[linear-gradient(135deg,rgba(255,79,154,0.18)_0%,rgba(167,139,250,0.14)_100%)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),0_10px_22px_rgba(0,0,0,0.24)]" : `${storefrontSecondaryButtonClass} h-auto bg-transparent px-4 py-2.5 text-white/68 shadow-none hover:bg-[rgba(255,255,255,0.075)]`}`}
            >
              {item.label}
            </NavItem>
          );
        })}
      </div>
    </nav>
  );
}
