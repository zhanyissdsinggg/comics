"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Search } from "lucide-react";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

export default function HeaderSearch({ onSearch, variant = "default" }) {
  const isLight = variant === "home" || variant === "light";
  const placeholder = "Search series, creators...";

  return (
    <>
      <div className="md:hidden">
        <Link
          href="/search"
          aria-label={placeholder}
          className={`inline-flex h-10 w-full items-center gap-2 rounded-full border px-3.5 transition-colors ${
            isLight
              ? "border-black/8 bg-white/90 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:border-black/12 hover:bg-white hover:text-slate-900"
              : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          }`}
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
          showShortcut={!isLight}
        />
      </div>
    </>
  );
}
