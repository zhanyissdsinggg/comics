"use client";

import dynamic from "next/dynamic";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

export default function HeaderSearch({ onSearch }) {
  return (
    <div className="flex items-center gap-3">
      <SearchBar onSearch={onSearch} placeholder="Search series" />
    </div>
  );
}
