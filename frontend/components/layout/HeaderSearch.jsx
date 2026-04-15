"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Search } from "lucide-react";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

export default function HeaderSearch({ onSearch, variant = "default" }) {
  const placeholder = "Search titles";

  return (
    <>
      <div className="md:hidden">
        <Link
          href="/search"
          aria-label="Open search"
          className="inline-flex h-10 w-full items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white px-3.5 text-[color:var(--gush-ink-soft)] shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-[color:var(--gush-ink-strong)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-200/80"
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
          variant="light"
          showShortcut={false}
        />
      </div>
    </>
  );
}
