"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
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
const SearchCreatorMatchesPanel = dynamic(() => import("./SearchCreatorMatchesPanel"), {
  ssr: false,
});
const PortraitCard = dynamic(() => import("../home/PortraitCard"));
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));
const StorefrontEventHub = dynamic(() => import("../common/StorefrontEventHub"));
const StorefrontPathwaysGrid = dynamic(() => import("../common/StorefrontPathwaysGrid"));

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
      <mark className="rounded bg-amber-200 px-1 text-slate-950">{match}</mark>
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
    item.keyword || item.term || item.label || item.name || item.query || item.title || "";
  const label = String(labelSource).trim();
  if (!label) {
    return null;
  }

  const hintSource = item.hint || item.context || item.genre || item.category || item.type || "";
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

  return items.map((item, index) => normalizeKeywordItem(item, index)).filter(Boolean);
}

function formatSearchSeriesMeta(series) {
  return [
    series?.type || "Series",
    series?.status || "Ongoing",
  ]
    .filter(Boolean)
    .join(" / ");
}

function summarizeSearchDescription(series) {
  const description = String(series?.description || "").replace(/\s+/g, " ").trim();
  if (description) {
    return description.length > 96 ? `${description.slice(0, 93).trimEnd()}...` : description;
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
  if (!Number.isNaN(updatedAt) && updatedAt >= Date.now() - 14 * 24 * 60 * 60 * 1000) {
    return "Updated";
  }

  if (Number(series?.episodeCount || 0) > 0 && Number(series?.episodeCount || 0) <= 12) {
    return "Start here";
  }

  return "";
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
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/search")));
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
      () => apiGet(`/api/recommendations/homepage?adult=${adultFlag}`, { cacheMs: 60000 }),
    ).then(([catalogResponse, homepageSlotsResponse]) => {
      if (!applyCatalog(catalogResponse)) {
        if (!catalogResponse.ok && (catalogResponse.status === 0 || catalogResponse.status >= 500)) {
          if (shouldRetry(`search_catalog_${adultFlag}`)) {
            retryTimer = setTimeout(() => {
              apiGet(`/api/series?adult=${adultFlag}`, { bust: true }).then((retryResponse) => {
                applyCatalog(retryResponse);
              });
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
      list.push({ id: "trending", title: "Popular now", items: reco.trendingRail });
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
    (seriesId, entryPoint = "SEARCH_RESULTS", campaignId = query ? "search_result_grid" : "catalog_grid") => {
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

  const activeFilterCount = [type, status, genre, sort !== "relevance" ? sort : ""]
    .filter(Boolean)
    .length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasSparseResults = Boolean(query) && !loading && results.length > 0 && results.length < 4;
  const showResultSections = Boolean(query);
  const heroTitle = query ? `Results for "${query}"` : "Search the catalog";
  const heroDescription = query
    ? loading
      ? "Updating results."
      : `${total.toLocaleString()} match${total === 1 ? "" : "es"} across the catalog.`
    : "Search titles, creators, and genres.";
  const heroSecondary = "";
  const loadingResultLabel = "Updating";
  const mastheadLeadKeyword = hotKeywords[0] || keywords[0] || null;
  const recoPanelTitle = !query
    ? "More to read."
    : results.length === 0
      ? "No direct match. Try one of these."
      : "A few more picks.";
  const lightCardAccentClass = "border-black/6 bg-white/84 hover:border-black/10 hover:bg-white";
  const lightFeatureAccentClass =
    "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.08)]";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc]";
  const accentButtonClass =
    "rounded-full border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] px-3 py-2 text-sm font-semibold text-slate-950 transition-colors hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.08)]";
  const filterSelectClass =
    "rounded-full border border-black/8 bg-white/88 px-4 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[var(--gush-accent,#2f6bff)]";
  const editorialBrowsePaths = useMemo(() => {
    const leadHotKeyword = hotKeywords[0] || keywords[0] || null;
    const leadHotLabel = leadHotKeyword?.label || "Romance";
    const leadHotValue = leadHotKeyword?.value || leadHotLabel;
    const startHereEpisodeCount = Number(freeStartPick?.episodeCount || 0);

    return [
      freeStartPick
        ? {
            id: "free-unlock-slot",
            eyebrow: "Start here",
            title: `Start with ${freeStartPick.title}.`,
            description:
              startHereEpisodeCount > 0
                ? `${startHereEpisodeCount} episode${startHereEpisodeCount === 1 ? "" : "s"} already live.`
                : "A clear place to begin.",
            ctaLabel: `Open ${freeStartPick.title}`,
            onClick: () => handleSeriesClick(freeStartPick.id, "SEARCH_PATH_FREE_START", "search_path_free_start"),
            accentClass: lightFeatureAccentClass,
          }
        : {
            id: "free-unlock",
            eyebrow: "Start here",
            title: "Open a strong first pick.",
            description: "Start with an editorial pick.",
            ctaLabel: "Browse Start Here",
            onClick: () => router.push("/rankings?view=start-here"),
            accentClass: lightFeatureAccentClass,
          },
      completedPick
        ? {
            id: "completed-binge-slot",
            eyebrow: "Binge path",
            title: `Read ${completedPick.title} straight through.`,
            description: "Completed and ready in one run.",
            ctaLabel: `Open ${completedPick.title}`,
            onClick: () => handleSeriesClick(completedPick.id, "SEARCH_PATH_BINGE", "search_path_binge"),
            accentClass: lightCardAccentClass,
          }
        : {
            id: "completed-binge",
            eyebrow: "Binge path",
            title: "Browse completed series.",
            description: "Finished stories for a full read.",
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
            description:
              leadHotKeyword?.label
                ? `Showing up alongside "${leadHotLabel}".`
                : "A fast-rising pick from the shelf.",
            ctaLabel: `Open ${breakoutPick.title}`,
            onClick: () => handleSeriesClick(breakoutPick.id, "SEARCH_PATH_BREAKOUT", "search_path_breakout"),
            accentClass: lightCardAccentClass,
          }
        : {
            id: "breakout-watch",
            eyebrow: "Breakout watch",
            title: `Search "${leadHotLabel}".`,
            description: "A quick way into the shelf.",
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
            description: "Go straight to mature reads.",
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
  const leadSearchResult = results[0] || breakoutPick || freeStartPick || completedPick || recoRails[0]?.items?.[0] || null;
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
    const sortLabel = SORT_OPTIONS.find((option) => option.id === sort)?.label || "Relevance";
    const hasDirectMatch = Boolean(query) && results.length > 0;
    const hasEditorialLead = Boolean(leadSearchResult) && (!query || results.length === 0);
    const startHereEpisodeCount = Number(freeStartPick?.episodeCount || 0);

    return [
      leadSearchResult && (hasDirectMatch || hasEditorialLead)
        ? {
            id: hasDirectMatch ? "lead-match" : query ? "lead-editorial-rescue" : "lead-editorial-push",
            eyebrow: hasDirectMatch ? "Best match" : query ? "Try this next" : "Featured",
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
              ? (loading ? loadingResultLabel : total.toLocaleString())
              : breakoutPick
                ? "Popular"
                : "Editors' pick",
            signalHint: hasDirectMatch
              ? `Sorted by ${sortLabel}`
              : leadHotKeyword?.hint || "Picked from one of the strongest home recommendations",
            ctaLabel: `Open ${leadSearchResult.title}`,
            onClick: () =>
              handleSeriesClick(
                leadSearchResult.id,
                "SEARCH_EVENT_HUB",
                hasDirectMatch ? "search_lead_match" : "search_editorial_rescue",
              ),
            accentClass: lightCardAccentClass,
          }
        : {
            id: "lead-trend",
            eyebrow: "Popular search",
            title: `${leadHotLabel} is trending right now.`,
            description: "A live search term can open into something popular fast.",
            signalLabel: "Hot keyword",
            signalValue: leadHotLabel,
            signalHint:
              leadHotKeyword?.hint || (hotWindow === "week" ? "Most searched this week" : "Most searched today"),
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
            eyebrow: "Start here",
            title: `Start with ${freeStartPick.title}.`,
            description:
              startHereEpisodeCount > 0
                ? `${freeStartPick.title} already has ${startHereEpisodeCount} episode${startHereEpisodeCount === 1 ? "" : "s"} listed, so it is easy to judge from the first click.`
                : `${freeStartPick.title} is a good place to start.`,
            signalLabel: "Episodes",
            signalValue: startHereEpisodeCount > 0 ? String(startHereEpisodeCount) : "Live",
            signalHint: "A lighter commitment than restarting your search from scratch",
            ctaLabel: `Open ${freeStartPick.title}`,
            onClick: () => handleSeriesClick(freeStartPick.id, "SEARCH_EVENT_FREE_START", "search_event_free_start"),
            accentClass: lightFeatureAccentClass,
          }
        : {
            id: "free-start-desk",
            eyebrow: "Start here",
            title: "Try an editorial first pick.",
            description: "A shorter, cleaner place to begin can be more useful than another empty result list.",
            signalLabel: "Shelf",
            signalValue: "Start Here",
            signalHint: "Editorial picks with a cleaner first step",
            ctaLabel: "Browse Start Here",
            onClick: () => router.push("/rankings?view=start-here"),
            accentClass: lightFeatureAccentClass,
          },
      completedPick
        ? {
            id: "binge-desk-slot",
            eyebrow: "Binge pick",
            title: `${completedPick.title} is ready for a full binge.`,
            description:
              `${completedPick.title} is complete, so it is easier to commit to than restarting your search from scratch.`,
            signalLabel: "Status",
            signalValue: "Completed",
            signalHint: completedPick?.episodeCount ? `${completedPick.episodeCount} episodes ready` : "Ready for a full-session read",
            ctaLabel: `Open ${completedPick.title}`,
            onClick: () => handleSeriesClick(completedPick.id, "SEARCH_EVENT_BINGE", "search_event_binge"),
            accentClass: lightCardAccentClass,
          }
        : {
            id: isAdultMode ? "protected-desk" : "binge-desk",
            eyebrow: isAdultMode ? "18+ read" : "Completed pick",
            title: isAdultMode
              ? "The 18+ catalog should be clear and easy to browse."
              : "Completed series are the easiest backup when search is too narrow.",
            description: isAdultMode
              ? "If a mature search misses, go to the 18+ page and browse from there."
              : "Finished stories give you payoff right away without waiting for another update.",
            signalLabel: isAdultMode ? "Mode" : "Finished",
            signalValue: isAdultMode ? "18+" : "Runs",
            signalHint: isAdultMode ? "18+ titles are available" : "Ready for a longer read",
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
  return (
    <main className="gush-page-shell gush-home-shell overflow-hidden">
      <div className="gush-page-ambient h-[clamp(20rem,40vw,32rem)]" />
      <SiteHeader variant="home" />
      <div className="gush-page-main gush-section-stack">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.26fr)_minmax(320px,0.74fr)]">
          <SurfacePanel className="space-y-6 rounded-[38px] px-5 py-5 sm:px-7 sm:py-7" tone="highlight" accent="blue">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/46">
                Search
              </p>
              <h1 className="mt-4 font-display text-[2.35rem] font-semibold tracking-[-0.045em] text-white sm:text-[3rem] xl:text-[3.8rem]">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-[0.98rem]">
                {heroDescription}
              </p>
              {heroSecondary ? (
                <p className="mt-2 text-sm text-white/54">{heroSecondary}</p>
              ) : null}
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:p-5">
              <SearchBar
                variant="home"
                placeholder="Search titles, genres, or creators"
                showShortcut={false}
                initialValue={query}
              />
              {suggestions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestions.slice(0, 6).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => updateParam("q", item)}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/74 transition-colors hover:border-white/16 hover:bg-white/[0.1] hover:text-white"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </SurfacePanel>

          <div className="grid gap-4">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,17,26,0.95),rgba(12,17,26,0.88))] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/44">
                Overview
              </p>
              <h2 className="mt-3 font-display text-[1.5rem] font-semibold tracking-tight text-white">
                {query ? "Start with the closest result." : "Start with a clear route in."}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/62">
                {query
                  ? "Use filters if you want to narrow the list."
                  : mastheadLeadKeyword
                    ? `"${mastheadLeadKeyword.label}" is active right now.`
                    : "Browse titles, creators, and genres from one place."}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-3 py-3">
                  <p className="text-lg font-semibold tracking-tight text-white">
                    {query ? total.toLocaleString() : catalog.length.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">
                    {query ? "Matches" : "Titles"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-3 py-3">
                  <p className="text-lg font-semibold tracking-tight text-white">
                    {hotKeywords.length.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">
                    Hot
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-3 py-3">
                  <p className="text-lg font-semibold tracking-tight text-white">
                    {page}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">
                    Page
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!query && (history.length > 0 || hotKeywords.length > 0 || keywords.length > 0) ? (
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Showing saved results. Reconnect to refresh.
          </div>
        ) : null}

        {shouldShowEventHub ? (
          <StorefrontEventHub
            eyebrow={query ? "Search picks" : "Featured"}
            title={
              query
                ? "Open the closest match first."
                : "A few strong places to begin."
            }
            description={
              query
                ? "If the list feels thin, these picks widen the shelf."
                : "A few strong picks from across the catalog."
            }
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
          <SurfacePanel className="space-y-8" appearance="light" accent="blue">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  More to read
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {recoPanelTitle}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHotWindow("day")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    hotWindow === "day"
                      ? "border-black/10 bg-slate-950 text-white"
                      : "border-black/8 bg-white text-slate-500 hover:border-black/12 hover:text-slate-900"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setHotWindow("week")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    hotWindow === "week"
                      ? "border-black/10 bg-slate-950 text-white"
                      : "border-black/8 bg-white text-slate-500 hover:border-black/12 hover:text-slate-900"
                  }`}
                >
                  This Week
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {visibleRecoRails.map((rail) => (
                <section key={rail.id} className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-950">{rail.title}</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {rail.items.map((item) => (
                      <PortraitCard
                        key={item.id}
                        item={item}
                        appearance="light"
                        onClick={() => {
                          trackEvent("reco_click", { railName: rail.title, seriesId: item.id });
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
            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Results
                  </p>
                  <h2 className="mt-2 font-display text-[1.95rem] font-semibold tracking-tight text-slate-950">
                    {query ? `Results for "${query}"` : "Catalog search"}
                  </h2>
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {total.toLocaleString()} match{total === 1 ? "" : "es"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  <SlidersHorizontal size={16} />
                  <span>Filters</span>
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-bold text-white">
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
              </div>
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
            description="Try that search again."
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
          <SurfacePanel className="space-y-4" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                No direct match
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Try a broader search.
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
                  onClick={() => handleSeriesClick(breakoutPick.id, "SEARCH_ZERO_RESULTS", "search_zero_breakout")}
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
                  onClick={() => handleSeriesClick(completedPick.id, "SEARCH_ZERO_RESULTS", "search_zero_completed")}
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
                  onClick={() => handleSeriesClick(freeStartPick.id, "SEARCH_ZERO_RESULTS", "search_zero_free_start")}
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
                  Browse Start Here
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
                    campaignId: query ? "search_result_grid" : "catalog_grid",
                    sourcePath: searchPath,
                    sourceSeriesId: series.id,
                    returnTo: `/series/${series.id}`,
                  })}
                  onClick={() =>
                    trackEvent("search_result_click", {
                      seriesId: series.id,
                      entryPoint: "SEARCH_RESULTS",
                      campaignId: query ? "search_result_grid" : "catalog_grid",
                      query: query || undefined,
                    })
                  }
                  className="group block rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,244,238,0.95))] p-4 text-left shadow-[0_18px_42px_rgba(15,23,42,0.05)] transition-transform duration-300 hover:-translate-y-1 hover:border-black/10"
                  aria-label={`Open ${series.title}`}
                  >
                    <div className="grid gap-4 sm:grid-cols-[126px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-[20px] border border-black/6 bg-neutral-900 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
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
                    <div className="min-w-0 space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Result
                      </p>
                      <h3 className="font-display text-[1.2rem] font-semibold leading-tight tracking-tight text-slate-950">
                        {highlight(series.title, query)}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {formatSearchSeriesMeta(series)}
                      </p>
                      <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                        {summarizeSearchDescription(series)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {total > PAGE_SIZE ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-black/6 bg-white/84 px-4 py-3 text-sm text-slate-500">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateParam("page", String(page - 1))}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => updateParam("page", String(page + 1))}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                    className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
