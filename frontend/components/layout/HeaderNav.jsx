"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHomeStore } from "../../store/useHomeStore";

const DEFAULT_NAV_ITEMS = [
  { id: "home", label: "Home", href: "/" },
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "creators", label: "Creators", href: "/creators" },
  { id: "rankings", label: "Top Series", href: "/rankings" },
];

const HOME_NAV_ITEMS = [
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "creators", label: "Creators", href: "/creators" },
  { id: "help", label: "Help", href: "/support" },
];

export default function HeaderNav({ variant = "default" }) {
  const pathname = usePathname();
  const { setHomeTab } = useHomeStore();
  const isLight = variant === "home" || variant === "light";
  const navItems = variant === "home" ? HOME_NAV_ITEMS : DEFAULT_NAV_ITEMS;

  return (
    <nav className="hidden flex-1 justify-center md:flex">
      <div
        className={`inline-flex items-center gap-1 rounded-full p-1 ${
          isLight
            ? "border border-black/6 bg-white/55 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
            : "border border-white/8 bg-white/[0.04]"
        }`}
      >
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                if (item.id === "home") {
                  setHomeTab("home");
                }
              }}
              className={`relative rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? isLight
                    ? "bg-white text-slate-950 shadow-[0_10px_18px_rgba(15,23,42,0.05)]"
                    : "bg-white text-neutral-950 shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
                  : isLight
                    ? "text-slate-500 hover:bg-white/80 hover:text-slate-950"
                    : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
