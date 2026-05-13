"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Search, ShieldAlert, X } from "lucide-react";
import { useFigmaSite } from "./FigmaSiteContext";
import { cn } from "./figma-utils";

const DEFAULT_TRENDING_TAGS = [
  "Solo Leveling",
  "Romance",
  "Cyberpunk",
  "Vampire",
  "Horror",
  "System",
];

const DEFAULT_SEARCH_SUGGESTIONS = [
  {
    id: "search-home",
    title: "Trending Comics",
    subtitle: "Start with the hottest series on the front page.",
    href: "/",
    label: "Home",
  },
  {
    id: "search-novels",
    title: "Fresh Novel Drops",
    subtitle: "Browse prose-heavy stories and latest updates.",
    href: "/novels",
    label: "Novels",
  },
  {
    id: "search-interactive",
    title: "Interactive Story Paths",
    subtitle: "Branching episodes and choice-driven chaos.",
    href: "/search?format=interactive",
    label: "Interactive",
  },
];

function buildSearchSuggestionItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (!item) {
        return null;
      }

      if (item.href && item.title) {
        return item;
      }

      const href = String(item?.detailHref || item?.readHref || "").trim();
      const title = String(item?.title || "").trim();
      if (!href || !title) {
        return null;
      }

      return {
        id: item.id || href,
        title,
        subtitle: item.author || item.chapterLabel || "Story pick",
        href,
        label: item.kind || "Story",
        coverUrl: item.coverUrl || "",
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function FigmaAgeGateModal() {
  const {
    palette,
    showAgeGate,
    setShowAgeGate,
    legalAge,
    confirmAdultMode,
  } = useFigmaSite();

  if (!showAgeGate) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-900/40 bg-[#121212] p-8 shadow-2xl">
        <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-red-600 to-rose-900" />
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-3 text-2xl font-black tracking-tight text-white md:text-3xl">
            Age Verification Required
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-gray-400 md:text-base">
            Mature stories are limited to readers {legalAge}+.
            Confirm your age to switch into the adult-only catalog.
          </p>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowAgeGate(false)}
              className="flex-1 rounded-xl border border-transparent bg-gray-800 px-4 py-3.5 font-bold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-700 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAdultMode}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-black text-white transition-all active:scale-95",
                palette.primaryBg,
              )}
            >
              <Lock className="h-5 w-5" />
              I am {legalAge} or older
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FigmaSearchOverlay({ searchSuggestions = [] }) {
  const router = useRouter();
  const {
    palette,
    searchOverlayOpen,
    setSearchOverlayOpen,
    isAdultMode,
  } = useFigmaSite();
  const [query, setQuery] = useState("");

  const suggestionItems = useMemo(() => {
    const mapped = buildSearchSuggestionItems(searchSuggestions);
    return mapped.length > 0 ? mapped : DEFAULT_SEARCH_SUGGESTIONS;
  }, [searchSuggestions]);

  useEffect(() => {
    if (!searchOverlayOpen) {
      setQuery("");
    }
  }, [searchOverlayOpen]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    setSearchOverlayOpen(false);
    router.push(
      normalizedQuery
        ? `/search?q=${encodeURIComponent(normalizedQuery)}`
        : "/search",
    );
  };

  if (!searchOverlayOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#050505]/95 backdrop-blur-xl">
      <div className={cn("w-full border-b bg-[#0a0c10]", palette.border)}>
        <form
          onSubmit={handleSearchSubmit}
          className="mx-auto flex h-20 max-w-[1200px] items-center gap-4 px-4 md:h-24 md:px-8"
        >
          <Search className={cn("h-6 w-6 md:h-8 md:w-8", palette.primaryText)} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search comics, novels, authors..."
            className="flex-1 bg-transparent text-xl font-black text-white outline-none placeholder:text-gray-600 md:text-3xl"
          />
          <button
            type="submit"
            className={cn(
              "hidden rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-95 md:block",
              palette.primaryBg,
            )}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setSearchOverlayOpen(false)}
            className="rounded-full bg-white/5 p-3 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-6 w-6 md:h-8 md:w-8" />
          </button>
        </form>
      </div>

      <div className="mx-auto w-full max-w-[1200px] flex-1 overflow-y-auto p-4 md:p-12">
        <h3 className="mb-6 text-sm font-bold uppercase tracking-[0.22em] text-gray-500">
          Trending Searches
        </h3>
        <div className="mb-10 flex flex-wrap gap-3">
          {DEFAULT_TRENDING_TAGS.map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              onClick={() => setSearchOverlayOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-gray-300 transition-all hover:scale-105 hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              {tag}
            </Link>
          ))}
        </div>

        <h3 className="mb-6 text-sm font-bold uppercase tracking-[0.22em] text-gray-500">
          Suggested Results
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suggestionItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSearchOverlayOpen(false)}
              className="group flex items-center gap-4 rounded-2xl border border-transparent bg-white/5 p-4 transition-all hover:border-gray-700 hover:bg-white/10 active:scale-95"
            >
              {item.coverUrl ? (
                <div className="h-12 w-12 overflow-hidden rounded-lg bg-black shadow-inner ring-1 ring-white/10">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black shadow-inner">
                  <Search className="h-5 w-5 text-gray-500 transition-colors group-hover:text-white" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-white transition-colors group-hover:text-gray-200">
                  {item.title}
                </h4>
                <p className="mt-0.5 flex gap-2 text-xs font-medium text-gray-500">
                  <span className={cn("font-bold", palette.primaryText)}>
                    {item.label}
                  </span>
                  <span>{item.subtitle || (isAdultMode ? "Adult-only pick" : "Fresh update")}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// This is an overlay host for Figma surfaces, not a second site-wide shell.
// PublicHeader/PublicFooter still come from AppProviders, while this component
// only mounts page-level overlays such as the adult gate and search sheet.
export default function FigmaChrome({
  children,
  searchSuggestions = [],
}) {
  return (
    <>
      <FigmaAgeGateModal />
      <FigmaSearchOverlay searchSuggestions={searchSuggestions} />
      {children}
    </>
  );
}
