"use client";

import Link from "next/link";
import {
  Bell,
  Compass,
  Library,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import IconButton from "./IconButton";
import SearchPill from "./SearchPill";

export default function HomeHeader({
  suggestions = [],
}) {
  const searchHint = String(suggestions?.[0]?.label || "").trim();
  const quickLinks = [
    { label: "Comics", href: "/comics", icon: Compass },
    { label: "Novels", href: "/novels", icon: Sparkles },
    { label: "Interactive", href: "/interactive", icon: TrendingUp },
    { label: "Rankings", href: "/rankings", icon: Trophy },
  ];

  return (
    <header
      data-site-header="1"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      className="sticky top-0 z-50 -mx-4 sm:-mx-6 lg:-mx-8"
    >
      <div className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(7,10,19,0.78)] backdrop-blur-[20px]">
        <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group relative shrink-0"
            aria-label="Gush home"
          >
            <span className="inline-block bg-[linear-gradient(135deg,#f9a8d4_0%,#ec4899_42%,#7c3aed_100%)] bg-clip-text font-display text-[28px] font-black italic leading-none tracking-[-0.08em] text-transparent drop-shadow-[0_12px_28px_rgba(236,72,153,0.18)] transition-transform duration-200 group-hover:-translate-y-0.5">
              Gush
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-5 lg:flex">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[13px] font-medium tracking-[0.01em] text-[rgba(255,255,255,0.72)] transition-colors duration-200 hover:text-[#f472b6]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <SearchPill
              href="/search"
              className="hidden h-11 w-[320px] min-h-0 justify-start rounded-full px-4 text-left md:inline-flex lg:w-[360px] xl:w-[380px]"
            >
              {searchHint ? `Search ${searchHint}` : "Search stories, creators..."}
            </SearchPill>

            <IconButton
              href="/search"
              icon={Search}
              iconOnly
              className="h-11 w-11 min-h-0 rounded-full md:hidden"
            >
              Search
            </IconButton>

            <div className="relative">
              <IconButton
                href="/notifications"
                icon={Bell}
                iconOnly
                className="h-11 w-11 min-h-0 rounded-full"
              >
                Notifications
              </IconButton>
              <span className="pointer-events-none absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#f472b6] shadow-[0_0_0_4px_rgba(244,114,182,0.16)]" />
            </div>

            <IconButton
              href="/library"
              icon={Library}
              iconOnly
              className="h-11 w-11 min-h-0 rounded-full"
            >
              Library
            </IconButton>
          </div>
        </div>
      </div>
    </header>
  );
}
