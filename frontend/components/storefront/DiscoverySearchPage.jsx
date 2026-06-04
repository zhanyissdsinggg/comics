"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Sparkles } from "lucide-react";
import SearchPageInput from "../search/SearchPageInput";
import { apiGet } from "../../lib/apiClient";
import { getContentModeQueryParam, isAdultContent } from "../../lib/contentFilters";
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontAccentChipClass,
  storefrontBadgeClass,
  storefrontChipClass,
  storefrontInfoCardClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";
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
  buildGenreLabel,
  buildLatestInstallmentLabel,
  buildMoodTags,
  buildPopularRail,
  buildReadHref,
  buildUpdatedLabel,
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

const CURATED_RECENT_UPDATE_SERIES_IDS = [
  "series-004",
  "series-006",
  "series-011",
  "series-001",
  "series-010",
  "series-002",
];

const CURATED_RECENT_UPDATE_FALLBACKS = {
  "series-004": {
    id: "series-004",
    title: "Cherry Blossom High",
    type: "comic",
    status: "completed",
    genres: ["Romance", "Comedy"],
    coverUrl: "/mock-covers/series-004.jpg",
    latestEpisodeNumber: 5,
    latestEpisodeId: "series-004e5",
    firstReadableEpisodeId: "series-004e1",
    updatedAt: "2026-05-28T08:00:00.000Z",
  },
  "series-006": {
    id: "series-006",
    title: "Neon Nights",
    type: "novel",
    status: "ongoing",
    genres: ["Mystery", "Thriller"],
    coverUrl: "/mock-covers/series-006.jpg",
    latestEpisodeNumber: 3,
    latestEpisodeId: "series-006e3",
    firstReadableEpisodeId: "series-006e1",
    updatedAt: "2026-05-28T08:05:00.000Z",
  },
  "series-011": {
    id: "series-011",
    title: "Solar Wind",
    type: "novel",
    status: "ongoing",
    genres: ["Sci-Fi", "Adventure"],
    coverUrl: "/mock-covers/series-011.jpg",
    latestEpisodeNumber: 3,
    latestEpisodeId: "series-011e3",
    firstReadableEpisodeId: "series-011e1",
    updatedAt: "2026-05-28T08:10:00.000Z",
  },
  "series-001": {
    id: "series-001",
    title: "The Last Kingdom",
    type: "comic",
    status: "ongoing",
    genres: ["Action", "Fantasy"],
    coverUrl: "/mock-covers/series-001.jpg",
    latestEpisodeNumber: 3,
    latestEpisodeId: "series-001e3",
    firstReadableEpisodeId: "series-001e1",
    updatedAt: "2026-05-28T08:15:00.000Z",
  },
  "series-010": {
    id: "series-010",
    title: "Crimson Tide",
    type: "comic",
    status: "completed",
    genres: ["Horror", "Supernatural"],
    coverUrl: "/mock-covers/series-010.jpg",
    latestEpisodeNumber: 5,
    latestEpisodeId: "series-010e5",
    firstReadableEpisodeId: "series-010e1",
    updatedAt: "2026-05-28T08:20:00.000Z",
  },
  "series-002": {
    id: "series-002",
    title: "Moonlight Sonata",
    type: "comic",
    status: "ongoing",
    genres: ["Romance", "Drama"],
    coverUrl: "/mock-covers/series-002.jpg",
    latestEpisodeNumber: 3,
    latestEpisodeId: "series-002e3",
    firstReadableEpisodeId: "series-002e1",
    updatedAt: "2026-05-28T08:25:00.000Z",
  },
};

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
    return includeAdult ? isAdultContent(series) : !isAdultContent(series);
  });
}

function buildCuratedRecentUpdates(seriesList = [], limit = 6, includeAdult = false) {
  const allItems = Array.isArray(seriesList) ? seriesList : [];
  const byId = new Map(
    allItems.map((series) => [String(series?.id || "").trim(), series]),
  );
  const curated = CURATED_RECENT_UPDATE_SERIES_IDS.map(
    (id) =>
      byId.get(id) ||
      (includeAdult ? null : CURATED_RECENT_UPDATE_FALLBACKS[id]),
  ).filter(Boolean);
  const seen = new Set(curated.map((series) => String(series?.id || "").trim()));
  const fallback = buildUpdatedRail(allItems, 24).filter((series) => {
    const id = String(series?.id || "").trim();
    return id && !seen.has(id);
  });

  return [...curated, ...fallback].slice(0, limit);
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

function DiscoveryUpdateCard({
  series,
  index = 0,
  sectionName = "search_recently_updated",
}) {
  if (!series) {
    return null;
  }

  const normalizedType = normalizeType(series?.type) === "novel" ? "Novel" : "Comic";
  const latestInstallment = buildLatestInstallmentLabel(series);
  const genreLabel = buildGenreLabel(series, 2) || "Fresh update";
  const readHref = buildReadHref(series);

  return (
    <Link
      href={readHref}
      onClick={() =>
        trackEvent("story_click", {
          seriesId: series?.id,
          sourceSection: sectionName,
          position: index + 1,
        })
      }
      className={`group ${storefrontSoftCardClass} p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-white/16 hover:bg-[rgba(255,255,255,0.075)]`}
    >
      <article className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[calc(var(--gush-radius-lg)-4px)] border border-white/10">
          <img
            src={resolveDisplayImageUrl(series?.coverUrl, {
              kind: "cover",
              adult: series?.adult || series?.isAdult,
            })}
            alt=""
            aria-hidden="true"
            role="presentation"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48">
              {normalizedType}
            </p>
            <p className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-white/40">
              {buildUpdatedLabel(series)}
            </p>
          </div>
          <h3 className="mt-2 line-clamp-2 text-[1.05rem] font-semibold leading-[1] tracking-[-0.014em] text-white">
            {series.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/72">
            {latestInstallment}
          </p>
          <p className="mt-1 text-sm leading-6 text-white/58">
            {genreLabel}
          </p>
          <div className={`mt-4 ${storefrontSecondaryButtonClass} min-h-[44px] px-4 text-white/82`}>
            Start Reading
          </div>
        </div>
      </article>
    </Link>
  );
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
  initialCatalog = [],
  initialReady = false,
}) {
  const router = useRouter();
  const { contentMode, forceDisableAdultMode } = useAdultGateStore();
  const includeAdult = contentMode === "adult";
  const adultFlag = getContentModeQueryParam(contentMode);
  const trackedSubmitKeyRef = useRef("");

  const query = normalizeValue(initialQuery);
  const type = normalizeValue(initialType);
  const format = normalizeValue(initialFormat);
  const status = normalizeValue(initialStatus);
  const genre = normalizeValue(initialGenre);
  const sort = normalizeValue(initialSort || "relevance");
  const page = Math.max(1, Number(initialPage || 1));

  const [draftQuery, setDraftQuery] = useState(query);
  const [results, setResults] = useState(() => sanitizeCatalog(initialResults, initialIncludeAdult));
  const [total, setTotal] = useState(Number(initialTotal || 0));
  const [catalog, setCatalog] = useState(() =>
    sanitizeCatalog(initialCatalog, initialIncludeAdult),
  );
  const [keywords, setKeywords] = useState(() =>
    mergeTrendingKeywords(initialHotKeywords, initialIncludeAdult),
  );
  const [loading, setLoading] = useState(!initialReady);
  const [error, setError] = useState("");

  const currentParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    if (type) {
      params.set("type", type);
    }
    if (format) {
      params.set("format", format);
    }
    if (status) {
      params.set("status", status);
    }
    if (genre) {
      params.set("genre", genre);
    }
    if (sort && sort !== "relevance") {
      params.set("sort", sort);
    }
    if (page > 1) {
      params.set("page", String(page));
    }
    return params;
  }, [format, genre, page, query, sort, status, type]);

  const searchPath = useMemo(() => {
    const params = currentParams.toString();
    return params ? `/search?${params}` : "/search";
  }, [currentParams]);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    setResults(sanitizeCatalog(initialResults, includeAdult));
    setTotal(Number(initialTotal || 0));
    setLoading(!initialReady);
  }, [includeAdult, initialReady, initialResults, initialTotal]);

  useEffect(() => {
    setCatalog(sanitizeCatalog(initialCatalog, includeAdult));
  }, [includeAdult, initialCatalog]);

  useEffect(() => {
    setKeywords(mergeTrendingKeywords(initialHotKeywords, includeAdult));
  }, [includeAdult, initialHotKeywords]);

  const updateParams = useCallback(
    (updates, options = {}) => {
      const params = new URLSearchParams(currentParams.toString());
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
    [currentParams, router],
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
    if (!hasFilters && !query) {
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
    initialResults,
    initialTotal,
    page,
    query,
    sort,
    status,
    type,
  ]);

  useEffect(() => {
    let cancelled = false;

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
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
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
    const recent = buildCuratedRecentUpdates(filteredCatalog, 12, includeAdult);
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
  }, [catalog, format, genre, includeAdult, keywords, query, results, status, type]);

  const formatCounts = useMemo(() => {
    return {
      comics: catalog.filter((series) => normalizeType(series?.type) === "comic").length,
      novels: catalog.filter((series) => normalizeType(series?.type) === "novel").length,
    };
  }, [catalog]);

  const hasSearchIntent = Boolean(query || type || format || status || genre);
  const activeFilterCount = [type || format, status, genre].filter(Boolean).length;
  const heroTitle = query ? `"${query}"` : "Find your next read";
  const totalIndexedTitles = formatCounts.comics + formatCounts.novels;
  const heroInsights = [
    {
      label: "Catalog Mode",
      value: includeAdult ? "Adult only" : "Standard only",
      description: includeAdult
        ? "Search stays locked to 18+ stories in the active mode."
        : "Search stays locked to the normal catalog in the active mode.",
    },
    {
      label: "Indexed Titles",
      value: `${totalIndexedTitles}`,
      description:
        totalIndexedTitles > 0
          ? "Comics and novels already sitting in the searchable catalog."
          : "The searchable catalog is still warming up.",
    },
    {
      label: "Fresh Picks",
      value: `${discoveryModel.recent.length}`,
      description:
        discoveryModel.recent.length > 0
          ? "Recent updates ready to open without digging through filters."
          : "Fresh update cards appear here as releases land.",
    },
  ];

  return (
    <StorefrontPage accentClass="from-[rgba(103,232,249,0.12)] via-[rgba(255,79,154,0.08)] to-[rgba(255,255,255,0.04)]">
      <SurfacePanel
        tone="highlight"
        accent="cyan"
        appearance="dark"
        className="sm:p-6 lg:p-8"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div>
            <p className={storefrontBadgeClass}>
              Search Stories
            </p>
            <h1 className="mt-4 max-w-[15ch] font-display text-[2.75rem] font-semibold leading-[1] tracking-[-0.018em] text-white sm:text-[3.9rem] sm:tracking-[-0.02em]">
              {heroTitle}
            </h1>
            <p className="mt-3 max-w-[42rem] text-[0.98rem] leading-7 text-white/68">
              Find a story by mood, genre, format, or whatever you're craving tonight.
            </p>
          </div>

          <div className={`${storefrontInfoCardClass} p-4`}>
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
                  className={`${storefrontSecondaryButtonClass} min-h-[44px] px-4 ${
                    sort === option.id
                      ? "border-white/16 bg-[rgba(255,79,154,0.16)] text-white shadow-[0_18px_36px_rgba(255,79,154,0.18)]"
                      : "text-white/72"
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
              className={`${storefrontSecondaryButtonClass} min-h-[44px] px-4 text-white/72`}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {heroInsights.map((item) => (
            <div key={item.label} className={storefrontInfoCardClass}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                {item.label}
              </p>
              <p className="mt-2 font-display text-[1.3rem] font-semibold tracking-[-0.04em] text-white">
                {item.value}
              </p>
              <p className="mt-3 text-sm leading-[1.72] text-white/66">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </SurfacePanel>

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
                  className={storefrontChipClass}
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
                  className={storefrontAccentChipClass}
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
                  className={storefrontChipClass}
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
              description="Six fresh chapter and episode picks, ready to open now."
            />
            {discoveryModel.recent.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {discoveryModel.recent.slice(0, 6).map((series, index) => (
                  <DiscoveryUpdateCard
                    key={series.id}
                    series={series}
                    index={index}
                    sectionName="search_recently_updated"
                  />
                ))}
              </div>
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
                  className={`${storefrontSecondaryButtonClass} px-4 text-white/72`}
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {discoveryModel.recent.slice(0, 6).map((series, index) => (
                  <DiscoveryUpdateCard
                    key={series.id}
                    series={series}
                    index={index}
                    sectionName="search_post_results_recent"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </StorefrontPage>
  );
}
