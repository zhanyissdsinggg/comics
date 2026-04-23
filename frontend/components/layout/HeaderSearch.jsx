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
          className="inline-flex h-11 w-full items-center gap-2 border-[3px] border-white bg-white px-3.5 text-black/70 shadow-[4px_4px_0_0_rgba(255,229,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(255,0,122,0.18)]"
          title={placeholder}
        >
          <Search className="size-4" />
          <span className="min-w-0 truncate text-sm font-black uppercase tracking-[0.06em]">Search</span>
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
