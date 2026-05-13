"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
import { getContentModeQueryParam } from "../../lib/contentFilters";
import { trackEvent } from "../../lib/trackEvent";
import FigmaChrome from "./FigmaChrome";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import {
  FIGMA_CONTENT_TYPES,
  buildFigmaSeriesItem,
  buildGenreOptions,
  buildInteractiveFallbackCatalog,
  cn,
  filterContentByMode,
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

function normalizeHotKeywords(keywords = []) {
  return (Array.isArray(keywords) ? keywords : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeInitialFormat(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
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

function SearchResultCard({ item, onDetailClick, onReadClick }) {
  const { palette } = useFigmaSite();
  const chapterMeta = item.hasProgress
    ? `Continue from ${item.ctaChapterLabel}`
    : `Start with ${item.ctaChapterLabel}`;
  const genres = Array.isArray(item.genres) ? item.genres.slice(0, 3) : [];

  return (
    <article
      className={cn(
        "group flex h-full overflow-hidden rounded-[24px] border shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl sm:rounded-[28px] sm:flex-col",
        palette.surface,
        palette.border,
      )}
    >
      <Link
        href={item.detailHref}
        onClick={onDetailClick}
        className="block w-[116px] shrink-0 min-[420px]:w-[128px] sm:w-auto"
      >
        <div className="relative h-full min-h-[176px] overflow-hidden min-[420px]:min-h-[194px] sm:min-h-0 sm:aspect-[3/4]">
          <img
            src={item.coverUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5 md:left-4 md:top-4 md:gap-2">
            {item.status ? (
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white md:px-2.5 md:text-[10px]",
                  item.status === "UP" || item.status === "HOT"
                    ? palette.primaryBg
                    : "bg-emerald-600",
                )}
              >
                {item.status}
              </span>
            ) : null}
            {item.isAdult ? (
              <span className="rounded-full bg-red-500/85 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white md:px-2.5 md:text-[10px]">
                18+
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-gray-200 sm:text-xs">
              <Star className="h-3 w-3 fill-current text-yellow-400 sm:h-3.5 sm:w-3.5" />
              {item.rating}
              <span className="text-gray-500">/</span>
              {item.viewsText} views
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-[15px] font-black leading-tight text-white sm:mt-2.5 sm:text-lg md:mt-3 md:text-xl">
              {item.title}
            </h3>
            <p className="mt-1 text-[13px] font-semibold text-gray-300 md:mt-2 md:text-sm">
              {item.author}
            </p>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4 md:p-5">
        <p className="min-h-0 line-clamp-2 text-[13px] leading-5 text-gray-400 sm:min-h-[4.5rem] sm:text-sm sm:line-clamp-3 md:leading-6">
          {item.description}
        </p>
        <div className="mt-2 flex min-h-[2rem] flex-wrap content-start gap-1.5 sm:mt-4 sm:min-h-[3.75rem] sm:gap-2">
          {genres.map((genre, index) => (
            <span
              key={`${item.id}-${genre}`}
              className={cn(
                "rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] sm:px-2.5 sm:text-[11px]",
                index === 2 ? "hidden sm:inline-flex" : "inline-flex",
                palette.primarySoft,
              )}
            >
              {genre}
            </span>
          ))}
        </div>
        <div className="mt-auto flex flex-col items-start gap-2.5 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3.5 sm:pt-4 md:pt-5">
          <span className="text-[10px] font-bold uppercase leading-4 tracking-[0.16em] text-gray-500 sm:pr-3 sm:text-xs">
            {chapterMeta}
          </span>
          <Link
            href={item.readHref}
            onClick={onReadClick}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-transform active:scale-[0.98] sm:px-3.5 sm:py-1.5 sm:text-[11px]",
              palette.primaryBg,
            )}
          >
            {item.readLabel}
            <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function SearchContent({
  initialQuery = "",
  initialFormat = SEARCH_FORMATS.ALL,
  initialResults = [],
  initialHotKeywords = [],
  initialReady = false,
}) {
  const { palette, isAdultMode, contentMode } = useFigmaSite();
  const normalizedInitialQuery = String(initialQuery || "").trim();
  const [query, setQuery] = useState(initialQuery);
  const [activeFormat, setActiveFormat] = useState(
    normalizeInitialFormat(initialFormat),
  );
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeSort, setActiveSort] = useState("RELEVANCE");
  const [remoteItems, setRemoteItems] = useState(() =>
    mapRemoteResults(initialResults),
  );
  const [hotKeywords, setHotKeywords] = useState(() => {
    const keywords = normalizeHotKeywords(initialHotKeywords);
    return keywords.length > 0 ? keywords : FALLBACK_KEYWORDS;
  });
  const [loading, setLoading] = useState(!initialReady);
  const [error, setError] = useState("");
  const [resolvedQuery, setResolvedQuery] = useState(normalizedInitialQuery);
  const deferredQuery = useDeferredValue(query);
  const hydratedRequestHandledRef = useRef(false);
  const searchOpenTrackedRef = useRef(false);
  const lastSearchSubmitKeyRef = useRef("");
  const lastZeroResultKeyRef = useRef("");
  const impressionKeysRef = useRef(new Set());
  const initialRequestKey = useMemo(
    () =>
      JSON.stringify({
        q: normalizedInitialQuery,
        adult: getContentModeQueryParam(contentMode),
      }),
    [contentMode, normalizedInitialQuery],
  );

  useEffect(() => {
    if (searchOpenTrackedRef.current) {
      return;
    }

    searchOpenTrackedRef.current = true;
    trackEvent("search_open", {
      contentMode,
      sourceSection: "search_page",
    });
  }, [contentMode]);

  useEffect(() => {
    let active = true;

    async function loadSearchResults() {
      const normalizedQuery = deferredQuery.trim();
      const adultFlag = getContentModeQueryParam(contentMode);
      const requestKey = JSON.stringify({
        q: normalizedQuery,
        adult: adultFlag,
      });
      const reuseInitialPayload =
        !hydratedRequestHandledRef.current &&
        initialReady &&
        requestKey === initialRequestKey;

      hydratedRequestHandledRef.current = true;

      if (!reuseInitialPayload) {
        setLoading(true);
      }
      setError("");

      const params = new URLSearchParams();
      if (normalizedQuery) {
        params.set("q", normalizedQuery);
      }
      params.set("pageSize", "48");
      params.set("adult", adultFlag);

      const response = await apiGet(`/api/search?${params.toString()}`, {
        cacheMs: 3000,
      });

      if (!active) {
        return;
      }

      if (!response.ok) {
        setRemoteItems([]);
        setError("Search failed to load.");
        setResolvedQuery(normalizedQuery);
        setLoading(false);
        return;
      }

      setRemoteItems(mapRemoteResults(response.data?.results));
      setResolvedQuery(normalizedQuery);
      setLoading(false);
    }

    void loadSearchResults();

    return () => {
      active = false;
    };
  }, [contentMode, deferredQuery, initialReady, initialRequestKey]);

  useEffect(() => {
    let active = true;

    apiGet(
      `/api/search/hot?adult=${getContentModeQueryParam(contentMode)}&window=day`,
      {
        cacheMs: 30_000,
      },
    )
      .then((response) => {
        if (
          !active ||
          !response.ok ||
          !Array.isArray(response.data?.keywords)
        ) {
          return;
        }
        const keywords = normalizeHotKeywords(response.data.keywords);
        if (keywords.length > 0) {
          setHotKeywords(keywords);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [contentMode]);

  const visibleRemoteItems = useMemo(
    () => filterContentByMode(remoteItems, contentMode),
    [contentMode, remoteItems],
  );

  const interactiveItems = useMemo(
    () => filterContentByMode(buildInteractiveFallbackCatalog(), contentMode),
    [contentMode],
  );

  const effectiveCatalogQuery = loading ? resolvedQuery : deferredQuery.trim();

  const interactiveQueryItems = useMemo(() => {
    const normalizedQuery = effectiveCatalogQuery.toLowerCase();
    return interactiveItems.filter((item) =>
      matchesQuery(item, normalizedQuery),
    );
  }, [effectiveCatalogQuery, interactiveItems]);

  const formatCounts = useMemo(
    () => ({
      all: visibleRemoteItems.length + interactiveQueryItems.length,
      comics: visibleRemoteItems.filter(
        (item) => item.kind === FIGMA_CONTENT_TYPES.COMICS,
      ).length,
      novels: visibleRemoteItems.filter(
        (item) => item.kind === FIGMA_CONTENT_TYPES.NOVELS,
      ).length,
      interactive: interactiveQueryItems.length,
    }),
    [interactiveQueryItems, visibleRemoteItems],
  );

  const formatFilteredItems = useMemo(() => {
    if (activeFormat === SEARCH_FORMATS.INTERACTIVE) {
      return interactiveQueryItems;
    }

    if (activeFormat === SEARCH_FORMATS.COMICS) {
      return visibleRemoteItems.filter(
        (item) => item.kind === FIGMA_CONTENT_TYPES.COMICS,
      );
    }

    if (activeFormat === SEARCH_FORMATS.NOVELS) {
      return visibleRemoteItems.filter(
        (item) => item.kind === FIGMA_CONTENT_TYPES.NOVELS,
      );
    }

    return [...visibleRemoteItems, ...interactiveQueryItems];
  }, [activeFormat, interactiveQueryItems, visibleRemoteItems]);

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
        (left, right) =>
          Number(right?.viewsValue || 0) - Number(left?.viewsValue || 0),
      );
    }
    return [...genreFilteredItems];
  }, [activeSort, genreFilteredItems]);

  const featuredItem = sortedItems[0] || formatFilteredItems[0] || null;
  const suggestions = sortedItems.slice(0, 6);
  const normalizedQuery = deferredQuery.trim();
  const hasSearchIntent =
    Boolean(normalizedQuery) ||
    activeFormat !== SEARCH_FORMATS.ALL ||
    activeGenre !== "All" ||
    activeSort !== "RELEVANCE";

  useEffect(() => {
    if (!hasSearchIntent) {
      return;
    }

    const eventName =
      contentMode === "adult" ? "adult_search_submit" : "search_submit";
    const submitKey = JSON.stringify({
      eventName,
      query: normalizedQuery,
      contentMode,
      format: activeFormat,
      genre: activeGenre,
      sort: activeSort,
    });

    if (lastSearchSubmitKeyRef.current === submitKey) {
      return;
    }

    lastSearchSubmitKeyRef.current = submitKey;
    trackEvent(eventName, {
      query: normalizedQuery || undefined,
      contentMode,
      contentType:
        activeFormat === SEARCH_FORMATS.ALL
          ? undefined
          : activeFormat.toLowerCase(),
      genre: activeGenre !== "All" ? activeGenre : undefined,
      sort: activeSort,
      sourceSection: "search_page",
    });
  }, [
    activeFormat,
    activeGenre,
    activeSort,
    contentMode,
    hasSearchIntent,
    normalizedQuery,
  ]);

  useEffect(() => {
    if (loading || error || !hasSearchIntent || sortedItems.length > 0) {
      return;
    }

    const zeroResultKey = JSON.stringify({
      query: normalizedQuery,
      contentMode,
      format: activeFormat,
      genre: activeGenre,
      sort: activeSort,
    });

    if (lastZeroResultKeyRef.current === zeroResultKey) {
      return;
    }

    lastZeroResultKeyRef.current = zeroResultKey;
    trackEvent("search_zero_result", {
      query: normalizedQuery || undefined,
      contentMode,
      contentType:
        activeFormat === SEARCH_FORMATS.ALL
          ? undefined
          : activeFormat.toLowerCase(),
      genre: activeGenre !== "All" ? activeGenre : undefined,
      sort: activeSort,
      sourceSection: "search_results",
      resultCount: 0,
    });
  }, [
    activeFormat,
    activeGenre,
    activeSort,
    contentMode,
    error,
    hasSearchIntent,
    loading,
    normalizedQuery,
    sortedItems.length,
  ]);

  useEffect(() => {
    if (loading) {
      return;
    }

    sortedItems.slice(0, 12).forEach((item, index) => {
      const impressionKey = `${contentMode}:search:${item.id}:${index}`;
      if (impressionKeysRef.current.has(impressionKey)) {
        return;
      }

      impressionKeysRef.current.add(impressionKey);
      trackEvent("story_impression", {
        seriesId: item.id,
        contentMode,
        contentType: item.kind,
        isAdult: item.isAdult,
        sourceSection: "search_results",
        position: index + 1,
      });
    });
  }, [contentMode, loading, sortedItems]);

  const handleFormatSelect = (nextFormat) => {
    setActiveFormat(nextFormat);
  };

  const handleGenreSelect = (nextGenre) => {
    trackEvent("genre_filter_click", {
      contentMode,
      contentType:
        activeFormat === SEARCH_FORMATS.ALL
          ? undefined
          : activeFormat.toLowerCase(),
      genre: nextGenre,
      sourceSection: "search_filters",
    });
    setActiveGenre(nextGenre);
  };

  const handleResultDetailClick = (item, index) => {
    trackEvent("search_result_click", {
      seriesId: item.id,
      query: normalizedQuery || undefined,
      contentMode,
      contentType: item.kind,
      isAdult: item.isAdult,
      sourceSection: "search_results",
      position: index + 1,
    });
    trackEvent("story_click", {
      seriesId: item.id,
      contentMode,
      contentType: item.kind,
      isAdult: item.isAdult,
      sourceSection: "search_results",
      position: index + 1,
    });
  };

  const handleResultReadClick = (item, index) => {
    trackEvent("story_click", {
      seriesId: item.id,
      contentMode,
      contentType: item.kind,
      isAdult: item.isAdult,
      sourceSection: "search_read_cta",
      position: index + 1,
    });
  };

  return (
    <div className={cn("min-h-screen pb-20", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <section
            className={cn(
              "relative mb-6 overflow-hidden rounded-[28px] border px-4 py-4 shadow-2xl md:mb-8 md:rounded-[32px] md:px-10 md:py-10",
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
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-gray-300 md:mb-4 md:px-4 md:py-2 md:text-xs">
                <Flame className={cn("h-4 w-4", palette.primaryText)} />
                Search
              </div>
              <h1 className="max-w-xl text-2xl font-black tracking-tight text-white md:max-w-3xl md:text-5xl">
                Find something worth ruining your sleep schedule for.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400 md:mt-4 md:text-base md:leading-7">
                Real catalog search for comics and novels, plus interactive
                picks in one place.
              </p>

              <form
                onSubmit={(event) => event.preventDefault()}
                className="mt-4 rounded-[24px] border border-white/10 bg-black/30 p-2 shadow-inner backdrop-blur md:mt-8 md:rounded-[28px] md:p-3"
              >
                <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[18px] bg-white/5 px-3 py-2.5 md:gap-3 md:rounded-[20px] md:px-4 md:py-3">
                    <Search
                      className={cn("h-5 w-5 shrink-0", palette.primaryText)}
                    />
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search titles, creators, or genres..."
                      className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-white outline-none placeholder:text-gray-600 md:text-base"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/5 px-3.5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-gray-300 md:px-4 md:py-3 md:text-xs">
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFormat === SEARCH_FORMATS.ALL
                      ? "All formats"
                      : FORMAT_OPTIONS.find((item) => item.key === activeFormat)
                          ?.label}
                  </div>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap gap-2 md:mt-6">
                {hotKeywords.map((keyword, index) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => {
                      setQuery(keyword);
                      setActiveGenre("All");
                    }}
                    className={cn(
                      "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-300 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white md:px-4 md:py-2 md:text-xs",
                      index > 2 ? "hidden sm:inline-flex" : "",
                    )}
                  >
                    {keyword}
                  </button>
                ))}
              </div>

              <div className="mt-6 hidden gap-4 xl:grid xl:grid-cols-4">
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
                      onClick={() => handleFormatSelect(option.key)}
                      className={cn(
                        "rounded-[24px] border p-3.5 text-left transition-all md:p-4",
                        activeFormat === option.key
                          ? cn(
                              palette.primaryBg,
                              "border-transparent text-white shadow-xl",
                            )
                          : "border-white/10 bg-black/20 text-gray-300 hover:bg-white/5",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-black uppercase tracking-[0.18em]">
                          {count}
                        </span>
                      </div>
                      <div className="mt-3 text-sm font-black md:mt-5 md:text-lg">
                        {option.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-8">
            <aside className="order-2 grid items-start gap-4 min-[390px]:grid-cols-2 xl:order-1 xl:block xl:space-y-6">
              <section
                className={cn(
                  "rounded-[24px] border p-4 shadow-xl md:rounded-[28px] md:p-6",
                  palette.surface,
                  palette.border,
                )}
              >
                <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
                  Filters
                </p>
                <h2 className="mt-2 text-xl font-black text-white md:text-2xl">
                  Genres
                </h2>
                <div className="mt-4 flex flex-wrap gap-2 md:mt-5">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreSelect(genre)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] transition-all md:py-2 md:text-xs",
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
                  "rounded-[24px] border p-4 shadow-xl md:rounded-[28px] md:p-6",
                  palette.surface,
                  palette.border,
                )}
              >
                <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
                  Ranking
                </p>
                <div className="mt-4 space-y-1.5 md:space-y-2">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setActiveSort(option.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-sm font-bold transition-all md:px-4 md:py-3",
                        activeSort === option.key
                          ? "border border-white/10 bg-white/10 text-white"
                          : "text-gray-500 hover:bg-white/5 hover:text-gray-300",
                      )}
                    >
                      {option.label}
                      {activeSort === option.key ? (
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            palette.primaryMuted,
                          )}
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </section>

              {featuredItem ? (
                <section
                  className={cn(
                    "hidden overflow-hidden rounded-[28px] border shadow-xl xl:block",
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
                      <p className="mt-2 text-sm text-gray-300">
                        {featuredItem.author}
                      </p>
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

            <section className="order-1 xl:order-2">
              <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
                    Results
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
                    {deferredQuery.trim()
                      ? `Matches for "${deferredQuery.trim()}"`
                      : "Browse the catalog"}
                  </h2>
                </div>
                <div className="text-sm font-bold text-gray-400">
                  {loading
                    ? "Loading..."
                    : `${sortedItems.length} results live`}
                </div>
              </div>

              <div className="mb-3 flex gap-2 overflow-x-auto pb-1 xl:hidden">
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
                      key={`results-${option.key}`}
                      type="button"
                      onClick={() => handleFormatSelect(option.key)}
                      className={cn(
                        "min-w-[128px] shrink-0 rounded-[20px] border px-3 py-2.5 text-left transition-all",
                        activeFormat === option.key
                          ? cn(
                              palette.primaryBg,
                              "border-transparent text-white shadow-xl",
                            )
                          : "border-white/10 bg-black/20 text-gray-300 hover:bg-white/5",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-xs font-black">
                            {option.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                          {count}
                        </span>
                      </div>
                    </button>
                  );
                })}
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
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`search-skeleton-${index}`}
                      className={cn(
                        "h-[280px] animate-pulse rounded-[24px] border shadow-xl sm:h-[360px] md:h-[420px] md:rounded-[28px]",
                        palette.surface,
                        palette.border,
                      )}
                    />
                  ))}
                </div>
              ) : sortedItems.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
                  {sortedItems.map((item, index) => (
                    <SearchResultCard
                      key={item.id}
                      item={item}
                      onDetailClick={() => handleResultDetailClick(item, index)}
                      onReadClick={() => handleResultReadClick(item, index)}
                    />
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
                  <h3 className="text-2xl font-black text-white">
                    No matches yet
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-400">
                    Try a broader keyword, switch formats, or drop the genre
                    filter. The current combo just came up empty.
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
  initialResults = [],
  initialHotKeywords = [],
  initialReady = false,
}) {
  const normalizedFormat = normalizeInitialFormat(initialFormat);

  return (
    <FigmaSiteProvider
      initialContentType={resolveProviderContentType(normalizedFormat)}
    >
      <SearchContent
        initialQuery={initialQuery}
        initialFormat={normalizedFormat}
        initialResults={initialResults}
        initialHotKeywords={initialHotKeywords}
        initialReady={initialReady}
      />
    </FigmaSiteProvider>
  );
}
