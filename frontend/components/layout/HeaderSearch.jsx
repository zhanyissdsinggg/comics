"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Search } from "lucide-react";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

export default function HeaderSearch({ onSearch, variant = "default" }) {
  const isLight =
    variant === "light" || variant === "home" || variant === "default";
  const placeholder = "Search titles";

  return (
    <>
      <div className="md:hidden">
        <Link
          href="/search"
          aria-label="Open search"
          className={`inline-flex h-10 w-full items-center gap-2 rounded-full border px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-200/80 ${
            isLight
              ? "border-[color:var(--gush-border)] bg-white text-[color:var(--gush-ink-soft)] shadow-[0_8px_18px_rgba(0,0,0,0.05)] hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-[color:var(--gush-ink-strong)] dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200 dark:shadow-[0_14px_30px_rgba(0,0,0,0.2)] dark:hover:border-white/18 dark:hover:bg-white/[0.08] dark:hover:text-white"
              : "border-white/10 bg-white/[0.04] text-white/72 hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
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
          variant={isLight ? "light" : "default"}
          showShortcut={false}
        />
      </div>
    </>
  );
}
