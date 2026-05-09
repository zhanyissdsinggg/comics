"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Search } from "lucide-react";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

export default function HeaderSearch({ onSearch, variant = "default" }) {
  const placeholder = "Search";

  return (
    <>
      <div className="md:hidden">
        <Link
          href="/search"
          aria-label="Open search"
          className="inline-flex h-11 w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_32px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-all duration-150 hover:border-white/16 hover:bg-white/[0.07] focus-within:border-[rgba(255,79,154,0.34)]"
          title={placeholder}
        >
          <Search className="size-4 text-white/68" />
          <span className="min-w-0 truncate text-sm font-medium tracking-[0.01em] text-white/72">
            Search
          </span>
          <span className="sr-only">{placeholder}</span>
        </Link>
      </div>
      <div className="hidden w-full md:flex md:min-w-[220px] md:items-center md:gap-3 lg:min-w-[260px]">
        <SearchBar
          onSearch={onSearch}
          placeholder={placeholder}
          variant="dark"
          showShortcut={false}
        />
      </div>
    </>
  );
}
