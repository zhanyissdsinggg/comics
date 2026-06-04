"use client";

import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import GhostButton from "@/components/ui/ghost-button";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

export default function HeaderSearch({
  onSearch,
  variant = "default",
  showInteractiveNav = true,
}) {
  void variant;
  const placeholder = "Search stories, creators...";
  const desktopSearchLabel = "Search stories and creators";

  return (
    <>
      <div className="md:hidden">
        <GhostButton
          href="/search"
          aria-label="Open search"
          className="h-11 w-11 rounded-full px-0"
        >
          <Search aria-hidden="true" className="size-4 text-white/72" />
        </GhostButton>
      </div>
      <div className="hidden w-full md:flex md:min-w-[220px] md:items-center md:gap-3 lg:min-w-[260px]">
        <SearchBar
          onSearch={onSearch}
          placeholder={placeholder}
          ariaLabel={desktopSearchLabel}
          variant="dark"
          showShortcut={false}
          showInteractiveNav={showInteractiveNav}
        />
      </div>
    </>
  );
}
