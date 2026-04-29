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
          className="inline-flex h-11 w-full items-center gap-2 rounded-full border-2 border-white/20 bg-black px-3.5 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors hover:border-[#FFE500] hover:bg-[#111111] focus-within:border-[#FFE500]"
          title={placeholder}
        >
          <Search className="size-4" />
          <span className="min-w-0 truncate text-sm font-semibold tracking-[0.02em] text-white/80">
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
