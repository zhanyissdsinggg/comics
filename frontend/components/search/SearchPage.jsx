"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import Cover from "../common/Cover";
import Pill from "../common/Pill";
import { SkeletonCard } from "../common/Skeleton";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import { apiGet, apiPost } from "../../lib/apiClient";
import { parallelRequests2 } from "../../lib/parallelRequests";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { useProgressStore } from "../../store/useProgressStore";
import { recommendRails } from "../../lib/reco/recommender";
import { trackEvent } from "../../lib/trackEvent";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { useAuthStore } from "../../store/useAuthStore";

const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
});

const SearchHistoryPanel = dynamic(() => import("./SearchHistoryPanel"));
const AdvancedFilterPanel = dynamic(() => import("./AdvancedFilterPanel"), {
  ssr: false,
});
const PortraitCard = dynamic(() => import("../home/PortraitCard"));

const STATUS_OPTIONS = ["Ongoing", "Completed"];
const TYPE_OPTIONS = ["comic", "novel"];
const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "popular", label: "Popular" },
  { id: "rating", label: "Rating" },
  { id: "latest", label: "Latest" },
  { id: "alphabetical", label: "A-Z" },
];

const HISTORY_KEY = "mn_search_history";
const PAGE_SIZE = 12;

function highlight(text, query) {
  if (!query) {
    return text;
  }

  const lowerText = String(text);
  const lowerQuery = String(query).toLowerCase();
  const index = lowerText.toLowerCase().indexOf(lowerQuery);
  if (index < 0) {
    return text;
  }

  const before = lowerText.slice(0, index);
  const match = lowerText.slice(index, index + lowerQuery.length);
  const after = lowerText.slice(index + lowerQuery.length);

  return (
    <>
      {before}
      <mark className="rounded bg-amber-400/30 px-1 text-amber-200">{match}</mark>
      {after}
    </>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState([]);
  const [resultsResponse, setResultsResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [hotKeywords, setHotKeywords] = useState([]);
  const [hotWindow, setHotWindow] = useState("day");
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const { behavior } = useBehaviorStore();
  const { bySeriesId: progressMap } = useProgressStore();
  const { isSignedIn } = useAuthStore();
  const [catalog, setCatalog] = useState([]);
  const [catalogResponse, setCatalogResponse] = useState(null);
  const recoImpressionRef = useRef(new Set());
  const resultsRequestRef = useRef(0);
  const surfaceRequestRef = useRef(0);
  const catalogRequestRef = useRef(0);
  const suggestRequestRef = useRef(0);
  const resultsStale = useStaleNotice(resultsResponse);
  const catalogStale = useStaleNotice(catalogResponse);
  const { shouldRetry } = useRetryPolicy();

  const query = searchParams.get("q") || searchParams.get("query") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const genre = searchParams.get("genre") || "";
  const sort = searchParams.get("sort") || "relevance";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const adultFlag = isAdultMode ? "1" : "0";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (genre) params.set("genre", genre);
    if (sort) params.set("sort", sort);
    params.set("adult", adultFlag);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [adultFlag, genre, page, query, sort, status, type]);

  const shouldLoadRecoCatalog = !query || (!loading && results.length === 0);

  useEffect(() => {
    const requestId = resultsRequestRef.current + 1;
    resultsRequestRef.current = requestId;
    setLoading(true);
    setError("");
    let retryTimer = null;

    const isCurrentRequest = () => resultsRequestRef.current === requestId;
    const applyResponse = (response) => {
      if (!isCurrentRequest()) {
        return false;
      }

      setResultsResponse(response);
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
        return true;
      }

      setError("");
      setResults(response.data?.results || []);
      setTotal(response.data?.total || 0);
      return true;
    };

    apiGet(`/api/search?${queryString}`).then((response) => {
      if (!applyResponse(response)) {
        return;
      }

      if (isCurrentRequest()) {
        setLoading(false);
      }

      if (response.ok && response.stale) {
        apiGet(`/api/search?${queryString}`, {
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          applyResponse(freshResponse);
        });
        return;
      }

      if (!response.ok && (response.status === 0 || response.status >= 500)) {
        if (shouldRetry(`search_${queryString}`)) {
          retryTimer = setTimeout(() => {
            apiGet(`/api/search?${queryString}`, { bust: true }).then((retryResponse) => {
              applyResponse(retryResponse);
            });
          }, 600);
        }
      }
    });

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [forceDisableAdultMode, queryString, shouldRetry]);

  useEffect(() => {
    const requestId = surfaceRequestRef.current + 1;
    surfaceRequestRef.current = requestId;
    const isCurrentRequest = () => surfaceRequestRef.current === requestId;
    const loadKeywords = !query;

    const applyKeywords = (response) => {
      if (!isCurrentRequest()) {
        return false;
      }
      if (response.ok) {
        setKeywords(response.data?.keywords || []);
        return true;
      }
      if (response.error === "ADULT_GATED") {
        forceDisableAdultMode();
        setKeywords([]);
      }
      return false;
    };

    const applyHotKeywords = (response) => {
      if (!isCurrentRequest()) {
        return false;
      }
      if (response.ok) {
        setHotKeywords(response.data?.keywords || []);
        return true;
      }
      if (response.error === "ADULT_GATED") {
        forceDisableAdultMode();
        setHotKeywords([]);
      }
      return false;
    };

    if (!loadKeywords) {
      setKeywords([]);
      apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`, {
        cacheMs: 60000,
      }).then((response) => {
        if (!applyHotKeywords(response)) {
          return;
        }
        if (response.stale) {
          apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`, {
            cacheMs: 60000,
            bust: true,
            dedupeMs: 0,
          }).then((freshResponse) => {
            applyHotKeywords(freshResponse);
          });
        }
      });
      return;
    }

    parallelRequests2(
      () => apiGet(`/api/search/keywords?adult=${adultFlag}`, { cacheMs: 300000 }),
      () => apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`, { cacheMs: 60000 }),
    ).then(([keywordsResponse, hotKeywordsResponse]) => {
      applyKeywords(keywordsResponse);
      applyHotKeywords(hotKeywordsResponse);

      if (keywordsResponse.ok && keywordsResponse.stale) {
        apiGet(`/api/search/keywords?adult=${adultFlag}`, {
          cacheMs: 300000,
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          applyKeywords(freshResponse);
        });
      }

      if (hotKeywordsResponse.ok && hotKeywordsResponse.stale) {
        apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`, {
          cacheMs: 60000,
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          applyHotKeywords(freshResponse);
        });
      }
    });
  }, [adultFlag, forceDisableAdultMode, hotWindow, query]);

  useEffect(() => {
    const requestId = catalogRequestRef.current + 1;
    catalogRequestRef.current = requestId;
    if (!shouldLoadRecoCatalog) {
      return;
    }

    let retryTimer = null;
    const isCurrentRequest = () => catalogRequestRef.current === requestId;
    const applyCatalog = (response) => {
      if (!isCurrentRequest()) {
        return false;
      }

      setCatalogResponse(response);
      if (response.ok) {
        setCatalog(response.data?.series || []);
        return true;
      }

      if (response.error === "ADULT_GATED") {
        forceDisableAdultMode();
        setCatalog([]);
      }
      return false;
    };

    apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }).then((response) => {
      if (!applyCatalog(response)) {
        if (!response.ok && (response.status === 0 || response.status >= 500)) {
          if (shouldRetry(`search_catalog_${adultFlag}`)) {
            retryTimer = setTimeout(() => {
              apiGet(`/api/series?adult=${adultFlag}`, { bust: true }).then((retryResponse) => {
                applyCatalog(retryResponse);
              });
            }, 600);
          }
        }
        return;
      }

      if (response.stale) {
        apiGet(`/api/series?adult=${adultFlag}`, {
          cacheMs: 30000,
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          applyCatalog(freshResponse);
        });
      }
    });

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [adultFlag, forceDisableAdultMode, shouldRetry, shouldLoadRecoCatalog]);

  useEffect(() => {
    const requestId = suggestRequestRef.current + 1;
    suggestRequestRef.current = requestId;
    if (!query) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      apiGet(`/api/search/suggest?q=${encodeURIComponent(query)}&adult=${adultFlag}`, {
        cacheMs: 30000,
      }).then(
        (response) => {
          if (suggestRequestRef.current !== requestId) {
            return;
          }
          if (response.ok) {
            setSuggestions(response.data?.suggestions || []);
          } else if (response.error === "ADULT_GATED") {
            forceDisableAdultMode();
            setSuggestions([]);
          }
        },
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [adultFlag, forceDisableAdultMode, query]);

  useEffect(() => {
    if (!query) {
      return;
    }

    const timer = setTimeout(() => {
      if (isSignedIn) {
        apiPost("/api/search/log", { query });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query, isSignedIn]);

  const reco = useMemo(
    () => recommendRails(catalog, behavior, progressMap, { isAdultMode }),
    [catalog, behavior, progressMap, isAdultMode],
  );

  const recoRails = useMemo(() => {
    const list = [];
    if (reco.becauseYouReadRail.length > 0) {
      list.push({
        id: "because",
        title: reco.becauseYouReadTitle || "Because you read",
        items: reco.becauseYouReadRail,
      });
    }
    if (reco.trendingRail.length > 0) {
      list.push({ id: "trending", title: "Trending", items: reco.trendingRail });
    }
    return list;
  }, [reco.becauseYouReadRail, reco.becauseYouReadTitle, reco.trendingRail]);

  useEffect(() => {
    recoRails.forEach((rail) => {
      rail.items.forEach((item) => {
        const key = `${rail.id}-${item.id}`;
        if (recoImpressionRef.current.has(key)) {
          return;
        }
        recoImpressionRef.current.add(key);
        trackEvent("reco_impression", { railName: rail.title, seriesId: item.id });
      });
    });
  }, [recoRails]);

  const handleSeriesClick = useCallback(
    (seriesId) => {
      router.push(`/series/${seriesId}`);
    },
    [router],
  );

  useEffect(() => {
    if (!query) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(HISTORY_KEY);
    const list = stored ? stored.split("|").filter(Boolean) : [];
    const next = [query, ...list.filter((item) => item !== query)].slice(0, 8);
    window.localStorage.setItem(HISTORY_KEY, next.join("|"));
    setHistory(next);
  }, [query]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(HISTORY_KEY);
    if (stored) {
      setHistory(stored.split("|").filter(Boolean));
    }
  }, []);

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
      router.replace(`/search?${params.toString()}`);
    },
    [router, searchParams],
  );

  const updateParam = useCallback(
    (key, value) => {
      updateParams({ [key]: value }, { resetPage: key !== "page" });
    },
    [updateParams],
  );

  const activeFilterCount = [type, status, genre, sort !== "relevance" ? sort : ""]
    .filter(Boolean)
    .length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const heroTitle = query ? `Results for "${query}"` : "Search the catalog with intent.";
  const heroDescription = query
    ? "Refine the current match set by type, status, genre, and ranking without losing your place in the catalog."
    : "Move from trending terms to a focused result grid with recommendation rails, remembered searches, and filter-first browsing.";
  const heroSecondary = query
    ? loading
      ? "Refreshing live matches from the current storefront."
      : `${total.toLocaleString()} result${total === 1 ? "" : "s"} available for the current query.`
    : "Use the header search or the shortcut surfaces below to jump straight into a series page.";
  const heroStats = useMemo(
    () => [
      {
        label: query ? "Matches" : "Catalog",
        value: loading ? "--" : total.toLocaleString(),
        hint: query ? "Results in the current query set" : "Searchable titles right now",
      },
      {
        label: "Filters",
        value: String(activeFilterCount),
        hint: activeFilterCount > 0 ? "Type, status, genre, and sort are active" : "Broad storefront browse",
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+" : "Standard",
        hint: isAdultMode ? "Age-gated catalog visible" : "Standard storefront only",
      },
      {
        label: "History",
        value: history.length ? history.length.toLocaleString() : (hotKeywords.length || keywords.length).toLocaleString(),
        hint: history.length ? "Recent searches remembered locally" : "Trending entry points ready",
      },
    ],
    [activeFilterCount, history.length, hotKeywords.length, isAdultMode, keywords.length, loading, query, total],
  );
  const shouldShowReco = recoRails.length > 0 && (!query || results.length === 0);
  const shouldShowSearchTools = suggestions.length > 0 || (!query && (keywords.length > 0 || hotKeywords.length > 0));

  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Search desk"
          title={heroTitle}
          description={heroDescription}
          secondary={heroSecondary}
          stats={heroStats}
          actions={
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-neutral-100 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/10"
            >
              <SlidersHorizontal size={16} />
              <span>Advanced Filters</span>
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-neutral-950">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          }
        />

        {resultsStale || catalogStale ? (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            Showing cached data. Reconnect to refresh live search surfaces.
          </div>
        ) : null}

        {shouldShowSearchTools ? (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            {suggestions.length > 0 ? (
              <SurfacePanel className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                    Smart suggestions
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                    Tighten the query before you dive deeper.
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => updateParam("q", item)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </SurfacePanel>
            ) : null}

            {!query && (keywords.length > 0 || hotKeywords.length > 0) ? (
              <div className={suggestions.length > 0 ? "" : "xl:col-span-2"}>
                <SearchHistoryPanel
                  onSearch={(keyword) => updateParam("q", keyword)}
                  hotKeywords={hotKeywords}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {shouldShowReco ? (
          <SurfacePanel className="space-y-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                  Discovery rails
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Editorial shelves stay live even when search is quiet.
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHotWindow("day")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    hotWindow === "day"
                      ? "border-white bg-white text-neutral-950"
                      : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setHotWindow("week")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    hotWindow === "week"
                      ? "border-white bg-white text-neutral-950"
                      : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  This Week
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {recoRails.map((rail) => (
                <section key={rail.id} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Recommended rail</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{rail.title}</h3>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {rail.items.map((item) => (
                      <PortraitCard
                        key={item.id}
                        item={item}
                        onClick={() => {
                          trackEvent("reco_click", { railName: rail.title, seriesId: item.id });
                          router.push(`/series/${item.id}`);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </SurfacePanel>
        ) : null}

        <SurfacePanel className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                Live filters
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Refine the current search lane.
              </h2>
            </div>
            <p className="text-sm text-neutral-400">
              {loading ? "Refreshing titles..." : `Page ${page} of ${totalPages}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={type}
              onChange={(event) => updateParam("type", event.target.value)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-neutral-100 outline-none transition-colors focus:border-emerald-400/40"
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => updateParam("status", event.target.value)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-neutral-100 outline-none transition-colors focus:border-emerald-400/40"
            >
              <option value="">All status</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={genre}
              onChange={(event) => updateParam("genre", event.target.value)}
              placeholder="Genre"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-neutral-100 outline-none transition-colors placeholder:text-neutral-500 focus:border-emerald-400/40"
            />
            <select
              value={sort}
              onChange={(event) => updateParam("sort", event.target.value)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-neutral-100 outline-none transition-colors focus:border-emerald-400/40"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </SurfacePanel>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : error ? (
          <SurfacePanel className="border-red-500/40 bg-red-500/10 text-red-100">
            <p className="text-lg font-semibold">{error}</p>
            <p className="mt-2 text-sm text-red-200/80">Please check your connection and try again.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full border border-red-400/60 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-100 transition-colors hover:bg-red-500/30"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
              >
                Go Home
              </button>
            </div>
          </SurfacePanel>
        ) : results.length === 0 ? (
          <SurfacePanel className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                No direct matches
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                The catalog did not return a clean hit.
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Try a broader keyword, switch sort order, or jump into one of the active trending terms below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {hotKeywords.slice(0, 6).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateParam("q", item)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/15"
              >
                Browse popular
              </button>
            </div>
          </SurfacePanel>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                  Live result grid
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white">
                  {total.toLocaleString()} titles in the current lane.
                </h2>
              </div>
              <p className="text-sm text-neutral-400">
                Sorted by {SORT_OPTIONS.find((option) => option.id === sort)?.label || "Relevance"}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((series) => (
                <button
                  key={series.id}
                  type="button"
                  onClick={() => handleSeriesClick(series.id)}
                  className="group rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 text-left shadow-[0_20px_80px_rgba(0,0,0,0.16)] transition-transform duration-300 hover:-translate-y-1 hover:border-white/20"
                >
                  <Cover tone={series.coverTone} coverUrl={series.coverUrl} className="h-44 rounded-[20px]" />
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold tracking-tight text-white">
                        {highlight(series.title, query)}
                      </h3>
                      {series.badge ? <Pill>{series.badge}</Pill> : null}
                    </div>
                    <p className="text-sm text-neutral-400">
                      {series.type} | {series.status} | {series.rating}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-300">
                      {(series.genres || []).slice(0, 3).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1"
                        >
                          {highlight(item, query)}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {total > PAGE_SIZE ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-400">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateParam("page", String(page - 1))}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => updateParam("page", String(page + 1))}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <AdvancedFilterPanel
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(filters) => {
          updateParams(
            {
              type: filters.types.join(","),
              status: filters.status && filters.status !== "all" ? filters.status : "",
              sort: filters.sortBy || "relevance",
              genre: filters.tags.join(","),
            },
            { resetPage: true },
          );
        }}
        initialFilters={{
          types: type ? type.split(",") : [],
          tags: genre ? genre.split(",") : [],
          status: status || "all",
          sortBy: sort || "relevance",
        }}
      />
    </main>
  );
}
