"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Gamepad2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import FigmaChrome from "./FigmaChrome";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import {
  FIGMA_CONTENT_TYPES,
  buildFigmaSeriesItem,
  buildGenreOptions,
  buildInteractiveFallbackCatalog,
  cn,
  filterByGenre,
  sortByRating,
  sortByUpdated,
} from "./figma-utils";

const SEARCH_FORMATS = {
  ALL: "ALL",
  COMICS: FIGMA_CONTENT_TYPES.COMICS,
  NOVELS: FIGMA_CONTENT_TYPES.NOVELS,
  INTERACTIVE: FIGMA_CONTENT_TYPES.INTERACTIVE,
};

const FORMAT_OPTIONS = [
  { key: SEARCH_FORMATS.ALL, label: "All Formats", icon: Sparkles },
  { key: SEARCH_FORMATS.COMICS, label: "Comics", icon: Sparkles },
  { key: SEARCH_FORMATS.NOVELS, label: "Novels", icon: BookOpen },
  { key: SEARCH_FORMATS.INTERACTIVE, label: "Interactive", icon: Gamepad2 },
];

const SORT_OPTIONS = [
  { key: "RELEVANCE", label: "Best Match" },
  { key: "NEWEST", label: "Newest" },
  { key: "RATING", label: "Top Rated" },
  { key: "VIEWS", label: "Most Viewed" },
];

const FALLBACK_KEYWORDS = [
  "Romance",
  "Action",
  "Cyberpunk",
  "Fantasy",
  "Horror",
  "School Life",
];

function normalizeInitialFormat(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "novel" || normalized === "novels") {
    return SEARCH_FORMATS.NOVELS;
  }
  if (normalized === "interactive") {
    return SEARCH_FORMATS.INTERACTIVE;
  }
  if (normalized === "comic" || normalized === "comics") {
    return SEARCH_FORMATS.COMICS;
  }
  return SEARCH_FORMATS.ALL;
}

function resolveProviderContentType(formatKey) {
  if (formatKey === SEARCH_FORMATS.NOVELS) {
    return FIGMA_CONTENT_TYPES.NOVELS;
  }
  if (formatKey === SEARCH_FORMATS.INTERACTIVE) {
    return FIGMA_CONTENT_TYPES.INTERACTIVE;
  }
  return FIGMA_CONTENT_TYPES.COMICS;
}

function mapRemoteResults(results = []) {
  return (Array.isArray(results) ? results : [])
    .map((item) => buildFigmaSeriesItem(item))
    .filter(Boolean);
}

function matchesQuery(item, normalizedQuery) {
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    item?.title,
    item?.author,
    item?.description,
    ...(Array.isArray(item?.genres) ? item.genres : []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function SearchResultCard({ item }) {
  const { palette } = useFigmaSite();

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-[28px] border shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl",
        palette.surface,
        palette.border,
      )}
    >
      <Link href={item.detailHref} className="block">
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={item.coverUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {item.status ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white",
                  item.status === "UP" || item.status === "HOT"
                    ? palette.primaryBg
                    : "bg-emerald-600",
                )}
              >
                {item.status}
              </span>
            ) : null}
            {item.isAdult ? (
              <span className="rounded-full bg-red-500/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                18+
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gray-200">
              <Star className="h-3.5 w-3.5 fill-current text-yellow-400" />
              {item.rating}
              <span className="text-gray-500">/</span>
              {item.viewsText} views
            </div>
            <h3 className="mt-3 line-clamp-2 text-xl font-black leading-tight text-white">
              {item.title}
            </h3>
            <p className="mt-2 text-sm font-semibold text-gray-300">{item.author}</p>
          </div>
        </div>
      </Link>

      <div className="p-5">
        <p className="line-clamp-3 text-sm leading-6 text-gray-400">
          {item.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Array.isArray(item.genres) ? item.genres : []).slice(0, 3).map((genre) => (
            <span
              key={`${item.id}-${genre}`}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
                palette.primarySoft,
              )}
            >
              {genre}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
            {item.chapterLabel}
          </span>
          <Link
            href={item.readHref}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98]",
              palette.primaryBg,
            )}
          >
            {item.readLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function SearchContent({
  initialQuery = "",
  initialFormat = SEARCH_FORMATS.ALL,
}) {
  const { palette, isAdultMode } = useFigmaSite();
  const [query, setQuery] = useState(initialQuery);
  const [activeFormat, setActiveFormat] = useState(
    normalizeInitialFormat(initialFormat),
  );
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeSort, setActiveSort] = useState("RELEVANCE");
  const [remoteItems, setRemoteItems] = useState([]);
  const [hotKeywords, setHotKeywords] = useState(FALLBACK_KEYWORDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    async function loadSearchResults() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (deferredQuery.trim()) {
        params.set("q", deferredQuery.trim());
      }
      params.set("pageSize", "48");
      params.set("adult", isAdultMode ? "1" : "0");

      const response = await apiGet(`/api/search?${params.toString()}`, {
        cacheMs: 3000,
      });

      if (!active) {
        return;
      }

      if (!response.ok) {
        setRemoteItems([]);
        setError("Search failed to load.");
        setLoading(false);
        return;
      }

      setRemoteItems(mapRemoteResults(response.data?.results));
      setLoading(false);
    }

    void loadSearchResults();

    return () => {
      active = false;
    };
  }, [deferredQuery, isAdultMode]);

  useEffect(() => {
    let active = true;

    apiGet(`/api/search/hot?adult=${isAdultMode ? "1" : "0"}&window=day`, {
      cacheMs: 30_000,
    })
      .then((response) => {
        if (!active || !response.ok || !Array.isArray(response.data?.keywords)) {
          return;
        }
        const keywords = response.data.keywords
          .map((item) => String(item || "").trim())
          .filter(Boolean)
          .slice(0, 8);
        if (keywords.length > 0) {
          setHotKeywords(keywords);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isAdultMode]);

  const interactiveItems = useMemo(
    () =>
      buildInteractiveFallbackCatalog().filter(
        (item) => isAdultMode || !item.isAdult,
      ),
    [isAdultMode],
  );

  const interactiveQueryItems = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return interactiveItems.filter((item) => matchesQuery(item, normalizedQuery));
  }, [deferredQuery, interactiveItems]);

  const formatCounts = useMemo(
    () => ({
      all: remoteItems.length + interactiveQueryItems.length,
      comics: remoteItems.filter((item) => item.kind === FIGMA_CONTENT_TYPES.COMICS)
        .length,
      novels: remoteItems.filter((item) => item.kind === FIGMA_CONTENT_TYPES.NOVELS)
        .length,
      interactive: interactiveQueryItems.length,
    }),
    [interactiveQueryItems, remoteItems],
  );

  const formatFilteredItems = useMemo(() => {
    if (activeFormat === SEARCH_FORMATS.INTERACTIVE) {
      return interactiveQueryItems;
    }

    if (activeFormat === SEARCH_FORMATS.COMICS) {
      return remoteItems.filter((item) => item.kind === FIGMA_CONTENT_TYPES.COMICS);
    }

    if (activeFormat === SEARCH_FORMATS.NOVELS) {
      return remoteItems.filter((item) => item.kind === FIGMA_CONTENT_TYPES.NOVELS);
    }

    return [...remoteItems, ...interactiveQueryItems];
  }, [activeFormat, interactiveQueryItems, remoteItems]);

  const genreOptions = useMemo(
    () => buildGenreOptions(formatFilteredItems),
    [formatFilteredItems],
  );

  useEffect(() => {
    if (!genreOptions.includes(activeGenre)) {
      setActiveGenre("All");
    }
  }, [activeGenre, genreOptions]);

  const genreFilteredItems = useMemo(
    () => filterByGenre(formatFilteredItems, activeGenre),
    [activeGenre, formatFilteredItems],
  );

  const sortedItems = useMemo(() => {
    if (activeSort === "NEWEST") {
      return sortByUpdated(genreFilteredItems);
    }
    if (activeSort === "RATING") {
      return sortByRating(genreFilteredItems);
    }
    if (activeSort === "VIEWS") {
      return [...genreFilteredItems].sort(
        (left, right) => Number(right?.viewsValue || 0) - Number(left?.viewsValue || 0),
      );
    }
    return [...genreFilteredItems];
  }, [activeSort, genreFilteredItems]);

  const featuredItem = sortedItems[0] || formatFilteredItems[0] || null;
  const suggestions = sortedItems.slice(0, 6);

  return (
    <div className={cn("min-h-screen pt-24 pb-20", palette.rootBg)}>
      <FigmaChrome searchSuggestions={suggestions}>
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <section
            className={cn(
              "relative mb-8 overflow-hidden rounded-[32px] border px-6 py-8 shadow-2xl md:px-10 md:py-10",
              palette.surface,
              palette.border,
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[120px] opacity-25",
                isAdultMode ? "bg-red-500" : "bg-indigo-500",
              )}
            />
            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-gray-300">
                <Flame className={cn("h-4 w-4", palette.primaryText)} />
                Search
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl">
                Find something worth ruining your sleep schedule for.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 md:text-base">
                Real catalog search for comics and novels, plus the interactive picks
                from your new Figma shell in one place.
              </p>

              <form
                onSubmit={(event) => event.preventDefault()}
                className="mt-8 rounded-[28px] border border-white/10 bg-black/30 p-3 shadow-inner backdrop-blur"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-white/5 px-4 py-3">
                    <Search className={cn("h-5 w-5 shrink-0", palette.primaryText)} />
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search titles, creators, or genres..."
                      className="min-w-0 flex-1 bg-transparent text-base font-bold text-white outline-none placeholder:text-gray-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-gray-300">
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFormat === SEARCH_FORMATS.ALL
                      ? "All formats"
                      : FORMAT_OPTIONS.find((item) => item.key === activeFormat)?.label}
                  </div>
                </div>
              </form>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {hotKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => {
                      setQuery(keyword);
                      setActiveGenre("All");
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-300 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    {keyword}
                  </button>
                ))}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {FORMAT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const count =
                    option.key === SEARCH_FORMATS.ALL
                      ? formatCounts.all
                      : option.key === SEARCH_FORMATS.COMICS
                        ? formatCounts.comics
                        : option.key === SEARCH_FORMATS.NOVELS
                          ? formatCounts.novels
                          : formatCounts.interactive;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setActiveFormat(option.key)}
                      className={cn(
                        "rounded-[24px] border p-4 text-left transition-all",
                        activeFormat === option.key
                          ? cn(palette.primaryBg, "border-transparent text-white shadow-xl")
                          : "border-white/10 bg-black/20 text-gray-300 hover:bg-white/5",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-black uppercase tracking-[0.18em]">
                          {count}
                        </span>
                      </div>
                      <div className="mt-5 text-lg font-black">{option.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-6">
              <section
                className={cn(
                  "rounded-[28px] border p-6 shadow-xl",
                  palette.surface,
                  palette.border,
                )}
              >
                <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
                  Filters
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">Genres</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => setActiveGenre(genre)}
                      className={cn(
                        "rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all",
                        activeGenre === genre
                          ? cn(palette.primaryBg, "text-white shadow-lg")
                          : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </section>

              <section
                className={cn(
                  "rounded-[28px] border p-6 shadow-xl",
                  palette.surface,
                  palette.border,
                )}
              >
                <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
                  Ranking
                </p>
                <div className="mt-4 space-y-2">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setActiveSort(option.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all",
                        activeSort === option.key
                          ? "border border-white/10 bg-white/10 text-white"
                          : "text-gray-500 hover:bg-white/5 hover:text-gray-300",
                      )}
                    >
                      {option.label}
                      {activeSort === option.key ? (
                        <div className={cn("h-2.5 w-2.5 rounded-full", palette.primaryMuted)} />
                      ) : null}
                    </button>
                  ))}
                </div>
              </section>

              {featuredItem ? (
                <section
                  className={cn(
                    "overflow-hidden rounded-[28px] border shadow-xl",
                    palette.surface,
                    palette.border,
                  )}
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img
                      src={featuredItem.coverUrl}
                      alt={featuredItem.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-300">
                        Spotlight Result
                      </p>
                      <h3 className="mt-2 text-2xl font-black text-white">
                        {featuredItem.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-300">{featuredItem.author}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <Link
                      href={featuredItem.readHref}
                      className={cn(
                        "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98]",
                        palette.primaryBg,
                      )}
                    >
                      {featuredItem.readLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </section>
              ) : null}
            </aside>

            <section>
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
                    Results
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                    {deferredQuery.trim() ? `Matches for "${deferredQuery.trim()}"` : "Browse the catalog"}
                  </h2>
                </div>
                <div className="text-sm font-bold text-gray-400">
                  {loading ? "Loading..." : `${sortedItems.length} results live`}
                </div>
              </div>

              {error ? (
                <div
                  className={cn(
                    "rounded-[28px] border p-6 text-white shadow-xl",
                    palette.surface,
                    palette.border,
                  )}
                >
                  <p className="text-lg font-black">{error}</p>
                  <p className="mt-2 text-sm text-gray-400">
                    Refresh the page or change the query and try again.
                  </p>
                </div>
              ) : loading ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`search-skeleton-${index}`}
                      className={cn(
                        "h-[420px] animate-pulse rounded-[28px] border shadow-xl",
                        palette.surface,
                        palette.border,
                      )}
                    />
                  ))}
                </div>
              ) : sortedItems.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedItems.map((item) => (
                    <SearchResultCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-[28px] border p-10 text-center shadow-xl",
                    palette.surface,
                    palette.border,
                  )}
                >
                  <h3 className="text-2xl font-black text-white">No matches yet</h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-400">
                    Try a broader keyword, switch formats, or drop the genre filter.
                    The shell is working; the current combo just came up empty.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </FigmaChrome>
    </div>
  );
}

export default function FigmaSearchPage({
  initialQuery = "",
  initialFormat = SEARCH_FORMATS.ALL,
}) {
  const normalizedFormat = normalizeInitialFormat(initialFormat);

  return (
    <FigmaSiteProvider
      initialContentType={resolveProviderContentType(normalizedFormat)}
    >
      <SearchContent
        initialQuery={initialQuery}
        initialFormat={normalizedFormat}
      />
    </FigmaSiteProvider>
  );
}
