"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import SiteHeader from "../layout/SiteHeader";
import Cover from "../common/Cover";
import Pill from "../common/Pill";
import SearchHistoryPanel from "./SearchHistoryPanel";
import AdvancedFilterPanel from "./AdvancedFilterPanel";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { useProgressStore } from "../../store/useProgressStore";
import { recommendRails } from "../../lib/reco/recommender";
import PortraitCard from "../home/PortraitCard";
import { track } from "../../lib/analytics";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { useAuthStore } from "../../store/useAuthStore";

const STATUS_OPTIONS = ["Ongoing", "Completed"];
const TYPE_OPTIONS = ["comic", "novel"];
const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "popular", label: "Popular" },
  { id: "rating", label: "Rating" },
  { id: "latest", label: "Latest" },
  { id: "completed", label: "Completed" },
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
      <mark className="rounded bg-amber-400/30 px-1 text-amber-200">
        {match}
      </mark>
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
  const { isAdultMode } = useAdultGateStore();
  const { behavior } = useBehaviorStore();
  const { bySeriesId: progressMap } = useProgressStore();
  const { isSignedIn } = useAuthStore();
  const [catalog, setCatalog] = useState([]);
  const [catalogResponse, setCatalogResponse] = useState(null);
  const recoImpressionRef = useRef(new Set());
  const resultsStale = useStaleNotice(resultsResponse);
  const catalogStale = useStaleNotice(catalogResponse);
  const { shouldRetry } = useRetryPolicy();

  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const genre = searchParams.get("genre") || "";
  const sort = searchParams.get("sort") || "relevance";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (genre) params.set("genre", genre);
    if (sort) params.set("sort", sort);
    params.set("adult", isAdultMode ? "1" : "0");
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [query, type, status, genre, sort, page, isAdultMode]);

  useEffect(() => {
    setLoading(true);
    setError("");
    apiGet(`/api/search?${queryString}`).then((response) => {
      setResultsResponse(response);
      if (!response.ok) {
        setError(response.error || "Search failed.");
      } else {
        setResults(response.data?.results || []);
        setTotal(response.data?.total || 0);
      }
      setLoading(false);
      if (!response.ok && (response.status === 0 || response.status >= 500)) {
        if (shouldRetry(`search_${queryString}`)) {
          setTimeout(() => {
            apiGet(`/api/search?${queryString}`, { bust: true }).then((retryResponse) => {
              setResultsResponse(retryResponse);
              if (retryResponse.ok) {
                setResults(retryResponse.data?.results || []);
                setTotal(retryResponse.data?.total || 0);
              }
            });
          }, 600);
        }
      }
    });
  }, [queryString, shouldRetry]);

  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/search/keywords?adult=${adultFlag}`).then((response) => {
      if (response.ok) {
        setKeywords(response.data?.keywords || []);
      }
    });
  }, [isAdultMode]);

  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`).then((response) => {
      if (response.ok) {
        setHotKeywords(response.data?.keywords || []);
      }
    });
  }, [isAdultMode, hotWindow]);

  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/series?adult=${adultFlag}`).then((response) => {
      setCatalogResponse(response);
      if (response.ok) {
        setCatalog(response.data?.series || []);
      } else if (response.status === 0 || response.status >= 500) {
        if (shouldRetry(`search_catalog_${adultFlag}`)) {
          setTimeout(() => {
            apiGet(`/api/series?adult=${adultFlag}`, { bust: true }).then((retryResponse) => {
              setCatalogResponse(retryResponse);
              if (retryResponse.ok) {
                setCatalog(retryResponse.data?.series || []);
              }
            });
          }, 600);
        }
      }
    });
  }, [isAdultMode, shouldRetry]);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const adultFlag = isAdultMode ? "1" : "0";
    const timer = setTimeout(() => {
      apiGet(`/api/search/suggest?q=${encodeURIComponent(query)}&adult=${adultFlag}`).then(
        (response) => {
          if (response.ok) {
            setSuggestions(response.data?.suggestions || []);
          }
        }
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isAdultMode]);

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
    [catalog, behavior, progressMap, isAdultMode]
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
        track("reco_impression", { railName: rail.title, seriesId: item.id });
      });
    });
  }, [recoRails]);

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

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "page") {
      params.set("page", "1");
    }
    router.replace(`/search?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Search</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Find titles by genre, status, and rating.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(true)}
            className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-emerald-500 hover:text-emerald-400"
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Advanced Filters</span>
          </button>
        </div>
        {resultsStale || catalogStale ? (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
            Showing cached data. Reconnect to refresh.
          </div>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-xs text-neutral-300">
            <p className="text-[10px] text-neutral-500">Suggestions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateParam("q", item)}
                  className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 老王注释：搜索历史和热门搜索 */}
        {!query && (keywords.length > 0 || hotKeywords.length > 0) ? (
          <SearchHistoryPanel
            onSearch={(keyword) => updateParam("q", keyword)}
            hotKeywords={hotKeywords}
          />
        ) : null}

        {recoRails.length > 0 && (!query || results.length === 0) ? (
          <div className="space-y-6">
            {recoRails.map((rail) => (
              <section key={rail.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{rail.title}</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {rail.items.map((item) => (
                    <PortraitCard
                      key={item.id}
                      item={item}
                      onClick={() => {
                        track("reco_click", { railName: rail.title, seriesId: item.id });
                        router.push(`/series/${item.id}`);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <select
            value={type}
            onChange={(event) => updateParam("type", event.target.value)}
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs"
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
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs"
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
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs"
          />
          <select
            value={sort}
            onChange={(event) => updateParam("sort", event.target.value)}
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-400">
            Searching...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
            {error}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-400">
            <p>No results.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {hotKeywords.slice(0, 6).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateParam("q", item)}
                  className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300"
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-200"
              >
                Browse popular
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((series) => (
                <button
                  key={series.id}
                  type="button"
                  onClick={() => router.push(`/series/${series.id}`)}
                  className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 text-left"
                >
                  <Cover tone={series.coverTone} coverUrl={series.coverUrl} className="h-40" />
                  <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        {highlight(series.title, query)}
                      </h3>
                      {series.badge ? <Pill>{series.badge}</Pill> : null}
                    </div>
                    <p className="text-xs text-neutral-400">
                      {series.type} · {series.status} · {series.rating}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[10px] text-neutral-400">
                      {(series.genres || []).slice(0, 3).map((item) => (
                        <span key={item} className="rounded-full border border-neutral-800 px-2 py-0.5">
                          {highlight(item, query)}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {total > PAGE_SIZE ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
                <span>
                  Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateParam("page", String(page - 1))}
                    disabled={page <= 1}
                    className="rounded-full border border-neutral-800 px-3 py-1 text-xs disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => updateParam("page", String(page + 1))}
                    disabled={page >= Math.ceil(total / PAGE_SIZE)}
                    className="rounded-full border border-neutral-800 px-3 py-1 text-xs disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* 老王注释：高级筛选面板 */}
      <AdvancedFilterPanel
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(filters) => {
          // 老王注释：应用筛选条件
          if (filters.types.length > 0) {
            updateParam("type", filters.types.join(","));
          }
          if (filters.status && filters.status !== "all") {
            updateParam("status", filters.status);
          }
          if (filters.sortBy) {
            updateParam("sort", filters.sortBy);
          }
          if (filters.author) {
            updateParam("author", filters.author);
          }
          if (filters.tags.length > 0) {
            updateParam("genre", filters.tags.join(","));
          }
        }}
        initialFilters={{
          types: type ? type.split(",") : [],
          tags: genre ? genre.split(",") : [],
          status: status || "all",
          sortBy: sort || "popular",
          author: searchParams.get("author") || "",
        }}
      />
    </main>
  );
}
