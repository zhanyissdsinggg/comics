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

const SiteHeader = dynamic(() => import("../layout/SiteHeader"), {
  ssr: false,
});

const SearchHistoryPanel = dynamic(() => import("./SearchHistoryPanel"));
const AdvancedFilterPanel = dynamic(() => import("./AdvancedFilterPanel"), {
  ssr: false,
});
const PortraitCard = dynamic(() => import("../home/PortraitCard"));
const CreatorShelfLinks = dynamic(() => import("../common/CreatorShelfLinks"));
const CommerceSuccessBanner = dynamic(() => import("../common/CommerceSuccessBanner"));
const StorefrontEventHub = dynamic(() => import("../common/StorefrontEventHub"));
const StorefrontPathwaysGrid = dynamic(() => import("../common/StorefrontPathwaysGrid"));
const SearchCreatorMatchesPanel = dynamic(() => import("./SearchCreatorMatchesPanel"), {
  ssr: false,
});

const STATUS_OPTIONS = ["Ongoing", "Completed"];
const TYPE_OPTIONS = [
  { id: "comic", label: "Comics" },
  { id: "novel", label: "Novels" },
];
const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "popular", label: "Popular" },
  { id: "rating", label: "Rating" },
  { id: "latest", label: "Latest" },
  { id: "alphabetical", label: "A-Z" },
];

const PAGE_SIZE = 12;
const MAX_HISTORY_ITEMS = 8;

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
  const sort = searchParams.get("sort") || "relevance";
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
  const heroTitle = query ? `Results for "${query}"` : "Find your next read.";
  const heroDescription = query
    ? "Narrow the results by type, status, genre, and ranking without losing your place."
    : "Start with trending searches, recent history, and quick filters to get to the right series faster.";
  const heroSecondary = query
    ? loading
      ? "Refreshing results..."
      : `${total.toLocaleString()} result${total === 1 ? "" : "s"} for this search.`
    : "Use the header search or start with the shortcuts below.";
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
        hint: activeFilterCount > 0 ? "Type, status, genre, and sort are active" : "Browsing the full catalog",
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+" : "Standard",
        hint: isAdultMode ? "Age-gated catalog visible" : "Main catalog",
      },
      {
        label: "History",
        value: history.length ? history.length.toLocaleString() : (hotKeywords.length || keywords.length).toLocaleString(),
        hint: history.length ? "Recent searches remembered locally" : "Trending entry points ready",
      },
    ],
    [activeFilterCount, history.length, hotKeywords.length, isAdultMode, keywords.length, loading, query, total],
  );
  const shouldShowReco = recoRails.length > 0 && (!query || results.length === 0 || hasSparseResults);
  const shouldShowSearchTools =
    suggestions.length > 0 || (!query && (history.length > 0 || keywords.length > 0 || hotKeywords.length > 0));
  const recoPanelTitle = !query
    ? "Good picks should stay visible even before you search."
    : results.length === 0
      ? "No exact match yet. Try a better next click."
      : "Only a few matches? Here are some better options.";
  const recoPanelHint = !query
    ? "Start with trending titles, free previews, and completed reads."
    : results.length === 0
      ? "These picks keep you moving when a search comes up empty."
      : "A short result list is a good time to branch into something similar.";
  const editorialBrowsePaths = useMemo(() => {
    const leadHotKeyword = hotKeywords[0] || keywords[0] || null;
    const backupKeyword = hotKeywords[1] || keywords[1] || null;
    const leadHotLabel = leadHotKeyword?.label || "Romance";
    const leadHotValue = leadHotKeyword?.value || leadHotLabel;
    const backupLabel = backupKeyword?.label || "Fantasy";
    const backupValue = backupKeyword?.value || backupLabel;
    const freeStartCount = Number(freeStartPick?.freeEpisodeCount || 0);

    return [
      freeStartPick
        ? {
            id: "free-unlock-slot",
            eyebrow: "Free start",
            title: `Start free with ${freeStartPick.title}.`,
            description:
              freeStartCount > 0
                ? `${freeStartPick.title} already has ${freeStartCount} free episode${freeStartCount === 1 ? "" : "s"}, so it is easy to try before you spend.`
                : `${freeStartPick.title} is an easy sample pick if you want something simple to try first.`,
            ctaLabel: `Open ${freeStartPick.title}`,
            onClick: () => handleSeriesClick(freeStartPick.id, "SEARCH_PATH_FREE_START", "search_path_free_start"),
            accentClass:
              "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
          }
        : {
            id: "free-unlock",
            eyebrow: "Free start",
            title: "Start with a free chapter before you commit.",
            description:
              "Free unlocks are one of the easiest ways to test a series before spending.",
            ctaLabel: "Open free unlock chart",
            onClick: () => router.push("/rankings?type=ttf&window=all"),
            accentClass:
              "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
          },
      completedPick
        ? {
            id: "completed-binge-slot",
            eyebrow: "Binge path",
            title: `Binge ${completedPick.title} from start to finish.`,
            description:
              `${completedPick.title} is complete, so you can read straight through without waiting for updates.`,
            ctaLabel: `Open ${completedPick.title}`,
            onClick: () => handleSeriesClick(completedPick.id, "SEARCH_PATH_BINGE", "search_path_binge"),
            accentClass:
              "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
          }
        : {
            id: "completed-binge",
            eyebrow: "Binge path",
            title: "Browse completed series for a full binge.",
            description:
              "Finished stories are the easiest choice when you want payoff without waiting.",
            ctaLabel: "Browse completed",
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
            accentClass:
              "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
          },
      breakoutPick
        ? {
            id: "breakout-watch-slot",
            eyebrow: "Breakout watch",
            title: `${breakoutPick.title} is trending right now.`,
            description:
              leadHotKeyword?.label
                ? `${breakoutPick.title} is getting attention alongside "${leadHotLabel}", so it is a strong place to jump in.`
                : `${breakoutPick.title} is a fast-rising pick if you want something readers are finding right now.`,
            ctaLabel: `Open ${breakoutPick.title}`,
            onClick: () => handleSeriesClick(breakoutPick.id, "SEARCH_PATH_BREAKOUT", "search_path_breakout"),
            accentClass:
              "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
          }
        : {
            id: "breakout-watch",
            eyebrow: "Breakout watch",
            title: `Search "${leadHotLabel}" to see what is hot right now.`,
            description:
              "A trending term is often the fastest way to find something new.",
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
            accentClass:
              "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
          },
      {
        id: isAdultMode ? "adult-desk" : "broad-browse",
        eyebrow: isAdultMode ? "18+ page" : "Open browse",
        title: isAdultMode
          ? "Go straight to the 18+ section."
          : `If "${backupLabel}" feels like a better fit, start there instead.`,
        description: isAdultMode
          ? "Use the dedicated 18+ page, then come back to search once you know what you want."
          : "Broad browse still helps when you want to compare genre, mood, and popularity before choosing a series.",
        ctaLabel: isAdultMode ? "Open 18+ page" : `Search ${backupLabel}`,
        onClick: () =>
          isAdultMode
            ? router.push("/adult")
            : updateParams(
                {
                  q: backupValue,
                  type: "",
                  genre: "",
                  status: "",
                  sort: "relevance",
                },
                { resetPage: true },
              ),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
    ];
  }, [
    breakoutPick,
    completedPick,
    freeStartPick,
    handleSeriesClick,
    hotKeywords,
    isAdultMode,
    keywords,
    router,
    updateParams,
  ]);
  const browsePathGrid = <StorefrontPathwaysGrid cards={editorialBrowsePaths} />;
  const leadSearchResult = results[0] || breakoutPick || freeStartPick || completedPick || recoRails[0]?.items?.[0] || null;
  const searchEventCards = useMemo(() => {
    const leadHotKeyword = hotKeywords[0] || keywords[0] || null;
    const leadHotLabel = leadHotKeyword?.label || "Romance";
    const leadHotValue = leadHotKeyword?.value || leadHotLabel;
    const sortLabel = SORT_OPTIONS.find((option) => option.id === sort)?.label || "Relevance";
    const hasDirectMatch = Boolean(query) && results.length > 0;
    const hasEditorialLead = Boolean(leadSearchResult) && (!query || results.length === 0);
    const freeStartCount = Number(freeStartPick?.freeEpisodeCount || 0);

    return [
      leadSearchResult && (hasDirectMatch || hasEditorialLead)
        ? {
            id: hasDirectMatch ? "lead-match" : query ? "lead-editorial-rescue" : "lead-editorial-push",
            eyebrow: hasDirectMatch ? "Top result" : query ? "Try this next" : "Featured pick",
            title: hasDirectMatch
              ? `${leadSearchResult.title} is the best match to open first.`
              : query
                ? `${leadSearchResult.title} is a strong next pick for this search.`
                : `${leadSearchResult.title} is worth opening before you even type.`,
            description: hasDirectMatch
              ? hasSparseResults
                ? "There are only a few matches, so start with the strongest one and branch out from there."
                : "This is the clearest match in the current results."
              : query
                ? "Your search came up empty, so this is the closest strong pick to try next."
                : "If you are still browsing, start with one strong pick instead of a blank search box.",
            signalLabel: hasDirectMatch ? "Results" : "Featured",
            signalValue: hasDirectMatch ? (loading ? "--" : total.toLocaleString()) : breakoutPick ? "Trending" : "Editors' pick",
            signalHint: hasDirectMatch
              ? `Sorted by ${sortLabel}`
              : leadHotKeyword?.hint || "Picked from the homepage mix",
            ctaLabel: `Open ${leadSearchResult.title}`,
            onClick: () =>
              handleSeriesClick(
                leadSearchResult.id,
                "SEARCH_EVENT_HUB",
                hasDirectMatch ? "search_lead_match" : "search_editorial_rescue",
              ),
            accentClass:
              "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
          }
        : {
            id: "lead-trend",
            eyebrow: "Live search heat",
            title: `${leadHotLabel} is trending right now.`,
            description:
              "Trending searches are a quick way to find something popular without guessing.",
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
            accentClass:
              "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
          },
      freeStartPick
        ? {
            id: "free-start-desk-slot",
            eyebrow: "Free start",
            title: `${freeStartPick.title} lets you start free.`,
            description:
              freeStartCount > 0
                ? `${freeStartPick.title} gives you ${freeStartCount} free episode${freeStartCount === 1 ? "" : "s"} before you decide whether to unlock more.`
                : `${freeStartPick.title} is a good sample pick if you want something easy to try first.`,
            signalLabel: "Free eps",
            signalValue: freeStartCount > 0 ? String(freeStartCount) : "Live",
            signalHint: "Ready before checkout",
            ctaLabel: `Open ${freeStartPick.title}`,
            onClick: () => handleSeriesClick(freeStartPick.id, "SEARCH_EVENT_FREE_START", "search_event_free_start"),
            accentClass:
              "group border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
          }
        : {
            id: "free-start-desk",
            eyebrow: "Free start",
            title: "Start with a free chapter first.",
            description:
              "Free unlocks and previews are the easiest way to keep browsing without paying up front.",
            signalLabel: "Chart",
            signalValue: "TTF",
            signalHint: "Timed free unlocks available now",
            ctaLabel: "Open free unlock chart",
            onClick: () => router.push("/rankings?type=ttf&window=all"),
            accentClass:
              "group border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
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
            accentClass:
              "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
          }
        : {
            id: isAdultMode ? "protected-desk" : "binge-desk",
            eyebrow: isAdultMode ? "18+ pick" : "Binge pick",
            title: isAdultMode
              ? "The 18+ catalog should be clear and easy to browse."
              : "Completed series are the easiest backup when search is too narrow.",
            description: isAdultMode
              ? "If a mature search misses, go to the 18+ page and browse from there."
              : "Finished stories give you payoff right away without waiting for another update.",
            signalLabel: isAdultMode ? "Mode" : "Finished",
            signalValue: isAdultMode ? "18+" : "Runs",
            signalHint: isAdultMode ? "18+ titles are available" : "Ready for a longer read",
            ctaLabel: isAdultMode ? "Open 18+ page" : "Browse completed",
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
            accentClass:
              "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
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
    query,
    results.length,
    router,
    sort,
    total,
    updateParams,
  ]);

  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Search"
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

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {resultsStale || catalogStale || homepageSlotsStale ? (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            Showing cached data. Reconnect to refresh the latest search results.
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
                  quickKeywords={keywords}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <StorefrontEventHub
          eyebrow={query ? "Search picks" : "Start here"}
          title={
            query
              ? "Keep going after the first result."
              : "Start with a better first click."
          }
          description={
            query
              ? "A good search page does more than count results. It helps you open something worth reading next."
              : "If you have not typed anything yet, start with trending picks, free previews, and popular completed series."
          }
          events={searchEventCards}
        />

        <SearchCreatorMatchesPanel
          catalog={catalog}
          query={query}
          loading={loading}
          resultsLength={results.length}
          searchPath={searchPath}
        />

        {!query ? (
          <SurfacePanel className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                  Browse paths
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Start with a genre, a trend, or a free preview.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                  These shortcuts help when you want something good to read but do not have the exact title yet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
              >
                See weekly chart
              </button>
            </div>
            {browsePathGrid}
          </SurfacePanel>
        ) : null}

        {shouldShowReco ? (
          <SurfacePanel className="space-y-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                  More to try
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {recoPanelTitle}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">{recoPanelHint}</p>
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
                      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Recommended row</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{rail.title}</h3>
                    </div>
                  </div>
                  <CreatorShelfLinks
                    items={rail.items}
                    entryPoint="SEARCH_CREATOR_CHIP"
                    campaignId={`${rail.id}_creator`}
                    sourcePath={searchPath}
                    label="Creators in this row"
                    compact
                  />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {rail.items.map((item) => (
                      <PortraitCard
                        key={item.id}
                        item={item}
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

        <SurfacePanel className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                Live filters
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Refine this search.
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
                <option key={option.id} value={option.id}>
                  {option.label}
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
              placeholder="Genres"
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
                Back to home
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
                No exact matches for this search.
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Try a broader keyword, clear the current filters, or jump into one of the picks below.
              </p>
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
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Clear filters
                </button>
              ) : null}
              {breakoutPick ? (
                <button
                  type="button"
                  onClick={() => handleSeriesClick(breakoutPick.id, "SEARCH_ZERO_RESULTS", "search_zero_breakout")}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Open {breakoutPick.title}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=popular&window=week")}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  This week&apos;s chart
                </button>
              )}
              {completedPick ? (
                <button
                  type="button"
                  onClick={() => handleSeriesClick(completedPick.id, "SEARCH_ZERO_RESULTS", "search_zero_completed")}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
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
                        sort: "popular",
                      },
                      { resetPage: true },
                    )
                  }
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Browse completed
                </button>
              )}
              {freeStartPick ? (
                <button
                  type="button"
                  onClick={() => handleSeriesClick(freeStartPick.id, "SEARCH_ZERO_RESULTS", "search_zero_free_start")}
                  className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/15"
                >
                  Open {freeStartPick.title}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=ttf&window=all")}
                  className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/15"
                >
                  Free unlock picks
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {hotKeywords.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateParam("q", item.value)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  {item.label}
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
            <div className="pt-2">{browsePathGrid}</div>
          </SurfacePanel>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                  Live result grid
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white">
                  {total.toLocaleString()} titles found.
                </h2>
              </div>
              <p className="text-sm text-neutral-400">
                Sorted by {SORT_OPTIONS.find((option) => option.id === sort)?.label || "Relevance"}
              </p>
            </div>

            {hasSparseResults ? (
              <SurfacePanel className="space-y-3 border-white/10 bg-white/[0.025]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                      Discovery backup
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-white">
                      Only a few results? Try a wider pick.
                    </h3>
                  </div>
                  <p className="text-sm text-neutral-400">
                    Keep this search if you want, or branch into something with a similar vibe.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      Widen filters
                    </button>
                  ) : null}
                  {breakoutPick ? (
                    <button
                      type="button"
                      onClick={() => handleSeriesClick(breakoutPick.id, "SEARCH_SPARSE_RESULTS", "search_sparse_breakout")}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      Open {breakoutPick.title}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/rankings?type=popular&window=week")}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      Compare with the chart
                    </button>
                  )}
                  {completedPick ? (
                    <button
                      type="button"
                      onClick={() => handleSeriesClick(completedPick.id, "SEARCH_SPARSE_RESULTS", "search_sparse_completed")}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
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
                            sort: "popular",
                          },
                          { resetPage: true },
                        )
                      }
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      Check completed picks
                    </button>
                  )}
                  {freeStartPick ? (
                    <button
                      type="button"
                      onClick={() => handleSeriesClick(freeStartPick.id, "SEARCH_SPARSE_RESULTS", "search_sparse_free_start")}
                      className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/15"
                    >
                      Open {freeStartPick.title}
                    </button>
                  ) : null}
                </div>
              </SurfacePanel>
            ) : null}

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
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => updateParam("page", String(page + 1))}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next page
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
