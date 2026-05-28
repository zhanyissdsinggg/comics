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

const CURATED_TRENDING_SEARCHES = [
  "Enemies to lovers",
  "Magic school",
  "Vampire hunter",
  "Late-night mystery",
  "Quick romance",
  "Space signal",
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

function mergeTrendingKeywords(primary = [], includeAdult = false) {
  const seeded = normalizeKeywordList(
    CURATED_TRENDING_SEARCHES.map((label, index) => ({
      id: `curated-hot-${index}`,
      label,
      query: label,
    })),
    includeAdult,
  );
  const merged = [];
  const seen = new Set();

  [...seeded, ...normalizeKeywordList(primary, includeAdult)].forEach((item) => {
    const key = String(item?.label || "").trim().toLowerCase();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(item);
  });

  return merged;
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
    mergeTrendingKeywords(initialHotKeywords, initialIncludeAdult),
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
          setKeywords(mergeTrendingKeywords(keywordsResponse.data?.keywords, includeAdult));
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
  const heroTitle = query ? `"${query}"` : "Find your next read";

  return (
    <StorefrontPage accentClass="from-[rgba(103,232,249,0.12)] via-[rgba(255,79,154,0.08)] to-[rgba(255,255,255,0.04)]">
      <section className="rounded-[34px] border border-white/10 bg-[linear-gradient(140deg,rgba(16,12,22,0.98)_0%,rgba(13,11,18,0.95)_52%,rgba(18,14,24,0.98)_100%)] p-4 shadow-[var(--gush-shadow-floating)] sm:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div>
            <p className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
              Search Stories
            </p>
            <h1 className="mt-4 max-w-[15ch] font-display text-[2.75rem] font-semibold leading-[0.92] tracking-[-0.038em] text-white sm:text-[3.9rem] sm:tracking-[-0.042em]">
              {heroTitle}
            </h1>
            <p className="mt-3 max-w-[42rem] text-[0.98rem] leading-7 text-white/68">
              Find a story by mood, genre, format, or whatever you're craving tonight.
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
              eyebrow="Tonight's Pick"
              title={discoveryModel.featured.title}
              hook="Start with a vibe and see what fits."
              primaryLabel="Start Reading"
              secondaryLabel="View Series"
            />
          ) : null}

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Trending Searches"
              title="What everyone keeps searching"
              description="The titles and vibes readers keep looking up."
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
              title="Start with a vibe"
              description="Start with a vibe and see what fits."
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
              title="Browse by genre"
              description="Romance, fantasy, mystery, and more."
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
              title="Fresh updates right now"
              description="New chapters across comics and novels."
            />
            {catalogLoading ? null : discoveryModel.recent.length > 0 ? (
              <ShelfScroller>
                {discoveryModel.recent.slice(0, 6).map((series, index) => (
                  <CoverCard
                    key={series.id}
                    series={series}
                    href={buildSeriesHref(series, searchPath, "", "search_recently_updated")}
                    variant={normalizeType(series?.type) === "novel" ? "novel" : "comic"}
                    badge="Updated"
                    actionLabel="View Series"
                    onClick={() =>
                      trackEvent("story_click", {
                        seriesId: series?.id,
                        sourceSection: "search_recently_updated",
                        position: index + 1,
                      })
                    }
                  />
                ))}
              </ShelfScroller>
            ) : (
              <EmptyShelf
                title="Nothing fresh yet"
                description="Updated stories will show up here as soon as the next wave lands."
                actionHref="/"
              />
            )}
          </section>

          {discoveryModel.popular.length > 0 ? (
            <section className="space-y-4">
              <SectionHeading
                eyebrow="Formats"
                title="Choose a format"
                description="Comics, novels, or interactive stories."
              />
              <ShelfScroller>
                {discoveryModel.popular.map((series) => (
                  <CoverCard
                    key={series.id}
                    series={series}
                    href={buildSeriesHref(series, searchPath, "", "discovery_popular")}
                    variant={normalizeType(series?.type) === "novel" ? "novel" : "comic"}
                    actionLabel="View Series"
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
              hook={query ? `Best match for "${query}", plus a few more stories with the same pull.` : undefined}
              primaryLabel="Start Reading"
              primaryHref={buildSeriesHref(
                discoveryModel.featured,
                searchPath,
                query,
                "search_featured_match",
              )}
              secondaryLabel="View Series"
            />
          ) : null}

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Search Results"
              title={query ? `"${query}"` : "Filtered Titles"}
              description="The closest matches right now."
            />
            {loading ? null : error ? (
              <EmptyShelf
                title="Search stalled out"
                description="That search did not load right. Give it another shot in a second."
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
                    actionLabel="View Series"
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
                description="Try a broader vibe, open a hot search, or clear a few filters."
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
                title="Still looking?"
                description="Fresh updates if the first result misses."
              />
              <UpdateList items={discoveryModel.recent.slice(0, 6)} sectionName="search_post_results_recent" />
            </section>
          ) : null}
        </>
      )}
    </StorefrontPage>
  );
}
