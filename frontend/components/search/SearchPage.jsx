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
import {
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
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
  formatInstallmentCount,
} from "../../lib/seriesFormatLabels";
import {
  readSearchHistory,
  saveSearchHistoryItem,
  subscribeSearchHistory,
} from "../../lib/searchHistory";
import {
  filterBlockedPublicKeywordItems,
  filterBlockedPublicSeries,
  filterBlockedPublicTextList,
} from "../../lib/publicCatalogVisibility";
import { buildEditorialCardHook } from "../../lib/editorialHooks";
import { isMatureGenreValue, isMatureTitle } from "../../lib/matureContent";

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
const StorefrontPathwaysGrid = dynamic(
  () => import("../common/StorefrontPathwaysGrid"),
);

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "popular", label: "Popular This Week" },
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
      <mark className="rounded border border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.16)] px-1 text-white">
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

  return filterBlockedPublicKeywordItems(items)
    .map((item, index) => normalizeKeywordItem(item, index))
    .filter(
      (item) =>
        item &&
        ![
          item.label,
          item.value,
          item.hint,
          item.badge,
          item.title,
        ].some((value) => isPublicSearchBlockedLabel(value)),
    )
    .filter(Boolean);
}

function isPublicSearchBlockedLabel(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return (
    isMatureGenreValue(normalized) ||
    normalized === "adult" ||
    normalized === "18+" ||
    normalized === "18 plus"
  );
}

function sanitizeSeriesList(items) {
  return filterBlockedPublicSeries(items).filter((item) => !isMatureTitle(item));
}

function sanitizeSuggestionList(items) {
  return filterBlockedPublicTextList(items).filter(
    (item) => !isPublicSearchBlockedLabel(item),
  );
}

function formatSearchSeriesMeta(series) {
  return [series?.type || "Series", series?.status || "Ongoing"]
    .filter(Boolean)
    .join(" / ");
}

function summarizeSearchDescription(series) {
  const editorialHook = buildEditorialCardHook(series, { maxLength: 96 });
  if (editorialHook) {
    return editorialHook;
  }

  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Finished series.";
  }

  if (Number(series?.episodeCount || 0) > 0) {
    const episodeCount = Number(series.episodeCount || 0);
    return `${formatInstallmentCount(series, episodeCount)}.`;
  }

  return "";
}

function getSearchSeriesBadge(series) {
  if (String(series?.status || "").toLowerCase() === "completed") {
    return "Finished";
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
    return "Top Pick";
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/54">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 font-display text-[2.15rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[2.8rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-[34rem] text-sm leading-7 text-white/68">
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {meta ? (
          <span className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/74 shadow-[0_12px_28px_rgba(8,6,20,0.18)]">
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
  const { forceDisableAdultMode } = useAdultGateStore();
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
  const adultFlag = "0";
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
      setResults(sanitizeSeriesList(response.data?.results || []));
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
        setCatalog(sanitizeSeriesList(response.data?.series || []));
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
          setSuggestions(sanitizeSuggestionList(response.data?.suggestions || []));
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
    () => recommendRails(catalog, behavior, progressMap, { isAdultMode: false }),
    [catalog, behavior, progressMap],
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
        title: "Trending",
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
  const showResultSections = Boolean(query);
  const heroTitle = "Find your next obsession";
  const heroDescription =
    "Search stories by mood, genre, format, or creator.";
  const mastheadLeadKeyword = hotKeywords[0] || keywords[0] || null;
  const recoPanelTitle = !query ? "Hot this week" : "What to try next";
  const railCardClass =
    "border border-white/10 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(17,13,24,0.98)_100%)] shadow-[0_20px_50px_rgba(8,6,20,0.28)]";
  const featuredRailCardClass =
    "border border-[rgba(255,79,154,0.18)] bg-[linear-gradient(180deg,rgba(48,23,41,0.96)_0%,rgba(22,14,28,0.98)_100%)] shadow-[0_22px_54px_rgba(8,6,20,0.3)]";
  const secondaryButtonClass = storefrontSecondaryButtonClass;
  const accentButtonClass = storefrontPrimaryButtonClass;
  const filterSelectClass =
    "h-11 rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-4 text-sm font-semibold tracking-[0.01em] text-white outline-none shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)] focus:border-white/20 focus:bg-[rgba(255,255,255,0.08)]";
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
                ? `${formatInstallmentCount(freeStartPick, startHereEpisodeCount)} ready from chapter one.`
                : "A strong first pick when you want something easy to jump into.",
            ctaLabel: "Start reading",
            onClick: () =>
              handleSeriesClick(
                freeStartPick.id,
                "SEARCH_PATH_FREE_START",
                "search_path_free_start",
              ),
            accentClass: featuredRailCardClass,
          }
        : {
            id: "free-unlock",
            eyebrow: "Start here",
            title: "Jump into a crowd favorite.",
            description: "A quick way to land on a title with a clean entry point.",
            ctaLabel: "View title",
            onClick: () => router.push("/rankings?view=start-here"),
            accentClass: featuredRailCardClass,
          },
      completedPick
        ? {
            id: "completed-binge-slot",
            eyebrow: "Binge this weekend",
            title: `${completedPick.title}.`,
            description: "Completed and ready when you want the full ride without waiting.",
            ctaLabel: "Start reading",
            onClick: () =>
              handleSeriesClick(
                completedPick.id,
                "SEARCH_PATH_BINGE",
                "search_path_binge",
              ),
            accentClass: railCardClass,
          }
        : {
            id: "completed-binge",
            eyebrow: "Binge this weekend",
            title: "Completed stories, no waiting.",
            description: "Open the finished shelf when you want payoff tonight.",
            ctaLabel: "View title",
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
            accentClass: railCardClass,
          },
      breakoutPick
        ? {
            id: "breakout-watch-slot",
            eyebrow: "Hot this week",
            title: `${breakoutPick.title}.`,
            description: leadHotKeyword?.label
              ? `If ${leadHotLabel.toLowerCase()} is your mood, this is the one readers are chasing right now.`
              : "A fast-rising pick that is pulling attention this week.",
            ctaLabel: "View title",
            onClick: () =>
              handleSeriesClick(
                breakoutPick.id,
                "SEARCH_PATH_BREAKOUT",
                "search_path_breakout",
              ),
            accentClass: railCardClass,
          }
        : {
            id: "breakout-watch",
            eyebrow: "Hot this week",
            title: `Try ${leadHotLabel}.`,
            description: "A good next move when you want a mood-led search instead of starting from scratch.",
            ctaLabel: "View title",
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
            accentClass: railCardClass,
          }
    ];
  }, [
    breakoutPick,
    completedPick,
    freeStartPick,
    handleSeriesClick,
    hotKeywords,
    keywords,
    railCardClass,
    featuredRailCardClass,
    router,
    updateParams,
  ]);
  const browsePathGrid = (
    <StorefrontPathwaysGrid
      cards={editorialBrowsePaths.filter(Boolean)}
      columnsClassName="md:grid-cols-2 xl:grid-cols-3"
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
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--gush-bg)] text-white">
      <div className="space-y-0">
        <section className="grid border-b border-white/10 bg-transparent xl:grid-cols-[minmax(0,1fr)_380px]">
          <SurfacePanel
            className="space-y-6 border-0 bg-transparent px-5 py-10 shadow-none sm:px-8 sm:py-14 lg:px-12 xl:px-16"
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
              <h1 className="mt-5 max-w-4xl font-display text-[2.75rem] font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-[3.5rem] xl:text-[4.4rem]">
                {heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68 sm:text-[0.98rem]">
                {heroDescription}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[rgba(8,7,14,0.42)] p-4 shadow-[0_20px_50px_rgba(8,6,20,0.28)] backdrop-blur-xl sm:p-5">
              <SearchBar
                variant="home"
                placeholder="Search titles, creators, or genres"
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
                      className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm font-semibold tracking-[0.01em] text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
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
                        className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm font-semibold tracking-[0.01em] text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
                      >
                        {item.label}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          </SurfacePanel>

          <SurfacePanel
            className="h-full space-y-5 p-5 sm:p-6 xl:p-8"
            tone="muted"
            accent="cyan"
            appearance="dark"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/52">
                {query ? "Best match" : "Now trending"}
              </p>
              <h2 className="mt-2 font-display text-[2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                {query ? "Closest to what you searched." : "Start with what readers are opening now."}
              </h2>
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
                className="group w-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(17,13,24,0.98)_100%)] p-4 text-left text-white shadow-[0_20px_50px_rgba(8,6,20,0.28)] transition-all hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_26px_58px_rgba(8,6,20,0.34)]"
              >
                <div className="grid gap-4 grid-cols-[88px_minmax(0,1fr)]">
                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(8,7,14,0.8)] shadow-[0_16px_38px_rgba(8,6,20,0.24)]">
                    <Cover
                      tone={leadSearchResult.coverTone}
                      coverUrl={leadSearchResult.coverUrl}
                      label={leadSearchResult.title}
                      eyebrow=""
                      badge={getSearchSeriesBadge(leadSearchResult)}
                      genres={leadSearchResult.genres}
                      // Avoid duplicating the exact same accessible cover name when the lead result
                      // is also present in the grid below (Playwright strict-mode role queries).
                      seriesType=""
                      className="aspect-[3/4] w-full"
                      sizes="88px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/44">
                      {query ? "Best match" : "Hot this week"}
                    </p>
                    <h3 className="mt-2 font-display text-[1.35rem] font-semibold leading-[0.94] tracking-[-0.04em] text-white">
                      {leadSearchResult.title}
                    </h3>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/52">
                      {formatSearchSeriesMeta(leadSearchResult)}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/66">
                      {summarizeSearchDescription(leadSearchResult)}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                        View title
                      </span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] text-white shadow-[0_8px_20px_rgba(8,6,20,0.18)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:bg-[rgba(255,79,154,0.14)]">
                        <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              <div className={`${storefrontInfoCardClass} space-y-2`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
                  Mood shortcut
                </p>
                <h3 className="font-display text-[1.35rem] font-semibold leading-[0.94] tracking-[-0.04em] text-white">
                  {mastheadLeadKeyword ? `Try ${mastheadLeadKeyword.label}.` : "Search by feeling first."}
                </h3>
                <p className="text-sm leading-6 text-white/66">
                  {mastheadLeadKeyword?.hint ||
                    "Start with a mood, then narrow by creator or format once something catches."}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className={`${storefrontInfoCardClass} space-y-2`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
                  Search tip
                </p>
                <p className="text-sm leading-6 text-white/68">
                  Try a vibe like <span className="text-white">dark mystery</span>, <span className="text-white">soft romance</span>, or <span className="text-white">weekend binge</span>.
                </p>
              </div>
              {!query && history.length > 0 ? (
                <div className={`${storefrontInfoCardClass} space-y-2`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
                    Pick up where you left off
                  </p>
                  <p className="text-sm leading-6 text-white/68">
                    Your recent searches stay close so it is easier to jump back into a mood or creator.
                  </p>
                </div>
              ) : null}
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
          <div className="rounded-[24px] border border-[rgba(244,201,93,0.24)] bg-[rgba(27,22,14,0.88)] px-4 py-3 text-sm text-white/84 shadow-[0_16px_38px_rgba(8,6,20,0.24)]">
            Saved results loaded. Reconnect to refresh.
          </div>
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
            className="space-y-8"
            appearance="dark"
            accent="cyan"
          >
            <SearchSectionHeader
              eyebrow="Next up"
              title={recoPanelTitle}
              description="A tighter shelf of titles that still fit the mood."
              actions={
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHotWindow("day")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] shadow-[0_10px_24px_rgba(8,6,20,0.16)] transition-all ${
                      hotWindow === "day"
                        ? "border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.14)] text-[#ffd7e8]"
                        : "border-white/12 bg-[rgba(255,255,255,0.05)] text-white/78 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setHotWindow("week")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] shadow-[0_10px_24px_rgba(8,6,20,0.16)] transition-all ${
                      hotWindow === "week"
                        ? "border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.14)] text-[#ffd7e8]"
                        : "border-white/12 bg-[rgba(255,255,255,0.05)] text-white/78 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
                    }`}
                  >
                    Week
                  </button>
                </div>
              }
            />

            <div className="space-y-8">
              {visibleRecoRails.map((rail) => (
                <section
                  key={rail.id}
                  className="space-y-4"
                  data-testid={`search-rail-${rail.id}`}
                >
                  <h3 className="font-display text-lg font-semibold tracking-[-0.03em] text-white">
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
              className="space-y-5"
              appearance="dark"
              accent="cyan"
            >
              <SearchSectionHeader
                eyebrow="Results"
                title={query ? `"${query}"` : "Browse"}
                description={
                  query
                    ? "Best matches across stories, formats, and creator shelves."
                    : "Browse the catalog by format, mood, or release pace."
                }
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters(true)}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-4 text-sm font-semibold tracking-[0.01em] text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      <SlidersHorizontal size={16} />
                      <span>Filters</span>
                      {activeFilterCount > 0 ? (
                        <span className="rounded-full border border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.14)] px-2 py-0.5 text-[11px] font-semibold text-[#ffd7e8]">
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
                title="Search is down right now."
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
                className="space-y-4"
                appearance="dark"
                accent="cyan"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/52">
                    No results
                  </p>
                  <h2 className="mt-2 font-display text-[2.2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                    Nothing landed this time.
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
                      View title
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/rankings?view=featured")}
                      className={secondaryButtonClass}
                    >
                      Hot this week
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
                      {completedPick.title}
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
                      Finished
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
                      Start reading
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/rankings?view=start-here")}
                      className={accentButtonClass}
                    >
                      Start reading
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
                      className="group block overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(17,13,24,0.98)_100%)] p-5 text-left shadow-[0_20px_50px_rgba(8,6,20,0.28)] transition-all duration-200 hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_26px_58px_rgba(8,6,20,0.34)]"
                      aria-label={`View ${series.title}`}
                    >
                      <div className="grid gap-5 sm:grid-cols-[132px_minmax(0,1fr)]">
                        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(8,7,14,0.8)] shadow-[0_16px_38px_rgba(8,6,20,0.24)]">
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
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/48">
                            {series.type || "Series"}
                          </p>
                          <h3 className="font-display text-[1.32rem] font-semibold leading-tight tracking-[-0.04em] text-white">
                            {highlight(series.title, query)}
                          </h3>
                          <p className="text-sm text-white/62">
                            {formatSearchSeriesMeta(series)}
                          </p>
                          <p className="line-clamp-2 text-sm leading-6 text-white/66">
                            {summarizeSearchDescription(series)}
                          </p>
                          <div className="flex items-center justify-between border-t border-white/10 pt-3">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                              View title
                            </span>
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] text-white shadow-[0_8px_20px_rgba(8,6,20,0.18)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:bg-[rgba(255,79,154,0.14)]">
                              <ArrowRight className="size-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {total > PAGE_SIZE ? (
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
