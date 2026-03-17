"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHomeStore } from "../../store/useHomeStore";

const NAV_ITEMS = [
  { id: "home", label: "Home", href: "/" },
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "creators", label: "Creators", href: "/creators" },
  { id: "rankings", label: "Rankings", href: "/rankings" },
];

export default function HeaderNav() {
  const pathname = usePathname();
  const { setHomeTab } = useHomeStore();

  return (
    <nav className="hidden flex-1 justify-center md:flex">
      <div className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1 shadow-[0_14px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
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
                  ? "bg-white text-neutral-950 shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
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
