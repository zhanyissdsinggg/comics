"use client";

import Link from "next/link";
import { ArrowRight, Compass, Search, Sparkles, TrendingUp } from "lucide-react";
import GenreChip from "./GenreChip";

export default function HomeHeader({
  suggestions = [],
}) {
  const quickLinks = [
    { label: "Comics", href: "/comics", icon: Compass },
    { label: "Novels", href: "/novels", icon: Sparkles },
    { label: "Interactive", href: "/interactive", icon: TrendingUp },
    { label: "Rankings", href: "/rankings", icon: ArrowRight },
  ];

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_44%,rgba(255,255,255,0.02)_100%)] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,92,164,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(103,232,249,0.1),transparent_32%)]" />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/48">
              Browse Tonight
            </p>
            <h2 className="font-display text-[1.5rem] font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-[1.85rem]">
              Pick a shelf. Chase a vibe.
            </h2>
          </div>

          <Link
            href="/search"
            className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-full border border-white/10 bg-[rgba(7,10,18,0.62)] px-4 text-sm font-medium text-white/78 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
          >
            <Search className="size-4" />
            Search series, authors...
          </Link>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
          <div className="flex min-w-max gap-2.5">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/74 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.09] hover:text-white"
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {suggestions.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/44">
              Search suggestions
            </p>
            <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
              <div className="flex min-w-max gap-2">
                {suggestions.map((item) => (
                  <Link
                    key={item.value}
                    href={`/search?q=${encodeURIComponent(item.value)}`}
                    className="shrink-0"
                  >
                    <GenreChip label={item.label} tone="ghost" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
