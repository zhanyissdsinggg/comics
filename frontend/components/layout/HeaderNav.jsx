"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, House, ScrollText, Trophy, Users } from "lucide-react";
import { useHomeStore } from "../../store/useHomeStore";

const NAV_ITEMS = [
  { id: "home", label: "Home", href: "/", icon: House },
  { id: "comics", label: "Comics", href: "/comics", icon: BookOpenText },
  { id: "novels", label: "Novels", href: "/novels", icon: ScrollText },
  { id: "creators", label: "Creators", href: "/creators", icon: Users },
  { id: "rankings", label: "Rankings", href: "/rankings", icon: Trophy },
];

export default function HeaderNav() {
  const pathname = usePathname();
  const { setHomeTab } = useHomeStore();

  return (
    <nav className="hidden flex-1 justify-center md:flex">
      <div className="inline-flex items-center gap-1 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
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
              className={`relative flex items-center gap-2 rounded-[18px] px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-white text-neutral-950 shadow-[0_12px_40px_rgba(255,255,255,0.16)]"
                  : "text-neutral-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
