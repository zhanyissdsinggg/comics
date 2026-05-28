"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import SurfacePanel from "../common/SurfacePanel";
import SkeletonCard from "../common/SkeletonCard";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import SearchPageInput from "./SearchPageInput";
import { apiGet } from "../../lib/apiClient";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";
import {
  getContentModeQueryParam,
  isAdultContent,
} from "../../lib/contentFilters";
import { isMatureGenreValue } from "../../lib/matureContent";

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "popular", label: "Popular This Week" },
  { id: "latest", label: "Latest" },
  { id: "alphabetical", label: "A-Z" },
];

const PAGE_SIZE = 12;
const DEFAULT_SHELF_SIZE = 4;
const VALID_SORT_IDS = new Set(SORT_OPTIONS.map((option) => option.id));

function normalizeSortParam(value) {
  return VALID_SORT_IDS.has(value) ? value : "relevance";
}

function normalizeValue(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeValue(value).toLowerCase();
}

function buildTrackedSearchSubmitKey({
  eventName,
  query,
  type,
  genre,
  status,
  sort,
}) {
  return JSON.stringify({
    eventName,
    query: normalizeLower(query),
    type: normalizeLower(type),
    genre: normalizeLower(genre),
    status: normalizeLower(status),
    sort: normalizeSortParam(normalizeValue(sort) || "relevance"),
  });
}

function normalizeFilterType(type, format) {
  const normalizedType = normalizeLower(type);
  if (normalizedType) {
    return normalizedType;
  }

  const normalizedFormat = normalizeLower(format);
  if (normalizedFormat === "comic" || normalizedFormat === "novel") {
    return normalizedFormat;
  }
  if (normalizedFormat === "interactive") {
    return "interactive";
  }

  return "";
}

function shouldHideKeyword(value, includeMature) {
  if (includeMature) {
    return false;
  }

  const normalized = normalizeLower(value);
  return (
    normalized === "adult" ||
    normalized === "18+" ||
    normalized === "18 plus" ||
    isMatureGenreValue(normalized)
  );
}

function normalizeKeywordList(items, includeMature) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      if (typeof item === "string") {
        const value = normalizeValue(item);
        return value
          ? { id: `keyword-${index}-${value}`, label: value, value }
          : null;
      }

      const label = normalizeValue(
        item?.keyword ||
          item?.term ||
          item?.label ||
          item?.name ||
          item?.query ||
          item?.title,
      );
      if (!label) {
        return null;
      }

      return {
        id: String(item?.id || `keyword-${index}-${label}`),
        label,
        value: normalizeValue(item?.query || label),
      };
    })
    .filter(
      (item) =>
        item &&
        !shouldHideKeyword(item.label, includeMature) &&
        !shouldHideKeyword(item.value, includeMature),
    );
}

function sanitizeSeriesList(items, includeMature) {
  return (Array.isArray(items) ? items : []).filter((series) => {
    if (!series || typeof series !== "object") {
      return false;
    }

    return includeMature ? true : !isAdultContent(series);
  });
}

function sortSeries(items, sort) {
  const list = [...items];
  if (sort === "alphabetical") {
    return list.sort((left, right) =>
      String(left?.title || "").localeCompare(String(right?.title || "")),
    );
  }

  if (sort === "latest") {
    return list.sort(
      (left, right) =>
        (Date.parse(right?.updatedAt || "") || 0) -
        (Date.parse(left?.updatedAt || "") || 0),
    );
  }

  if (sort === "popular") {
    return list.sort((left, right) => {
      const rightScore =
        Number(right?.views || 0) +
        Number(right?.followers || 0) +
        Number(right?.ratingCount || 0) +
        Number(right?.episodeCount || 0);
      const leftScore =
        Number(left?.views || 0) +
        Number(left?.followers || 0) +
        Number(left?.ratingCount || 0) +
        Number(left?.episodeCount || 0);
      return rightScore - leftScore;
    });
  }

  return list;
}

function buildSlotMap(homepageSlots) {
  return new Map(
    (Array.isArray(homepageSlots) ? homepageSlots : [])
      .map((slot) => [
        normalizeLower(slot?.slot || slot?.name || slot?.id),
        Array.isArray(slot?.seriesIds)
          ? slot.seriesIds.map((value) => String(value || "").trim()).filter(Boolean)
          : [],
      ])
      .filter(([key]) => Boolean(key)),
  );
}

function buildMerchandisingSnapshot(catalog, homepageSlots, includeMature) {
  const visibleCatalog = sanitizeSeriesList(catalog, includeMature);
  const byId = new Map(
    visibleCatalog.map((series) => [String(series?.id || "").trim(), series]),
  );
  const slots = buildSlotMap(homepageSlots);
  const pickSlotSeries = (slotId) =>
    (slots.get(slotId) || []).map((seriesId) => byId.get(seriesId)).find(Boolean) || null;

  const recent = sortSeries(visibleCatalog, "latest");
  const completed = recent.filter(
    (series) => normalizeLower(series?.status) === "completed",
  );
  const startHere = recent.filter((series) => Number(series?.episodeCount || 0) > 0);

  return {
    breakoutPick: pickSlotSeries("home-breakout") || recent[0] || null,
    completedPick: pickSlotSeries("home-binge-ready") || completed[0] || null,
    freeStartPick: pickSlotSeries("home-free-start") || startHere[0] || null,
  };
}

function buildDefaultShelves(catalog, includeMature) {
  const visibleCatalog = sanitizeSeriesList(catalog, includeMature);
  const trending = sortSeries(visibleCatalog, "latest").slice(0, DEFAULT_SHELF_SIZE);
  const usedIds = new Set(trending.map((series) => String(series?.id || "")));
  const updates = sortSeries(
    visibleCatalog.filter((series) => !usedIds.has(String(series?.id || ""))),
    "latest",
  ).slice(0, DEFAULT_SHELF_SIZE);
  updates.forEach((series) => usedIds.add(String(series?.id || "")));
  const completed = sortSeries(
    visibleCatalog.filter(
      (series) =>
        normalizeLower(series?.status) === "completed" &&
        !usedIds.has(String(series?.id || "")),
    ),
    "popular",
  ).slice(0, DEFAULT_SHELF_SIZE);

  return { trending, updates, completed };
}

function buildSearchCoverAltText(series) {
  const type = normalizeValue(series?.type);
  const prefix = type ? `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}` : "Series";
  return `${prefix} cover image for ${normalizeValue(series?.title) || "Untitled"}`;
}

function formatSearchSeriesMeta(series) {
  return [normalizeValue(series?.type) || "Series", normalizeValue(series?.status) || "Ongoing"]
    .filter(Boolean)
    .join(" / ");
}

function getSearchSeriesBadge(series) {
  if (normalizeLower(series?.status) === "completed") {
    return "Finished";
  }

  const updatedAt = Date.parse(series?.updatedAt || "");
  if (!Number.isNaN(updatedAt) && updatedAt >= Date.now() - 14 * 24 * 60 * 60 * 1000) {
    return "Updated";
  }

  if (Number(series?.episodeCount || 0) > 0 && Number(series?.episodeCount || 0) <= 12) {
    return "Top Pick";
  }

  return "";
}

function summarizeSearchDescription(series) {
  const description = normalizeValue(
    series?.shortDescription || series?.summary || series?.synopsis || series?.description,
  );
  if (description) {
    return description;
  }

  if (normalizeLower(series?.status) === "completed") {
    return "Finished series.";
  }

  const episodeCount = Number(series?.episodeCount || 0);
  if (episodeCount > 0) {
    return `${episodeCount} episodes ready.`;
  }

  return "A catalog pick worth checking next.";
}

function SearchSectionHeader({ eyebrow, title, description = "", actions = null }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-[42rem]">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/54">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 font-display text-[2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[2.6rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-[34rem] text-sm leading-7 text-white/68">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

function SearchResultCard({ series, href, onClick }) {
  const badge = getSearchSeriesBadge(series);

  return (
    <Link
      href={href}
      onClick={onClick}
      className="group block overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(17,13,24,0.98)_100%)] p-5 text-left shadow-[0_20px_50px_rgba(8,6,20,0.28)] transition-all duration-200 hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_26px_58px_rgba(8,6,20,0.34)]"
      aria-label={`View ${series.title}`}
    >
      <div className="grid gap-5 sm:grid-cols-[132px_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_42%),linear-gradient(180deg,rgba(255,79,154,0.16),rgba(8,7,14,0.88))] shadow-[0_16px_38px_rgba(8,6,20,0.24)]">
          <div role="img" aria-label={buildSearchCoverAltText(series)} className="flex aspect-[3/4] w-full flex-col justify-between p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                {normalizeValue(series?.type) || "Series"}
              </span>
              {badge ? (
                <span className="rounded-full border border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.18)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                  {badge}
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">
                {Array.isArray(series?.genres) && series.genres.length > 0
                  ? series.genres.slice(0, 2).join(" / ")
                  : "Catalog Pick"}
              </p>
              <p className="line-clamp-3 text-lg font-semibold leading-tight text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.42)]">
                {series.title}
              </p>
            </div>
          </div>
        </div>
        <div className="min-w-0 space-y-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/48">
            {normalizeValue(series?.type) || "Series"}
          </p>
          <h3 className="font-display text-[1.32rem] font-semibold leading-tight tracking-[-0.04em] text-white">
            {series.title}
          </h3>
          <p className="text-sm text-white/62">{formatSearchSeriesMeta(series)}</p>
          <p className="line-clamp-2 text-sm leading-6 text-white/66">
            {summarizeSearchDescription(series)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SearchShelf({ testId, title, description, items, buildHref, onClick }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div data-testid={testId}>
      <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
        <div>
          <h2 className="font-display text-[1.75rem] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-white/66">{description}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((series, index) => (
            <SearchResultCard
              key={series.id}
              series={series}
              href={buildHref(series)}
              onClick={() => onClick(series, index)}
            />
          ))}
        </div>
      </SurfacePanel>
    </div>
  );
}

export default function SearchPage({
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
  const includeMature = contentMode === "adult";
  const adultFlag = getContentModeQueryParam(contentMode);

  const initialQueryText = normalizeValue(initialQuery);
  const initialTypeText = normalizeValue(initialType);
  const initialFormatText = normalizeValue(initialFormat);
  const initialStatusText = normalizeValue(initialStatus);
  const initialGenreText = normalizeValue(initialGenre);
  const initialSortText = normalizeSortParam(normalizeValue(initialSort));
  const initialPageNumber = Math.max(1, Number(initialPage || 1));

  const query = searchParams.get("q") || searchParams.get("query") || initialQueryText;
  const rawType = searchParams.get("type") || initialTypeText;
  const rawFormat = searchParams.get("format") || initialFormatText;
  const normalizedType = normalizeFilterType(rawType, rawFormat);
  const normalizedFormat = normalizeLower(rawFormat);
  const status = searchParams.get("status") || initialStatusText;
  const genre = searchParams.get("genre") || initialGenreText;
  const sort = normalizeSortParam(
    searchParams.get("sort") || initialSortText || "relevance",
  );
  const page = Math.max(
    1,
    Number(searchParams.get("page") || initialPageNumber || 1),
  );

  const [results, setResults] = useState(() =>
    sanitizeSeriesList(initialResults, initialIncludeAdult),
  );
  const [total, setTotal] = useState(Number(initialTotal || 0));
  const [loading, setLoading] = useState(!initialReady);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [homepageSlots, setHomepageSlots] = useState([]);
  const [keywords, setKeywords] = useState(() =>
    normalizeKeywordList(initialHotKeywords, initialIncludeAdult),
  );
  const [draftQuery, setDraftQuery] = useState(query);
  const initialRequestKeyRef = useRef({
    query: initialQueryText,
    type: normalizeFilterType(initialTypeText, initialFormatText),
    format: normalizeLower(initialFormatText),
    status: initialStatusText,
    genre: initialGenreText,
    sort: initialSortText,
    page: initialPageNumber,
    includeAdult: initialIncludeAdult,
  });
  const hydratedInitialSearchRef = useRef(false);
  const trackedSubmitKeyRef = useRef("");

  const searchPath = useMemo(() => {
    const params = searchParams.toString();
    return params ? `/search?${params}` : "/search";
  }, [searchParams]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    if (normalizedType) {
      params.set("type", normalizedType);
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
    params.set("adult", adultFlag);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [adultFlag, genre, normalizedType, page, query, sort, status]);

  const updateParams = useCallback(
    (updates, options = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        const nextValue = typeof value === "string" ? value.trim() : value;
        if (nextValue) {
          params.set(key, String(nextValue));
        } else {
          params.delete(key);
        }
      });
      if (options.resetPage !== false && !("page" in updates)) {
        params.set("page", "1");
      }
      router.replace(params.toString() ? `/search?${params.toString()}` : "/search");
    },
    [router, searchParams],
  );

  const updateParam = useCallback(
    (key, value) => {
      updateParams({ [key]: value }, { resetPage: key !== "page" });
    },
    [updateParams],
  );

  const trackSearchSubmit = useCallback(
    ({
      query: nextQuery,
      type = normalizedType,
      genre: nextGenre = genre,
      status: nextStatus = status,
      sort: nextSort = sort,
    }) => {
      const normalizedQuery = normalizeValue(nextQuery);
      const normalizedTypeValue = normalizeValue(type);
      const normalizedGenreValue = normalizeValue(nextGenre);
      const normalizedStatusValue = normalizeValue(nextStatus);
      const normalizedSortValue = normalizeSortParam(
        normalizeValue(nextSort) || "relevance",
      );
      const eventName = includeMature
        ? "adult_search_submit"
        : "search_submit";
      const submitKey = buildTrackedSearchSubmitKey({
        eventName,
        query: normalizedQuery,
        type: normalizedTypeValue,
        genre: normalizedGenreValue,
        status: normalizedStatusValue,
        sort: normalizedSortValue,
      });

      if (trackedSubmitKeyRef.current === submitKey) {
        return;
      }

      if (
        !normalizedQuery &&
        !normalizedTypeValue &&
        !normalizedGenreValue &&
        !normalizedStatusValue &&
        normalizedSortValue === "relevance"
      ) {
        return;
      }

      trackedSubmitKeyRef.current = submitKey;
      trackEvent(eventName, {
        has_query: Boolean(normalizedQuery),
        query_length: normalizedQuery.length || undefined,
        content_type: normalizedTypeValue || undefined,
        genre: normalizedGenreValue || undefined,
        status: normalizedStatusValue || undefined,
        sort: normalizedSortValue,
      });
    },
    [genre, includeMature, normalizedType, sort, status],
  );

  const handleSearchSubmit = useCallback(
    (nextQuery) => {
      const trimmed = normalizeValue(nextQuery);
      trackSearchSubmit({
        query: trimmed,
      });
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
        params.delete("query");
      }
      params.delete("page");
      router.replace(params.toString() ? `/search?${params.toString()}` : "/search");
    },
    [router, searchParams, trackSearchSubmit],
  );

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    if (draftQuery === query) {
      return;
    }

    const timer = setTimeout(() => {
      handleSearchSubmit(draftQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [draftQuery, handleSearchSubmit, query]);

  useEffect(() => {
    trackSearchSubmit({
      query,
      type: normalizedType,
      genre,
      status,
      sort,
    });
  }, [genre, normalizedType, query, sort, status, trackSearchSubmit]);

  useEffect(() => {
    const shouldReuseInitialPayload =
      !hydratedInitialSearchRef.current &&
      initialReady &&
      query === initialRequestKeyRef.current.query &&
      normalizedType === initialRequestKeyRef.current.type &&
      normalizedFormat === initialRequestKeyRef.current.format &&
      status === initialRequestKeyRef.current.status &&
      genre === initialRequestKeyRef.current.genre &&
      sort === initialRequestKeyRef.current.sort &&
      page === initialRequestKeyRef.current.page &&
      includeMature === initialRequestKeyRef.current.includeAdult;

    hydratedInitialSearchRef.current = true;

    if (shouldReuseInitialPayload) {
      setLoading(false);
      setError("");
      setResults(sanitizeSeriesList(initialResults, includeMature));
      setTotal(Number(initialTotal || 0));
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiGet(`/api/search?${queryString}`).then((response) => {
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        if (response.error === "ADULT_GATED") {
          forceDisableAdultMode();
          setResults([]);
          setTotal(0);
          setError("");
        } else {
          setResults([]);
          setTotal(0);
          setError(response.error || "Search failed.");
        }
        setLoading(false);
        return;
      }

      setResults(sanitizeSeriesList(response.data?.results, includeMature));
      setTotal(Number(response.data?.total || 0));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    forceDisableAdultMode,
    genre,
    includeMature,
    initialReady,
    initialResults,
    initialTotal,
    normalizedFormat,
    normalizedType,
    page,
    query,
    queryString,
    sort,
    status,
  ]);

  useEffect(() => {
    let cancelled = false;

    apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30_000 }).then((response) => {
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        if (response.error === "ADULT_GATED") {
          forceDisableAdultMode();
        }
        setCatalog([]);
        return;
      }

      setCatalog(sanitizeSeriesList(response.data?.series, includeMature));
    });

    apiGet(`/api/recommendations/homepage?adult=${adultFlag}`, {
      cacheMs: 60_000,
    }).then((response) => {
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setHomepageSlots([]);
        return;
      }

      setHomepageSlots(Array.isArray(response.data?.slots) ? response.data.slots : []);
    });

    return () => {
      cancelled = true;
    };
  }, [adultFlag, forceDisableAdultMode, includeMature]);

  useEffect(() => {
    if (query) {
      return;
    }

    let cancelled = false;
    apiGet(`/api/search/hot?adult=${adultFlag}&window=day`, {
      cacheMs: 60_000,
    }).then((response) => {
      if (cancelled || !response.ok) {
        return;
      }

      setKeywords(normalizeKeywordList(response.data?.keywords, includeMature));
    });

    return () => {
      cancelled = true;
    };
  }, [adultFlag, includeMature, query]);

  const filteredResults = useMemo(() => {
    const normalizedGenre = normalizeLower(genre);
    const normalizedStatus = normalizeLower(status);

    return sortSeries(
      results.filter((series) => {
        const matchesType =
          !normalizedType ||
          normalizedType === "all" ||
          normalizeLower(series?.type) === normalizedType;

        const seriesStatus = normalizeLower(series?.status);
        const matchesStatus =
          !normalizedStatus ||
          normalizedStatus === "all" ||
          seriesStatus === normalizedStatus ||
          (normalizedStatus === "ongoing" && seriesStatus !== "completed");

        const matchesGenre =
          !normalizedGenre ||
          (normalizedGenre === "mature"
            ? includeMature && Boolean(series?.adult)
            : Array.isArray(series?.genres) &&
              series.genres.some((item) => normalizeLower(item) === normalizedGenre));

        return matchesType && matchesStatus && matchesGenre;
      }),
      sort,
    );
  }, [genre, includeMature, normalizedType, results, sort, status]);

  const defaultShelves = useMemo(
    () => buildDefaultShelves(catalog, includeMature),
    [catalog, includeMature],
  );

  const merchandisingSnapshot = useMemo(
    () => buildMerchandisingSnapshot(catalog, homepageSlots, includeMature),
    [catalog, homepageSlots, includeMature],
  );

  const totalPages = Math.max(1, Math.ceil(Math.max(total, filteredResults.length) / PAGE_SIZE));
  const activeFilterCount = [
    normalizedType,
    status,
    genre,
    sort !== "relevance" ? sort : "",
  ].filter(Boolean).length;
  const showResults = Boolean(query || normalizedType || status || genre);

  const buildSeriesHref = useCallback(
    (series, entryPoint, campaignId) =>
      buildPathWithAttribution(`/series/${series.id}`, {
        entryPoint,
        campaignId,
        sourcePath: searchPath,
        sourceSeriesId: series.id,
        returnTo: `/series/${series.id}`,
      }),
    [searchPath],
  );

  const handleSeriesClick = useCallback(
    (series, entryPoint, campaignId) => {
      trackEvent("search_result_click", {
        seriesId: series.id,
        entryPoint,
        campaignId,
        query: query || undefined,
      });
    },
    [query],
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--gush-bg)] text-white">
      <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        <SurfacePanel
          className="space-y-6 border-0 bg-transparent px-0 py-0 shadow-none"
          tone="highlight"
          accent="cyan"
          appearance="dark"
        >
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60 shadow-[0_12px_28px_rgba(8,6,20,0.18)]">
                Search
              </p>
            </div>
            <h1 className="mt-5 max-w-4xl font-display text-[2.75rem] font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-[3.5rem]">
              Find your next obsession
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68 sm:text-[0.98rem]">
              Search by mood, genre, format, or creator.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[rgba(8,7,14,0.42)] p-4 shadow-[0_20px_50px_rgba(8,6,20,0.28)] backdrop-blur-xl sm:p-5">
            <SearchPageInput
              initialQuery={draftQuery}
              includeAdult={includeMature}
              persistedParams={{
                type: normalizedType || "",
                format: normalizedFormat || "",
                status: status || "",
                genre: genre || "",
                sort: sort || "",
              }}
              onQueryChange={setDraftQuery}
              onTrackSearch={(nextQuery) =>
                trackSearchSubmit({
                  query: nextQuery,
                })
              }
              onSubmitSearch={handleSearchSubmit}
            />

            {!query && keywords.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {keywords.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateParam("q", item.value)}
                    className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm font-semibold tracking-[0.01em] text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </SurfacePanel>

        {showResults ? (
          <>
            <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
              <SearchSectionHeader
                eyebrow="Results"
                title={query ? `"${query}"` : "Browse"}
                description="Best matches across stories, formats, and creator shelves."
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => updateParams({}, { resetPage: true })}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-4 text-sm font-semibold tracking-[0.01em] text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      <RefreshCw size={16} />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextType = normalizedType === "novel" ? "comic" : "novel";
                        updateParams(
                          {
                            type: nextType,
                            format: nextType,
                          },
                          { resetPage: true },
                        );
                      }}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-4 text-sm font-semibold tracking-[0.01em] text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      <SlidersHorizontal size={16} />
                      <span>{normalizedType === "novel" ? "Comics" : "Novels"}</span>
                    </button>
                    {activeFilterCount > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateParams(
                            {
                              q: query || "",
                              type: "",
                              format: "",
                              status: "",
                              genre: "",
                              sort: "relevance",
                            },
                            { resetPage: true },
                          )
                        }
                        className={storefrontSecondaryButtonClass}
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </>
                }
              />
            </SurfacePanel>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-[30px]"
                  >
                    <SkeletonCard appearance="light" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <SurfacePanel className="space-y-4" appearance="dark" accent="cyan">
                <h2 className="font-display text-[2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                  Search is down right now.
                </h2>
                <p className="text-sm leading-6 text-white/66">
                  Try again in a moment or head back home.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.refresh()}
                    className={storefrontSecondaryButtonClass}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className={storefrontSecondaryButtonClass}
                  >
                    Back home
                  </button>
                </div>
              </SurfacePanel>
            ) : filteredResults.length === 0 ? (
              <SurfacePanel className="space-y-4" appearance="dark" accent="cyan">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/52">
                    No results
                  </p>
                  <h2 className="mt-2 font-display text-[2.2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                    Nothing matched that search.
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {merchandisingSnapshot.breakoutPick ? (
                    <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
                      <h3 className="font-display text-[1.2rem] font-semibold tracking-[-0.03em] text-white">
                        {`${merchandisingSnapshot.breakoutPick.title}.`}
                      </h3>
                    </div>
                  ) : null}
                  {merchandisingSnapshot.completedPick ? (
                    <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
                      <h3 className="font-display text-[1.2rem] font-semibold tracking-[-0.03em] text-white">
                        {`${merchandisingSnapshot.completedPick.title}.`}
                      </h3>
                    </div>
                  ) : null}
                  {merchandisingSnapshot.freeStartPick ? (
                    <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
                      <h3 className="font-display text-[1.2rem] font-semibold tracking-[-0.03em] text-white">
                        {`Start with ${merchandisingSnapshot.freeStartPick.title}.`}
                      </h3>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {merchandisingSnapshot.breakoutPick ? (
                    <Link
                      href={buildSeriesHref(
                        merchandisingSnapshot.breakoutPick,
                        "SEARCH_ZERO_RESULTS",
                        "search_zero_breakout",
                      )}
                      className={storefrontSecondaryButtonClass}
                    >
                      View title
                    </Link>
                  ) : null}
                  {merchandisingSnapshot.completedPick ? (
                    <Link
                      href={buildSeriesHref(
                        merchandisingSnapshot.completedPick,
                        "SEARCH_ZERO_RESULTS",
                        "search_zero_completed",
                      )}
                      className={storefrontSecondaryButtonClass}
                    >
                      {merchandisingSnapshot.completedPick.title}
                    </Link>
                  ) : null}
                  {merchandisingSnapshot.freeStartPick ? (
                    <Link
                      href={buildSeriesHref(
                        merchandisingSnapshot.freeStartPick,
                        "SEARCH_ZERO_RESULTS",
                        "search_zero_free_start",
                      )}
                      className={storefrontPrimaryButtonClass}
                    >
                      Start reading
                    </Link>
                  ) : null}
                </div>
              </SurfacePanel>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  {filteredResults.map((series) => (
                    <SearchResultCard
                      key={series.id}
                      series={series}
                      href={buildSeriesHref(
                        series,
                        "SEARCH_RESULTS",
                        query ? "search_result_grid" : "catalog_grid",
                      )}
                      onClick={() =>
                        handleSeriesClick(
                          series,
                          "SEARCH_RESULTS",
                          query ? "search_result_grid" : "catalog_grid",
                        )
                      }
                    />
                  ))}
                </div>

                {Math.max(total, filteredResults.length) > PAGE_SIZE ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white shadow-[0_16px_38px_rgba(8,6,20,0.22)]">
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateParam("page", String(page - 1))}
                        disabled={page <= 1}
                        aria-label="Previous page"
                        className={`${storefrontSecondaryButtonClass} h-10 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => updateParam("page", String(page + 1))}
                        disabled={page >= totalPages}
                        aria-label="Next page"
                        className={`${storefrontSecondaryButtonClass} h-10 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        Next page
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <SearchShelf
              testId="search-default-trending"
              title="Hot this week"
              description="The stories readers are opening right now."
              items={defaultShelves.trending}
              buildHref={(series) =>
                buildSeriesHref(series, "SEARCH_DEFAULT_TRENDING", "search_default_trending")
              }
              onClick={(series) =>
                handleSeriesClick(
                  series,
                  "SEARCH_DEFAULT_TRENDING",
                  "search_default_trending",
                )
              }
            />
            <SearchShelf
              testId="search-default-updates"
              title="Fresh drops"
              description="Recently updated titles without repeating the whole trending shelf."
              items={defaultShelves.updates}
              buildHref={(series) =>
                buildSeriesHref(series, "SEARCH_DEFAULT_UPDATES", "search_default_updates")
              }
              onClick={(series) =>
                handleSeriesClick(
                  series,
                  "SEARCH_DEFAULT_UPDATES",
                  "search_default_updates",
                )
              }
            />
            <SearchShelf
              testId="search-default-completed"
              title="Binge this weekend"
              description="Completed reads when you want payoff without waiting."
              items={defaultShelves.completed}
              buildHref={(series) =>
                buildSeriesHref(series, "SEARCH_DEFAULT_COMPLETED", "search_default_completed")
              }
              onClick={(series) =>
                handleSeriesClick(
                  series,
                  "SEARCH_DEFAULT_COMPLETED",
                  "search_default_completed",
                )
              }
            />
            <SearchShelf
              testId="search-rail-trending"
              title="Hot this week"
              description="A compact trending rail for the public discovery flow."
              items={defaultShelves.trending}
              buildHref={(series) =>
                buildSeriesHref(series, "SEARCH_RAIL_TRENDING", "search_rail_trending")
              }
              onClick={(series) =>
                handleSeriesClick(
                  series,
                  "SEARCH_RAIL_TRENDING",
                  "search_rail_trending",
                )
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}
