"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Search } from "lucide-react";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

export default function HeaderSearch({ onSearch, variant = "default" }) {
  const isHome = variant === "home";
  const isLight = variant === "light";
  const placeholder = "Search series, creators...";

  return (
    <>
      <div className="md:hidden">
        <Link
          href="/search"
          aria-label="Open search"
          className={`inline-flex h-10 w-full items-center gap-2 rounded-full border px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(49,87,214,0.16)] ${
            isHome
              ? "border-white/10 bg-white/[0.05] text-white/72 shadow-[0_12px_28px_rgba(0,0,0,0.18)] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
              : isLight
                ? "border-black/8 bg-white/90 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:border-black/12 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200 dark:shadow-[0_14px_30px_rgba(0,0,0,0.2)] dark:hover:border-white/18 dark:hover:bg-white/[0.08] dark:hover:text-white"
                : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          }`}
          title={placeholder}
        >
          <Search className="size-4" />
          <span className="min-w-0 truncate text-sm font-medium">Search</span>
          <span className="sr-only">{placeholder}</span>
        </Link>
      </div>
      <div className="hidden w-full md:flex md:min-w-[220px] md:items-center md:gap-3 lg:min-w-[260px]">
        <SearchBar
          onSearch={onSearch}
          placeholder={placeholder}
          variant={isHome ? "home" : isLight ? "light" : "default"}
          showShortcut={!isHome && !isLight}
        />
      </div>
    </>
  );
}
