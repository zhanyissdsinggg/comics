"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame, Sparkles } from "lucide-react";
import SearchPageInput from "../search/SearchPageInput";
import { apiGet } from "../../lib/apiClient";
import { getContentModeQueryParam, isAdultContent } from "../../lib/contentFilters";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import {
  CoverCard,
  DiscoveryFilterPill,
  EmptyShelf,
  SectionHeading,
  ShelfScroller,
  StorefrontPage,
  StoryHero,
  UpdateList,
  discoveryIcons,
} from "./StorefrontScaffold";
import {
  buildGenreShelves,
  buildMoodTags,
  buildPopularRail,
  buildUpdatedRail,
  normalizeStatus,
  normalizeType,
  pickFeaturedSeries,
} from "./landingUtils";

const SORT_OPTIONS = [
  { id: "relevance", label: "Best Match" },
  { id: "popular", label: "Popular" },
  { id: "latest", label: "Latest" },
];

function normalizeValue(value) {
  return String(value || "").trim();
}

function normalizeKeywordList(items = [], includeAdult = false) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const label = normalizeValue(
        typeof item === "string"
          ? item
          : item?.keyword || item?.label || item?.name || item?.query,
      );
      return label
        ? {
            id: String(item?.id || `hot-${index}-${label}`),
            label,
            value: normalizeValue(item?.query || label),
          }
        : null;
    })
    .filter(Boolean)
    .filter((item) => (includeAdult ? true : !/adult|18\+|mature/i.test(item.label)));
}

function sanitizeCatalog(items = [], includeAdult = false) {
  return (Array.isArray(items) ? items : []).filter((series) => {
    if (!series || typeof series !== "object") {
      return false;
    }
    return includeAdult ? true : !isAdultContent(series);
  });
}

function buildSeriesHref(series, searchPath, query, campaignId) {
  return buildPathWithAttribution(`/series/${series.id}`, {
    entryPoint: "SEARCH_RESULTS",
    campaignId,
    sourcePath: searchPath,
    sourceSeriesId: series.id,
    returnTo: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
  });
}

export default function DiscoverySearchPage({
  initialQuery = "",
  initialType = "",
  initialFormat = "",
  initialStatus = "",
  initialGenre = "",
  initialSort = "relevance",
  initialPage = "1",
  initialIncludeAdult = false,
  initialResults = [],
  initialTotal = 0,
  initialHotKeywords = [],
  initialReady = false,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { contentMode, forceDisableAdultMode } = useAdultGateStore();
  const includeAdult = contentMode === "adult";
  const adultFlag = getContentModeQueryParam(contentMode);
  const trackedSubmitKeyRef = useRef("");
  const initialHandledRef = useRef(false);

  const query = normalizeValue(
    searchParams.get("q") || searchParams.get("query") || initialQuery,
  );
  const type = normalizeValue(searchParams.get("type") || initialType);
  const format = normalizeValue(searchParams.get("format") || initialFormat);
  const status = normalizeValue(searchParams.get("status") || initialStatus);
  const genre = normalizeValue(searchParams.get("genre") || initialGenre);
  const sort = normalizeValue(searchParams.get("sort") || initialSort || "relevance");
  const page = Math.max(1, Number(searchParams.get("page") || initialPage || 1));

  const [draftQuery, setDraftQuery] = useState(query);
  const [results, setResults] = useState(() => sanitizeCatalog(initialResults, initialIncludeAdult));
  const [total, setTotal] = useState(Number(initialTotal || 0));
  const [catalog, setCatalog] = useState([]);
  const [keywords, setKeywords] = useState(() =>
    normalizeKeywordList(initialHotKeywords, initialIncludeAdult),
  );
  const [loading, setLoading] = useState(!initialReady);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState("");

  const searchPath = useMemo(() => {
    const params = searchParams.toString();
    return params ? `/search?${params}` : "/search";
  }, [searchParams]);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  const updateParams = useCallback(
    (updates, options = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        const normalized = normalizeValue(value);
        if (normalized) {
          params.set(key, normalized);
        } else {
          params.delete(key);
        }
      });
      if (options.resetPage !== false && !("page" in updates)) {
        params.delete("page");
      }
      router.replace(params.toString() ? `/search?${params.toString()}` : "/search");
    },
    [router, searchParams],
  );

  const trackSearchSubmit = useCallback(
    (nextQuery, nextType = type, nextGenre = genre, nextStatus = status, nextSort = sort) => {
      const eventName = includeAdult ? "adult_search_submit" : "search_submit";
      const submitKey = JSON.stringify({
        eventName,
        query: normalizeValue(nextQuery).toLowerCase(),
        type: normalizeValue(nextType).toLowerCase(),
        genre: normalizeValue(nextGenre).toLowerCase(),
        status: normalizeValue(nextStatus).toLowerCase(),
        sort: normalizeValue(nextSort).toLowerCase(),
      });

      if (trackedSubmitKeyRef.current === submitKey) {
        return;
      }

      trackedSubmitKeyRef.current = submitKey;
      trackEvent(eventName, {
        has_query: Boolean(normalizeValue(nextQuery)),
        query_length: normalizeValue(nextQuery).length || undefined,
        content_type: normalizeValue(nextType) || undefined,
        genre: normalizeValue(nextGenre) || undefined,
        status: normalizeValue(nextStatus) || undefined,
        sort: normalizeValue(nextSort) || undefined,
      });
    },
    [genre, includeAdult, sort, status, type],
  );

  const handleSearchSubmit = useCallback(
    (nextQuery) => {
      trackSearchSubmit(nextQuery);
      updateParams({ q: nextQuery }, { resetPage: true });
    },
    [trackSearchSubmit, updateParams],
  );

  useEffect(() => {
    let cancelled = false;
    const hasFilters = Boolean(query || type || format || status || genre);
    const canReuseInitial =
      !initialHandledRef.current &&
      initialReady &&
      initialIncludeAdult === includeAdult &&
      normalizeValue(initialQuery) === query &&
      normalizeValue(initialType) === type &&
      normalizeValue(initialFormat) === format &&
      normalizeValue(initialStatus) === status &&
      normalizeValue(initialGenre) === genre &&
      normalizeValue(initialSort || "relevance") === sort &&
      Number(initialPage || 1) === page;

    initialHandledRef.current = true;

    if (!hasFilters && !query) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (canReuseInitial) {
      setResults(sanitizeCatalog(initialResults, includeAdult));
      setTotal(Number(initialTotal || 0));
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      adult: adultFlag,
      pageSize: "48",
      page: String(page),
    });
    if (query) {
      params.set("q", query);
    }
    if (type) {
      params.set("type", type);
    } else if (format && format !== "interactive") {
      params.set("type", format);
    }
    if (status) {
      params.set("status", status);
    }
    if (genre) {
      params.set("genre", genre);
    }
    if (sort) {
      params.set("sort", sort);
    }

    apiGet(`/api/search?${params.toString()}`, { cacheMs: 0 })
      .then((response) => {
        if (cancelled) {
          return;
        }

        if (!response.ok) {
          if (response.error === "ADULT_GATED") {
            forceDisableAdultMode();
          }
          setResults([]);
          setTotal(0);
          setError("SEARCH_FAILED");
          setLoading(false);
          return;
        }

        setResults(sanitizeCatalog(response.data?.results, includeAdult));
        setTotal(Number(response.data?.total || 0));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setTotal(0);
          setError("SEARCH_FAILED");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    adultFlag,
    forceDisableAdultMode,
    format,
    genre,
    includeAdult,
    initialFormat,
    initialGenre,
    initialIncludeAdult,
    initialPage,
    initialQuery,
    initialReady,
    initialResults,
    initialSort,
    initialStatus,
    initialTotal,
    initialType,
    page,
    query,
    sort,
    status,
    type,
  ]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);

    Promise.all([
      apiGet(`/api/series?adult=${adultFlag}&pageSize=100`, { cacheMs: 30_000 }),
      apiGet(`/api/search/hot?adult=${adultFlag}&window=day`, { cacheMs: 60_000 }),
    ])
      .then(([catalogResponse, keywordsResponse]) => {
        if (cancelled) {
          return;
        }

        if (!catalogResponse.ok) {
          if (catalogResponse.error === "ADULT_GATED") {
            forceDisableAdultMode();
          }
          setCatalog([]);
        } else {
          setCatalog(sanitizeCatalog(catalogResponse.data?.series, includeAdult));
        }

        if (keywordsResponse.ok) {
          setKeywords(normalizeKeywordList(keywordsResponse.data?.keywords, includeAdult));
        }
        setCatalogLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
          setCatalogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adultFlag, forceDisableAdultMode, includeAdult]);

  const discoveryModel = useMemo(() => {
    const normalizedType = normalizeValue(type || format).toLowerCase();
    const filteredCatalog =
      normalizedType && normalizedType !== "interactive"
        ? catalog.filter((series) => normalizeType(series?.type) === normalizedType)
        : catalog;
    const recent = buildUpdatedRail(filteredCatalog, 12);
    const featured = pickFeaturedSeries(
      query || genre || status ? results : filteredCatalog,
    );
    const popularGenres = buildGenreShelves(filteredCatalog, {
      maxGenres: 6,
      perGenre: 6,
    }).map((entry) => entry.genre);

    return {
      featured,
      recent,
      popular: buildPopularRail(filteredCatalog, 10),
      trendingKeywords: keywords.slice(0, 8),
      moodTags: buildMoodTags(filteredCatalog),
      popularGenres,
    };
  }, [catalog, format, genre, keywords, query, results, status, type]);

  const formatCounts = useMemo(() => {
    return {
      comics: catalog.filter((series) => normalizeType(series?.type) === "comic").length,
      novels: catalog.filter((series) => normalizeType(series?.type) === "novel").length,
    };
  }, [catalog]);

  const hasSearchIntent = Boolean(query || type || format || status || genre);
  const activeFilterCount = [type || format, status, genre].filter(Boolean).length;
  const heroTitle = query ? `"${query}"` : "Browse by mood, genre, and format";

  return (
    <StorefrontPage accentClass="from-[rgba(103,232,249,0.12)] via-[rgba(255,79,154,0.08)] to-[rgba(255,255,255,0.04)]">
      <section className="rounded-[34px] border border-white/10 bg-[linear-gradient(140deg,rgba(16,12,22,0.98)_0%,rgba(13,11,18,0.95)_52%,rgba(18,14,24,0.98)_100%)] p-4 shadow-[var(--gush-shadow-floating)] sm:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div>
            <p className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
              Discovery
            </p>
            <h1 className="mt-4 max-w-[14ch] font-display text-[2.75rem] font-semibold leading-[0.92] tracking-[-0.03em] text-white sm:text-[3.9rem]">
              {heroTitle}
            </h1>
            <p className="mt-3 max-w-[42rem] text-[0.98rem] leading-7 text-white/68">
              Search stays fast, but the page now opens like a discovery floor with live covers, hot searches, and shelves worth tapping.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-4 shadow-[var(--gush-shadow-panel)]">
            <SearchPageInput
              initialQuery={draftQuery}
              includeAdult={includeAdult}
              persistedParams={{
                type,
                format,
                status,
                genre,
                sort,
              }}
              onQueryChange={setDraftQuery}
              onTrackSearch={(nextQuery) => trackSearchSubmit(nextQuery)}
              onSubmitSearch={handleSearchSubmit}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateParams({ sort: option.id }, { resetPage: true })}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${
                    sort === option.id
                      ? "border-white/16 bg-[rgba(255,79,154,0.16)] text-white"
                      : "border-white/10 bg-white/[0.04] text-white/70"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <DiscoveryFilterPill
            label={`Comics ${formatCounts.comics ? `(${formatCounts.comics})` : ""}`}
            href="/search?format=comic"
            active={normalizeValue(type || format).toLowerCase() === "comic"}
            icon={discoveryIcons.Library}
          />
          <DiscoveryFilterPill
            label={`Novels ${formatCounts.novels ? `(${formatCounts.novels})` : ""}`}
            href="/search?format=novel"
            active={normalizeValue(type || format).toLowerCase() === "novel"}
            icon={discoveryIcons.BookOpen}
          />
          <DiscoveryFilterPill
            label="Interactive"
            href="/interactive"
            active={normalizeValue(type || format).toLowerCase() === "interactive"}
            icon={discoveryIcons.Compass}
          />
          {activeFilterCount > 0 || query ? (
            <button
              type="button"
              onClick={() =>
                updateParams(
                  {
                    q: "",
                    type: "",
                    format: "",
                    status: "",
                    genre: "",
                    sort: "relevance",
                    page: "",
                  },
                  { resetPage: true },
                )
              }
              className="inline-flex min-h-[44px] items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/72"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      {!hasSearchIntent ? (
        <>
          {discoveryModel.featured ? (
            <StoryHero
              series={discoveryModel.featured}
              eyebrow="Discovery Pick"
              title={discoveryModel.featured.title}
              hook="Start from one strong cover, then branch into mood tags, genres, and fresh updates."
              primaryLabel="Start Reading"
              secondaryLabel="Open Series"
            />
          ) : null}

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Trending Searches"
              title="What readers are typing right now"
              description="Open a hot search instead of starting from zero."
            />
            <div className="flex flex-wrap gap-2.5">
              {discoveryModel.trendingKeywords.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSearchSubmit(item.value)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/78 transition-colors hover:bg-white/[0.08]"
                >
                  <Flame className="size-4 text-[var(--gush-gold)]" />
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Mood Tags"
              title="Start from the vibe, not the title"
              description="Mood-first entry points feel closer to a teen reading app than a utility dashboard."
            />
            <div className="flex flex-wrap gap-2.5">
              {discoveryModel.moodTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSearchSubmit(tag)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,79,154,0.08)] px-4 text-sm font-medium text-white/78"
                >
                  <Sparkles className="size-4 text-[var(--gush-rose)]" />
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Popular Genres"
              title="Open a genre shelf"
              description="A faster path into romance, fantasy, mystery, and everything adjacent."
            />
            <div className="flex flex-wrap gap-2.5">
              {discoveryModel.popularGenres.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?genre=${encodeURIComponent(tag)}`}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/72"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Recently Updated"
              title="The shelves moving right now"
              description="Recently updated series across comics and novels, surfaced as discovery instead of empty search."
            />
            {catalogLoading ? null : discoveryModel.recent.length > 0 ? (
              <UpdateList items={discoveryModel.recent.slice(0, 8)} sectionName="search_recently_updated" />
            ) : (
              <EmptyShelf
                title="No discovery shelves yet"
                description="When catalog data is available, trending discovery rails will show up here."
                actionHref="/"
              />
            )}
          </section>

          {discoveryModel.popular.length > 0 ? (
            <section className="space-y-4">
              <SectionHeading
                eyebrow="Formats"
                title="Popular picks across the catalog"
                description="A cover-first fallback when you just want something good fast."
              />
              <ShelfScroller>
                {discoveryModel.popular.map((series) => (
                  <CoverCard
                    key={series.id}
                    series={series}
                    href={buildSeriesHref(series, searchPath, "", "discovery_popular")}
                    variant={normalizeType(series?.type) === "novel" ? "novel" : "comic"}
                    actionLabel="Open title"
                  />
                ))}
              </ShelfScroller>
            </section>
          ) : null}
        </>
      ) : (
        <>
          {discoveryModel.featured ? (
            <StoryHero
              series={discoveryModel.featured}
              eyebrow="Best Match"
              title={discoveryModel.featured.title}
              hook={query ? `Best match for "${query}" plus adjacent reads in the same lane.` : undefined}
              primaryLabel="Open Series"
              primaryHref={buildSeriesHref(
                discoveryModel.featured,
                searchPath,
                query,
                "search_featured_match",
              )}
              secondaryLabel="Start Reading"
            />
          ) : null}

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Search Results"
              title={query ? `"${query}"` : "Filtered Titles"}
              description="Results stay visual, shelf-like, and easy to scan instead of collapsing into a bare results list."
            />
            {loading ? null : error ? (
              <EmptyShelf
                title="Search stalled out"
                description="The query could not be refreshed right now. Try again in a moment."
                actionHref="/search"
              />
            ) : results.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((series, index) => (
                  <CoverCard
                    key={series.id}
                    series={series}
                    href={buildSeriesHref(
                      series,
                      searchPath,
                      query,
                      query ? "search_result_grid" : "search_filtered_grid",
                    )}
                    variant={normalizeType(series?.type) === "novel" ? "novel" : "comic"}
                    badge={normalizeStatus(series?.status) === "completed" ? "Completed" : "Updated"}
                    actionLabel="View title"
                    onClick={() =>
                      trackEvent("search_result_click", {
                        seriesId: series.id,
                        entryPoint: "SEARCH_RESULTS",
                        campaignId: query ? "search_result_grid" : "search_filtered_grid",
                        query: query || undefined,
                        position: index + 1,
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyShelf
                title="Nothing landed this time"
                description="Try a broader mood tag, open a hot search, or drop the filter stack."
                actionHref="/search"
              />
            )}
            {total > results.length ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updateParams({ page: String(page + 1) }, { resetPage: false })}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/72"
                >
                  More results
                </button>
              </div>
            ) : null}
          </section>

          {discoveryModel.recent.length > 0 ? (
            <section className="space-y-4">
              <SectionHeading
                eyebrow="Recently Updated"
                title="Keep browsing after the first result"
                description="Discovery shelves stay visible so search does not feel like a dead-end utility tool."
              />
              <UpdateList items={discoveryModel.recent.slice(0, 6)} sectionName="search_post_results_recent" />
            </section>
          ) : null}
        </>
      )}
    </StorefrontPage>
  );
}
