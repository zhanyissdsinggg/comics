"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Search } from "lucide-react";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

export default function HeaderSearch({ onSearch, variant = "default" }) {
  const isLight = variant === "home" || variant === "light";

  return (
    <>
      <div className="md:hidden">
        <Link
          href="/search"
          aria-label="Search titles, genres, or creators"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
            isLight
              ? "border-black/8 bg-white/78 text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.05)] hover:border-black/12 hover:bg-white hover:text-slate-900"
              : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <Search className="size-4" />
          <span className="sr-only">Search titles, genres, or creators</span>
        </Link>
      </div>
      <div className="hidden w-full md:flex md:items-center md:gap-3">
        <SearchBar
          onSearch={onSearch}
          placeholder="Search titles, genres, or creators"
          variant={isLight ? "light" : "default"}
          showShortcut={!isLight}
        />
      </div>
    </>
  );
}
