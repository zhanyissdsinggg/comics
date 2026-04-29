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
  { id: "featured", label: "Trending", href: "/rankings" },
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "creators", label: "Creators", href: "/creators" },
];

const HOME_NAV_ITEMS = [
  { id: "featured", label: "Trending", href: "/rankings" },
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "creators", label: "Creators", href: "/creators" },
];

export default function HeaderNav({ variant = "default" }) {
  const pathname = usePathname();
  const { setHomeTab } = useHomeStore();
  const navItems = variant === "home" ? HOME_NAV_ITEMS : DEFAULT_NAV_ITEMS;

  return (
    <nav className="hidden flex-1 justify-center md:flex">
      <div className="inline-flex items-center gap-1">
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
              className={`px-4 py-2 text-white transition-colors ${isActive ? "bg-[#FF007A] text-white" : "hover:bg-[#FF007A] hover:text-white"} font-bold`}
            >
              {item.label}
            </NavItem>
          );
        })}
      </div>
    </nav>
  );
}
