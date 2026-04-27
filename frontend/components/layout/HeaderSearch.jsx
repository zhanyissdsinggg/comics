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
          className="inline-flex h-11 w-full items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3.5 text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-black/16 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)] focus-within:border-black/18"
          title={placeholder}
        >
          <Search className="size-4" />
          <span className="min-w-0 truncate text-sm font-semibold tracking-[0.02em] text-black/65">
            Search
          </span>
          <span className="sr-only">{placeholder}</span>
        </Link>
      </div>
      <div className="hidden w-full md:flex md:min-w-[220px] md:items-center md:gap-3 lg:min-w-[260px]">
        <SearchBar
          onSearch={onSearch}
          placeholder={placeholder}
          variant="default"
          showShortcut={false}
        />
      </div>
    </>
  );
}
