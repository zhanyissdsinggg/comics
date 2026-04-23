"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import Cover from "../common/Cover";
import { SkeletonCard } from "../common/Skeleton";
import SearchBar from "../common/SearchBar";
import SurfacePanel from "../common/SurfacePanel";
import SiteHeader from "../layout/SiteHeader";
import { apiGet, apiPost } from "../../lib/apiClient";
import { parallelRequests2 } from "../../lib/parallelRequests";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { useProgressStore } from "../../store/useProgressStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { getHomeEditorialSnapshot } from "../../lib/homeMerchandising";
import { recommendRails } from "../../lib/reco/recommender";
import { trackEvent } from "../../lib/trackEvent";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { useAuthStore } from "../../store/useAuthStore";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import {
  readSearchHistory,
  saveSearchHistoryItem,
  subscribeSearchHistory,
} from "../../lib/searchHistory";

const SearchHistoryPanel = dynamic(() => import("./SearchHistoryPanel"));
const AdvancedFilterPanel = dynamic(() => import("./AdvancedFilterPanel"), {
  ssr: false,
});
const NetworkFallback = dynamic(() => import("../common/NetworkFallback"), {
  ssr: false,
});
const SearchCreatorMatchesPanel = dynamic(
  () => import("./SearchCreatorMatchesPanel"),
  {
    ssr: false,
  },
);
const PortraitCard = dynamic(() => import("../home/PortraitCard"));
const CommerceSuccessBanner = dynamic(
  () => import("../common/CommerceSuccessBanner"),
);
const StorefrontEventHub = dynamic(
  () => import("../common/StorefrontEventHub"),
);
const StorefrontPathwaysGrid = dynamic(
  () => import("../common/StorefrontPathwaysGrid"),
);

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "popular", label: "Popular" },
  { id: "latest", label: "Latest" },
  { id: "alphabetical", label: "A-Z" },
];

const PAGE_SIZE = 12;
const MAX_HISTORY_ITEMS = 8;
const VALID_SORT_IDS = new Set(SORT_OPTIONS.map((option) => option.id));

function normalizeSortParam(value) {
  return VALID_SORT_IDS.has(value) ? value : "relevance";
}

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
      <mark className="rounded border border-black bg-[#ffe500] px-1 text-black">
        {match}
      </mark>
      {after}
    </>
  );
}

function normalizeKeywordItem(item, index = 0) {
  if (typeof item === "string") {
    const value = item.trim();
    if (!value) {
      return null;
    }
    return {
      id: `keyword-${index}-${value}`,
      label: value,
      value,
      hint: "",
      badge: "",
      rank: index + 1,
    };
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const labelSource =
    item.keyword ||
    item.term ||
    item.label ||
    item.name ||
    item.query ||
    item.title ||
    "";
  const label = String(labelSource).trim();
  if (!label) {
    return null;
  }

  const hintSource =
    item.hint || item.context || item.genre || item.category || item.type || "";
  const badgeSource =
    item.badge ||
    item.trendLabel ||
    item.momentum ||
    item.deltaLabel ||
    (item.rank ? `#${item.rank}` : "");

  return {
    id: String(item.id || `keyword-${index}-${label}`),
    label,
    value: String(item.query || label).trim(),
    hint: typeof hintSource === "string" ? hintSource : "",
    badge: typeof badgeSource === "string" ? badgeSource : "",
    rank: Number(item.rank) || index + 1,
  };
}

function normalizeKeywordList(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => normalizeKeywordItem(item, index))
    .filter(Boolean);
}

function formatSearchSeriesMeta(series) {
  return [series?.type || "Series", series?.status || "Ongoing"]
    .filter(Boolean)
    .join(" / ");
}

function summarizeSearchDescription(series) {
  const description = String(series?.description || "")
    .replace(/\s+/g, " ")
    .trim();
  if (description) {
    return description.length > 96
      ? `${description.slice(0, 93).trimEnd()}...`
      : description;
  }

  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed series ready for a full-session read.";
  }

  if (Number(series?.episodeCount || 0) > 0) {
    const episodeCount = Number(series.episodeCount || 0);
    return `${episodeCount} episode${episodeCount === 1 ? "" : "s"} currently listed.`;
  }

  return "Open the title page to see the latest chapters and creator credits.";
}

function getSearchSeriesBadge(series) {
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Completed";
  }

  const updatedAt = Date.parse(series?.updatedAt || "");
  if (
    !Number.isNaN(updatedAt) &&
    updatedAt >= Date.now() - 14 * 24 * 60 * 60 * 1000
  ) {
    return "Updated";
  }

  if (
    Number(series?.episodeCount || 0) > 0 &&
    Number(series?.episodeCount || 0) <= 12
  ) {
    return "First picks";
  }

  return "";
}

function SearchSectionHeader({
  eyebrow,
  title,
  description = "",
  meta = "",
  actions = null,
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-[42rem]">
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-[2.15rem] font-black uppercase leading-[0.94] tracking-[-0.05em] text-black sm:text-[2.8rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-[34rem] text-sm font-semibold leading-7 text-black/68">
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {meta ? (
          <span className="border-[3px] border-black bg-white px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            {meta}
          </span>
        ) : null}
        {actions}
      </div>
    </div>
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
  const [commerceNotice, setCommerceNotice] = useState(null);
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const { behavior } = useBehaviorStore();
  const { bySeriesId: progressMap } = useProgressStore();
  const { isSignedIn } = useAuthStore();
  const [catalog, setCatalog] = useState([]);
  const [catalogResponse, setCatalogResponse] = useState(null);
  const [homepageSlots, setHomepageSlots] = useState([]);
  const [homepageSlotsResponse, setHomepageSlotsResponse] = useState(null);
  const [retrySearchTick, setRetrySearchTick] = useState(0);
  const recoImpressionRef = useRef(new Set());
  const resultsRequestRef = useRef(0);
  const surfaceRequestRef = useRef(0);
  const catalogRequestRef = useRef(0);
  const suggestRequestRef = useRef(0);
  const resultsStale = useStaleNotice(resultsResponse);
  const catalogStale = useStaleNotice(catalogResponse);
  const homepageSlotsStale = useStaleNotice(homepageSlotsResponse);
  const { shouldRetry } = useRetryPolicy();

  const query = searchParams.get("q") || searchParams.get("query") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const genre = searchParams.get("genre") || "";
  const sort = normalizeSortParam(searchParams.get("sort") || "relevance");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const adultFlag = isAdultMode ? "1" : "0";
  const searchPath = useMemo(() => {
    const params = searchParams.toString();
    return params ? `/search?${params}` : "/search";
  }, [searchParams]);

  useEffect(() => {
    setCommerceNotice(
      getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/search")),
    );
  }, []);

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

  const retrySearch = useCallback(() => {
    setRetrySearchTick((current) => current + 1);
  }, []);

  const shouldLoadRecoCatalog = true;

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
            apiGet(`/api/search?${queryString}`, { bust: true }).then(
              (retryResponse) => {
                applyResponse(retryResponse);
              },
            );
          }, 600);
        }
      }
    });

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [forceDisableAdultMode, queryString, retrySearchTick, shouldRetry]);

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
        setKeywords(normalizeKeywordList(response.data?.keywords));
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
        setHotKeywords(normalizeKeywordList(response.data?.keywords));
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
      () =>
        apiGet(`/api/search/keywords?adult=${adultFlag}`, { cacheMs: 300000 }),
      () =>
        apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`, {
          cacheMs: 60000,
        }),
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

    const applyHomepageSlots = (response) => {
      if (!isCurrentRequest()) {
        return false;
      }

      setHomepageSlotsResponse(response);
      if (response.ok) {
        setHomepageSlots(response.data?.slots || []);
        return true;
      }

      if (response.error === "ADULT_GATED") {
        forceDisableAdultMode();
        setHomepageSlots([]);
        return false;
      }

      setHomepageSlots([]);
      return false;
    };

    parallelRequests2(
      () => apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }),
      () =>
        apiGet(`/api/recommendations/homepage?adult=${adultFlag}`, {
          cacheMs: 60000,
        }),
    ).then(([catalogResponse, homepageSlotsResponse]) => {
      if (!applyCatalog(catalogResponse)) {
        if (
          !catalogResponse.ok &&
          (catalogResponse.status === 0 || catalogResponse.status >= 500)
        ) {
          if (shouldRetry(`search_catalog_${adultFlag}`)) {
            retryTimer = setTimeout(() => {
              apiGet(`/api/series?adult=${adultFlag}`, { bust: true }).then(
                (retryResponse) => {
                  applyCatalog(retryResponse);
                },
              );
            }, 600);
          }
        }
      }

      if (catalogResponse.ok && catalogResponse.stale) {
        apiGet(`/api/series?adult=${adultFlag}`, {
          cacheMs: 30000,
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          applyCatalog(freshResponse);
        });
      }

      applyHomepageSlots(homepageSlotsResponse);
      if (homepageSlotsResponse.ok && homepageSlotsResponse.stale) {
        apiGet(`/api/recommendations/homepage?adult=${adultFlag}`, {
          cacheMs: 60000,
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          applyHomepageSlots(freshResponse);
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
      apiGet(
        `/api/search/suggest?q=${encodeURIComponent(query)}&adult=${adultFlag}`,
        {
          cacheMs: 30000,
        },
      ).then((response) => {
        if (suggestRequestRef.current !== requestId) {
          return;
        }
        if (response.ok) {
          setSuggestions(response.data?.suggestions || []);
        } else if (response.error === "ADULT_GATED") {
          forceDisableAdultMode();
          setSuggestions([]);
        }
      });
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

  useEffect(() => {
    setHistory(readSearchHistory({ limit: MAX_HISTORY_ITEMS }));
    return subscribeSearchHistory(setHistory, { limit: MAX_HISTORY_ITEMS });
  }, []);

  const reco = useMemo(
    () => recommendRails(catalog, behavior, progressMap, { isAdultMode }),
    [catalog, behavior, progressMap, isAdultMode],
  );
  const editorialSnapshot = useMemo(
    () => getHomeEditorialSnapshot(catalog, { homepageSlots }),
    [catalog, homepageSlots],
  );
  const freeStartPick = editorialSnapshot.freeStartPick;
  const completedPick = editorialSnapshot.completedPick;
  const breakoutPick = editorialSnapshot.breakoutPick;

  const recoRails = useMemo(() => {
    const list = [];
    if (reco.becauseYouReadRail.length > 0) {
      list.push({
        id: "because",
        title: reco.becauseYouReadTitle || "Based on your reading",
        items: reco.becauseYouReadRail,
      });
    }
    if (reco.trendingRail.length > 0) {
      list.push({
        id: "trending",
        title: "Popular now",
        items: reco.trendingRail,
      });
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
        trackEvent("reco_impression", {
          railName: rail.title,
          seriesId: item.id,
        });
      });
    });
  }, [recoRails]);

  const handleSeriesClick = useCallback(
    (
      seriesId,
      entryPoint = "SEARCH_RESULTS",
      campaignId = query ? "search_result_grid" : "catalog_grid",
    ) => {
      const targetPath = `/series/${seriesId}`;
      trackEvent("search_result_click", {
        seriesId,
        entryPoint,
        campaignId,
        query: query || undefined,
      });
      router.push(
        buildPathWithAttribution(targetPath, {
          entryPoint,
          campaignId,
          sourcePath: searchPath,
          sourceSeriesId: seriesId,
          returnTo: targetPath,
        }),
      );
    },
    [query, router, searchPath],
  );

  useEffect(() => {
    if (!query) {
      return;
    }

    setHistory(saveSearchHistoryItem(query, { limit: MAX_HISTORY_ITEMS }));
  }, [query]);

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

  const activeFilterCount = [
    type,
    status,
    genre,
    sort !== "relevance" ? sort : "",
  ].filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasSparseResults =
    Boolean(query) && !loading && results.length > 0 && results.length < 4;
  const showResultSections = Boolean(query);
  const heroTitle = query ? `Results for "${query}"` : "Search the catalog";
  const heroDescription = query
    ? loading
      ? "Updating."
      : `${total.toLocaleString()} match${total === 1 ? "" : "es"}.`
    : "";
  const heroSecondary = "";
  const loadingResultLabel = "Updating";
  const mastheadLeadKeyword = hotKeywords[0] || keywords[0] || null;
  const recoPanelTitle = !query
    ? "Popular now."
    : results.length === 0
      ? "Try these next."
      : "Browse next.";
  const lightCardAccentClass =
    "border-[3px] border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-[#fff6c7] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]";
  const lightFeatureAccentClass =
    "border-[3px] border-black bg-[#ffe500] shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:bg-[#fff07a] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]";
  const secondaryButtonClass =
    "border-[3px] border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#f5f1ea] hover:shadow-none";
  const accentButtonClass =
    "border-[3px] border-black bg-[#ff007a] px-4 py-2 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e1006d] hover:shadow-none";
  const filterSelectClass =
    "border-[3px] border-black bg-white px-4 py-2 text-sm font-bold uppercase tracking-[0.04em] text-black outline-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all focus:ring-4 focus:ring-black/10";
  const editorialBrowsePaths = useMemo(() => {
    const leadHotKeyword = hotKeywords[0] || keywords[0] || null;
    const leadHotLabel = leadHotKeyword?.label || "Romance";
    const leadHotValue = leadHotKeyword?.value || leadHotLabel;
    const startHereEpisodeCount = Number(freeStartPick?.episodeCount || 0);

    return [
      freeStartPick
        ? {
            id: "free-unlock-slot",
            eyebrow: "First picks",
            title: `Start with ${freeStartPick.title}.`,
            description:
              startHereEpisodeCount > 0
                ? `${startHereEpisodeCount} episode${startHereEpisodeCount === 1 ? "" : "s"} live.`
                : "",
            ctaLabel: `Open ${freeStartPick.title}`,
            onClick: () =>
              handleSeriesClick(
                freeStartPick.id,
                "SEARCH_PATH_FREE_START",
                "search_path_free_start",
              ),
            accentClass: lightFeatureAccentClass,
          }
        : {
            id: "free-unlock",
            eyebrow: "First picks",
            title: "Open a strong first pick.",
            description: "",
            ctaLabel: "Browse First Picks",
            onClick: () => router.push("/rankings?view=start-here"),
            accentClass: lightFeatureAccentClass,
          },
      completedPick
        ? {
            id: "completed-binge-slot",
            eyebrow: "Binge path",
            title: `Read ${completedPick.title} straight through.`,
            description: "",
            ctaLabel: `Open ${completedPick.title}`,
            onClick: () =>
              handleSeriesClick(
                completedPick.id,
                "SEARCH_PATH_BINGE",
                "search_path_binge",
              ),
            accentClass: lightCardAccentClass,
          }
        : {
            id: "completed-binge",
            eyebrow: "Binge path",
            title: "Browse completed series.",
            description: "",
            ctaLabel: "Browse Completed",
            onClick: () =>
              updateParams(
                {
                  q: "",
                  type: "",
                  genre: "",
                  status: "Completed",
                  sort: "popular",
                },
                { resetPage: true },
              ),
            accentClass: lightCardAccentClass,
          },
      breakoutPick
        ? {
            id: "breakout-watch-slot",
            eyebrow: "Breakout watch",
            title: `${breakoutPick.title} is picking up.`,
            description: leadHotKeyword?.label
              ? `Near "${leadHotLabel}".`
              : "",
            ctaLabel: `Open ${breakoutPick.title}`,
            onClick: () =>
              handleSeriesClick(
                breakoutPick.id,
                "SEARCH_PATH_BREAKOUT",
                "search_path_breakout",
              ),
            accentClass: lightCardAccentClass,
          }
        : {
            id: "breakout-watch",
            eyebrow: "Breakout watch",
            title: `Search "${leadHotLabel}".`,
            description: "",
            ctaLabel: `Search ${leadHotLabel}`,
            onClick: () =>
              updateParams(
                {
                  q: leadHotValue,
                  type: "",
                  genre: "",
                  status: "",
                  sort: "popular",
                },
                { resetPage: true },
              ),
            accentClass: lightCardAccentClass,
          },
      isAdultMode
        ? {
            id: "adult-desk",
            eyebrow: "18+ page",
            title: "Open the 18+ shelf.",
            description: "",
            ctaLabel: "Open 18+ page",
            onClick: () => router.push("/adult"),
            accentClass: lightCardAccentClass,
          }
        : null,
    ];
  }, [
    breakoutPick,
    completedPick,
    freeStartPick,
    handleSeriesClick,
    hotKeywords,
    isAdultMode,
    keywords,
    lightCardAccentClass,
    lightFeatureAccentClass,
    router,
    updateParams,
  ]);
  const browsePathGrid = (
    <StorefrontPathwaysGrid
      cards={editorialBrowsePaths.filter(Boolean)}
      columnsClassName="md:grid-cols-2 xl:grid-cols-3"
      appearance="light"
    />
  );
  const leadSearchResult =
    results[0] ||
    breakoutPick ||
    freeStartPick ||
    completedPick ||
    recoRails[0]?.items?.[0] ||
    null;
  const visibleRecoRails = recoRails.slice(0, 1).map((rail) => ({
    ...rail,
    items: Array.isArray(rail.items) ? rail.items.slice(0, 4) : [],
  }));
  const shouldShowReco =
    visibleRecoRails.length > 0 && (!query || results.length === 0);
  const shouldShowEventHub = false;
  const searchEventCards = useMemo(() => {
    const leadHotKeyword = hotKeywords[0] || keywords[0] || null;
    const leadHotLabel = leadHotKeyword?.label || "Romance";
    const leadHotValue = leadHotKeyword?.value || leadHotLabel;
    const sortLabel =
      SORT_OPTIONS.find((option) => option.id === sort)?.label || "Relevance";
    const hasDirectMatch = Boolean(query) && results.length > 0;
    const hasEditorialLead =
      Boolean(leadSearchResult) && (!query || results.length === 0);
    const startHereEpisodeCount = Number(freeStartPick?.episodeCount || 0);

    return [
      leadSearchResult && (hasDirectMatch || hasEditorialLead)
        ? {
            id: hasDirectMatch
              ? "lead-match"
              : query
                ? "lead-editorial-rescue"
                : "lead-editorial-push",
            eyebrow: hasDirectMatch
              ? "Best match"
              : query
                ? "Try this next"
                : "Featured",
            title: hasDirectMatch
              ? `${leadSearchResult.title} is the closest match.`
              : query
                ? `${leadSearchResult.title} is worth a look.`
                : `${leadSearchResult.title} is a strong place to begin.`,
            description: hasDirectMatch
              ? hasSparseResults
                ? "A short list, with a clear lead."
                : "The clearest result in this search."
              : query
                ? "No direct match, but this stays close."
                : "A strong pick from the catalog.",
            signalLabel: hasDirectMatch ? "Results" : "Featured",
            signalValue: hasDirectMatch
              ? loading
                ? loadingResultLabel
                : total.toLocaleString()
              : breakoutPick
                ? "Popular"
                : "Editors' pick",
            signalHint: hasDirectMatch
              ? `Sorted by ${sortLabel}`
              : leadHotKeyword?.hint ||
                "Picked from one of the strongest home recommendations",
            ctaLabel: `Open ${leadSearchResult.title}`,
            onClick: () =>
              handleSeriesClick(
                leadSearchResult.id,
                "SEARCH_EVENT_HUB",
                hasDirectMatch
                  ? "search_lead_match"
                  : "search_editorial_rescue",
              ),
            accentClass: lightCardAccentClass,
          }
        : {
            id: "lead-trend",
            eyebrow: "Popular search",
            title: `${leadHotLabel} is trending right now.`,
            description: "A live search term.",
            signalLabel: "Hot keyword",
            signalValue: leadHotLabel,
            signalHint:
              leadHotKeyword?.hint ||
              (hotWindow === "week"
                ? "Most searched this week"
                : "Most searched today"),
            ctaLabel: `Search ${leadHotLabel}`,
            onClick: () =>
              updateParams(
                {
                  q: leadHotValue,
                  type: "",
                  genre: "",
                  status: "",
                  sort: "popular",
                },
                { resetPage: true },
              ),
            accentClass: lightCardAccentClass,
          },
      freeStartPick
        ? {
            id: "free-start-desk-slot",
            eyebrow: "First picks",
            title: `Start with ${freeStartPick.title}.`,
            description:
              startHereEpisodeCount > 0
                ? `${startHereEpisodeCount} episode${startHereEpisodeCount === 1 ? "" : "s"} listed.`
                : "A lighter place to start.",
            signalLabel: "Episodes",
            signalValue:
              startHereEpisodeCount > 0
                ? String(startHereEpisodeCount)
                : "Live",
            signalHint:
              "A lighter commitment than restarting your search from scratch",
            ctaLabel: `Open ${freeStartPick.title}`,
            onClick: () =>
              handleSeriesClick(
                freeStartPick.id,
                "SEARCH_EVENT_FREE_START",
                "search_event_free_start",
              ),
            accentClass: lightFeatureAccentClass,
          }
        : {
            id: "free-start-desk",
            eyebrow: "First picks",
            title: "Try an editorial first pick.",
            description: "A lighter place to start.",
            signalLabel: "Shelf",
            signalValue: "First Picks",
            signalHint: "Editorial picks with a cleaner first step",
            ctaLabel: "Browse First Picks",
            onClick: () => router.push("/rankings?view=start-here"),
            accentClass: lightFeatureAccentClass,
          },
      completedPick
        ? {
            id: "binge-desk-slot",
            eyebrow: "Binge pick",
            title: `${completedPick.title} is ready for a full binge.`,
            description: `${completedPick.title} is complete, so it is easier to commit to than restarting your search from scratch.`,
            signalLabel: "Status",
            signalValue: "Completed",
            signalHint: completedPick?.episodeCount
              ? `${completedPick.episodeCount} episodes ready`
              : "Ready for a full-session read",
            ctaLabel: `Open ${completedPick.title}`,
            onClick: () =>
              handleSeriesClick(
                completedPick.id,
                "SEARCH_EVENT_BINGE",
                "search_event_binge",
              ),
            accentClass: lightCardAccentClass,
          }
        : {
            id: isAdultMode ? "protected-desk" : "binge-desk",
            eyebrow: isAdultMode ? "18+ read" : "Completed pick",
            title: isAdultMode ? "Open the 18+ shelf." : "Browse completed.",
            description: isAdultMode
              ? "Browse from the protected shelf."
              : "Finished stories.",
            signalLabel: isAdultMode ? "Mode" : "Finished",
            signalValue: isAdultMode ? "18+" : "Runs",
            signalHint: isAdultMode
              ? "18+ titles are available"
              : "Ready for a longer read",
            ctaLabel: isAdultMode ? "Open 18+ shelf" : "Browse Completed",
            onClick: () =>
              isAdultMode
                ? router.push("/adult")
                : updateParams(
                    {
                      q: "",
                      type: "",
                      genre: "",
                      status: "Completed",
                      sort: "popular",
                    },
                    { resetPage: true },
                  ),
            accentClass: lightCardAccentClass,
          },
    ];
  }, [
    breakoutPick,
    completedPick,
    freeStartPick,
    handleSeriesClick,
    hasSparseResults,
    hotKeywords,
    hotWindow,
    isAdultMode,
    keywords,
    leadSearchResult,
    loading,
    lightCardAccentClass,
    lightFeatureAccentClass,
    query,
    results.length,
    router,
    sort,
    total,
    loadingResultLabel,
    updateParams,
  ]);
  const heroStatCards = [
    {
      label: query ? "Matches" : "Titles",
      value: query ? total.toLocaleString() : catalog.length.toLocaleString(),
      tone: "bg-[#ffe500]",
    },
    {
      label: "Hot terms",
      value: hotKeywords.length.toLocaleString(),
      tone: "bg-white",
    },
    {
      label: "Page",
      value: String(page),
      tone: "bg-[#00e5ff]",
    },
  ];
  return (
    <main className="min-h-screen overflow-hidden bg-black text-black">
      <SiteHeader variant="home" />
      <div className="space-y-0">
        <section className="grid border-b-[4px] border-black bg-[#00e5ff] xl:grid-cols-[minmax(0,1fr)_380px]">
          <SurfacePanel
            className="space-y-6 border-0 border-black bg-[#00e5ff] px-5 py-10 shadow-none sm:px-8 sm:py-14 lg:px-12 xl:px-16"
            tone="highlight"
            accent="blue"
            appearance="light"
          >
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="border-[2px] border-black bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-black">
                  Search
                </p>
              </div>
              <h1 className="mt-5 max-w-4xl text-[2.75rem] font-black uppercase leading-[0.92] tracking-[-0.06em] text-black sm:text-[3.5rem] xl:text-[4.4rem]">
                {heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-black/70 sm:text-[0.98rem]">
                {heroDescription}
              </p>
              {heroSecondary ? (
                <p className="mt-2 text-sm font-medium text-black/55">{heroSecondary}</p>
              ) : null}
            </div>

            <div className="border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] sm:p-5">
              <SearchBar
                variant="home"
                placeholder="Search titles, genres, or creators"
                showShortcut={false}
                initialValue={query}
              />
              {query && suggestions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestions.slice(0, 6).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => updateParam("q", item)}
                      className="border-[2px] border-black bg-[#f5f1ea] px-3 py-2 text-sm font-black uppercase tracking-[0.04em] text-black/72 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:text-black hover:shadow-none"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : !query && (hotKeywords.length > 0 || keywords.length > 0) ? (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {normalizeKeywordList([
                    ...hotKeywords.slice(0, 3),
                    ...keywords.slice(0, 3),
                  ])
                    .slice(0, 6)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateParam("q", item.value)}
                        className="border-[2px] border-black bg-[#f5f1ea] px-3 py-2 text-sm font-black uppercase tracking-[0.04em] text-black/72 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:text-black hover:shadow-none"
                      >
                        {item.label}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          </SurfacePanel>

          <SurfacePanel
            className="h-full space-y-5 border-0 border-l-[4px] border-black bg-black p-5 text-white shadow-none sm:p-6 xl:p-8"
            tone="default"
            accent="amber"
            appearance="dark"
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ffe500]">
                Search desk
              </p>
              <h2 className="mt-2 text-[2rem] font-black uppercase leading-[0.94] tracking-[-0.05em] text-white">
                {query ? "Lead match" : "Start fast"}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-white/90">
                {query
                  ? "Refine the current query, jump into the lead title, or pivot into a stronger shelf."
                  : "Use hot terms, filters, and the lead pick to get into reading without dead clicks."}
              </p>
            </div>

            {leadSearchResult ? (
              <button
                type="button"
                onClick={() =>
                  handleSeriesClick(
                    leadSearchResult.id,
                    "SEARCH_MASTHEAD",
                    query
                      ? "search_masthead_result"
                      : "search_masthead_featured",
                  )
                }
                className="group w-full border-[3px] border-black bg-white p-4 text-left text-black shadow-[6px_6px_0_0_rgba(255,229,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              >
                <div className="grid gap-4 grid-cols-[88px_minmax(0,1fr)]">
                  <div className="overflow-hidden border-[3px] border-black bg-[#f5f1ea]">
                    <Cover
                      tone={leadSearchResult.coverTone}
                      coverUrl={leadSearchResult.coverUrl}
                      label={leadSearchResult.title}
                      eyebrow=""
                      badge={getSearchSeriesBadge(leadSearchResult)}
                      genres={leadSearchResult.genres}
                      seriesType={leadSearchResult.type}
                      className="aspect-[3/4] w-full"
                      sizes="88px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/55">
                      {query ? "Closest read" : "Lead title"}
                    </p>
                    <h3 className="mt-2 text-[1.35rem] font-black uppercase leading-[0.94] tracking-[-0.04em] text-black">
                      {leadSearchResult.title}
                    </h3>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/58">
                      {formatSearchSeriesMeta(leadSearchResult)}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-black/70">
                      {summarizeSearchDescription(leadSearchResult)}
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="border-[3px] border-black bg-white p-4 text-black shadow-[6px_6px_0_0_rgba(255,229,0,1)]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/55">
                  Live term
                </p>
                <h3 className="mt-2 text-[1.35rem] font-black uppercase leading-[0.94] tracking-[-0.04em] text-black">
                  {mastheadLeadKeyword ? mastheadLeadKeyword.label : "Browse the shelf"}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-black/70">
                  {query
                    ? "Use filters to widen the match."
                    : "Open a hot term or jump into a curated shelf."}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {heroStatCards.map((item) => (
                <div
                  key={item.label}
                  className={`${item.tone} border-[3px] border-black px-4 py-3 text-black shadow-[4px_4px_0_0_rgba(255,255,255,0.18)]`}
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/55">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[1.4rem] font-black uppercase tracking-[-0.04em]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </section>

        {!query &&
        (history.length > 0 ||
          hotKeywords.length > 0 ||
          keywords.length > 0) ? (
          <SearchHistoryPanel
            onSearch={(keyword) => updateParam("q", keyword)}
            hotKeywords={hotKeywords}
            quickKeywords={keywords}
          />
        ) : null}

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {resultsStale || catalogStale || homepageSlotsStale ? (
          <div className="border-[3px] border-black bg-[#fff6c7] px-4 py-3 text-sm font-semibold text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            Showing saved results. Reconnect to refresh.
          </div>
        ) : null}

        {shouldShowEventHub ? (
          <StorefrontEventHub
            eyebrow={query ? "Search picks" : "Featured"}
            title={query ? "Open the lead match." : "Popular now."}
            description=""
            events={searchEventCards}
            appearance="light"
          />
        ) : null}

        <SearchCreatorMatchesPanel
          catalog={catalog}
          query={query}
          loading={loading}
          resultsLength={results.length}
          searchPath={searchPath}
        />

        {shouldShowReco ? (
          <SurfacePanel
            className="space-y-8 border-[3px] border-black bg-[#ffe500] shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
            appearance="light"
            accent="amber"
          >
            <SearchSectionHeader
              eyebrow="Browse next"
              title={recoPanelTitle}
              description="If the direct result set is thin, these shelves keep the search flow moving."
              actions={
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHotWindow("day")}
                    className={`border-[2px] border-black px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] transition-all ${
                      hotWindow === "day"
                        ? "bg-[#ff007a] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                        : "bg-white text-black/70 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#00e5ff] hover:text-black hover:shadow-none"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setHotWindow("week")}
                    className={`border-[2px] border-black px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] transition-all ${
                      hotWindow === "week"
                        ? "bg-[#ff007a] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                        : "bg-white text-black/70 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#00e5ff] hover:text-black hover:shadow-none"
                    }`}
                  >
                    This Week
                  </button>
                </div>
              }
            />

            <div className="space-y-8">
              {visibleRecoRails.map((rail) => (
                <section key={rail.id} className="space-y-4">
                  <h3 className="text-lg font-black uppercase tracking-[0.03em] text-black">
                    {rail.title}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {rail.items.map((item) => (
                      <PortraitCard
                        key={item.id}
                        item={item}
                        appearance="light"
                        onClick={() => {
                          trackEvent("reco_click", {
                            railName: rail.title,
                            seriesId: item.id,
                          });
                          handleSeriesClick(item.id, "SEARCH_RECO", rail.id);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </SurfacePanel>
        ) : null}

        {showResultSections ? (
          <>
            <SurfacePanel
              className="space-y-5 border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
              appearance="light"
              accent="blue"
            >
              <SearchSectionHeader
                eyebrow="Results"
                title={query ? `Results for "${query}"` : "Catalog"}
                description="Use filters only when you need them. The default grid stays focused on getting you into a title fast."
                meta={`${total.toLocaleString()} match${total === 1 ? "" : "es"}`}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters(true)}
                      className="inline-flex items-center gap-2 border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none"
                    >
                      <SlidersHorizontal size={16} />
                      <span>Filters</span>
                      {activeFilterCount > 0 ? (
                        <span className="border border-black bg-[#ff007a] px-2 py-0.5 text-[11px] font-black text-white">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </button>
                    <select
                      value={sort}
                      onChange={(event) => updateParam("sort", event.target.value)}
                      className={filterSelectClass}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {activeFilterCount > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateParams(
                            {
                              type: "",
                              status: "",
                              genre: "",
                              sort: "relevance",
                            },
                            { resetPage: true },
                          )
                        }
                        className={secondaryButtonClass}
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
                  <SkeletonCard key={index} appearance="light" />
                ))}
              </div>
            ) : error ? (
              <NetworkFallback
                compact
                title="Search is unavailable right now."
                description=""
                onRetry={retrySearch}
              >
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className={secondaryButtonClass}
                >
                  Back home
                </button>
              </NetworkFallback>
            ) : results.length === 0 ? (
              <SurfacePanel
                className="space-y-4 border-[3px] border-black bg-[#fff6c7] shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
                appearance="light"
                accent="blue"
              >
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                    No direct match
                  </p>
                  <h2 className="mt-2 text-[2.2rem] font-black uppercase leading-[0.94] tracking-[-0.05em] text-black">
                    Try a wider search.
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {activeFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateParams(
                          {
                            type: "",
                            status: "",
                            genre: "",
                            sort: "relevance",
                          },
                          { resetPage: true },
                        )
                      }
                      className={secondaryButtonClass}
                    >
                      Clear filters
                    </button>
                  ) : null}
                  {breakoutPick ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleSeriesClick(
                          breakoutPick.id,
                          "SEARCH_ZERO_RESULTS",
                          "search_zero_breakout",
                        )
                      }
                      className={secondaryButtonClass}
                    >
                      Open {breakoutPick.title}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/rankings?view=featured")}
                      className={secondaryButtonClass}
                    >
                      Browse Series
                    </button>
                  )}
                  {completedPick ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleSeriesClick(
                          completedPick.id,
                          "SEARCH_ZERO_RESULTS",
                          "search_zero_completed",
                        )
                      }
                      className={secondaryButtonClass}
                    >
                      Open {completedPick.title}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        updateParams(
                          {
                            q: "",
                            type: "",
                            genre: "",
                            status: "Completed",
                            sort: "latest",
                          },
                          { resetPage: true },
                        )
                      }
                      className={secondaryButtonClass}
                    >
                      Browse Completed
                    </button>
                  )}
                  {freeStartPick ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleSeriesClick(
                          freeStartPick.id,
                          "SEARCH_ZERO_RESULTS",
                          "search_zero_free_start",
                        )
                      }
                      className={accentButtonClass}
                    >
                      Open {freeStartPick.title}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/rankings?view=start-here")}
                      className={accentButtonClass}
                    >
                      Browse First Picks
                    </button>
                  )}
                </div>
                <div className="pt-2">{browsePathGrid}</div>
              </SurfacePanel>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  {results.map((series) => (
                    <Link
                      key={series.id}
                      href={buildPathWithAttribution(`/series/${series.id}`, {
                        entryPoint: "SEARCH_RESULTS",
                        campaignId: query
                          ? "search_result_grid"
                          : "catalog_grid",
                        sourcePath: searchPath,
                        sourceSeriesId: series.id,
                        returnTo: `/series/${series.id}`,
                      })}
                      onClick={() =>
                        trackEvent("search_result_click", {
                          seriesId: series.id,
                          entryPoint: "SEARCH_RESULTS",
                          campaignId: query
                            ? "search_result_grid"
                            : "catalog_grid",
                          query: query || undefined,
                        })
                      }
                      className="group block overflow-hidden border-[3px] border-black bg-white p-5 text-left shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-all duration-300 hover:translate-x-1 hover:translate-y-1 hover:bg-[#fffdf7] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                      aria-label={`Open ${series.title}`}
                    >
                      <div className="grid gap-5 sm:grid-cols-[132px_minmax(0,1fr)]">
                        <div className="overflow-hidden border-[3px] border-black bg-[#f5f1ea] shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                          <Cover
                            tone={series.coverTone}
                            coverUrl={series.coverUrl}
                            label={series.title}
                            eyebrow=""
                            badge={getSearchSeriesBadge(series)}
                            genres={series.genres}
                            seriesType={series.type}
                            className="aspect-[3/4] w-full"
                            sizes="(max-width: 640px) 112px, 160px"
                          />
                        </div>
                        <div className="min-w-0 space-y-3.5">
                          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/55">
                            {series.type || "Series"}
                          </p>
                          <h3 className="text-[1.32rem] font-black uppercase leading-tight tracking-[-0.04em] text-black">
                            {highlight(series.title, query)}
                          </h3>
                          <p className="text-sm font-semibold text-black/65">
                            {formatSearchSeriesMeta(series)}
                          </p>
                          <p className="line-clamp-2 text-sm font-medium leading-6 text-black/68">
                            {summarizeSearchDescription(series)}
                          </p>
                          <div className="flex items-center justify-between border-t-[3px] border-black pt-3">
                            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-black/55">
                              Open title
                            </span>
                            <span className="inline-flex h-8 w-8 items-center justify-center border-[2px] border-black bg-[#ffe500] text-black transition-all duration-300 group-hover:translate-x-1">
                              <ArrowRight className="size-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {total > PAGE_SIZE ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-black bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.04em] text-black/65 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateParam("page", String(page - 1))}
                        disabled={page <= 1}
                        aria-label="Previous page"
                        className="border-[2px] border-black bg-white px-3 py-1.5 text-sm font-black uppercase tracking-[0.06em] text-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => updateParam("page", String(page + 1))}
                        disabled={page >= totalPages}
                        aria-label="Next page"
                        className="border-[2px] border-black bg-white px-3 py-1.5 text-sm font-black uppercase tracking-[0.06em] text-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next page
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </div>

      <AdvancedFilterPanel
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(filters) => {
          updateParams(
            {
              type: filters.types.join(","),
              status:
                filters.status && filters.status !== "all"
                  ? filters.status
                  : "",
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
