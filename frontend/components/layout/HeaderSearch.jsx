"use client";

import dynamic from "next/dynamic";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

export default function HeaderSearch({ onSearch, variant = "default" }) {
  const isLight = variant === "home" || variant === "light";

  return (
    <div className="flex items-center gap-3">
      <SearchBar
        onSearch={onSearch}
        placeholder="Search titles, genres, or creators"
        variant={isLight ? "light" : "default"}
        showShortcut={!isLight}
      />
    </div>
  );
}
