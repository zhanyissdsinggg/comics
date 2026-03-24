"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SeriesHeader from "./SeriesHeader";
import AdultGateBlockingPanel from "./AdultGateBlockingPanel";
import SeriesArrivalPanel from "./SeriesArrivalPanel";
import SiteHeader from "../layout/SiteHeader";
import Skeleton from "../common/Skeleton";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { apiGet } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";
import { useWalletStore } from "../../store/useWalletStore";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useRewardsStore } from "../../store/useRewardsStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useCouponStore } from "../../store/useCouponStore";
import { useProgressStore } from "../../store/useProgressStore";
import {
  buildPathWithAttribution,
  loadPersistedPaymentAttribution,
  mergePaymentAttribution,
  persistPaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import { focusInteractiveTarget } from "../../lib/focusTarget";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { buildCreatorHref, slugifyCreatorName } from "../../lib/creators";
import {
  buildEpisodeAccessStateMap,
  getEpisodeAvailabilitySummary,
  getSeriesPrimaryReadAction,
} from "../../lib/episodeAccessState";

function EpisodeListSkeleton() {
  return (
    <section className="mt-6 rounded-[28px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:mt-8 sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-black/6 pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-4 w-10 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={`episode-list-skeleton-${index}`} className="h-24 w-full rounded-[24px]" />
        ))}
      </div>
    </section>
  );
}

const AdultLoginModal = dynamic(() => import("./AdultLoginModal"), {
  ssr: false,
});
const AdultAgeModal = dynamic(() => import("./AdultAgeModal"), {
  ssr: false,
});
const CommentsSection = dynamic(() => import("./CommentsSection"), {
  ssr: false,
});
const SimilarSeriesSection = dynamic(() => import("./SimilarSeriesSection"), {
  ssr: false,
});
const EpisodeList = dynamic(() => import("./EpisodeList"), {
  loading: () => <EpisodeListSkeleton />,
});

function getFirstEpisodeId(episodes) {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return null;
  }
  const sorted = [...episodes].sort((a, b) => {
    const aNum = a?.number ?? 0;
    const bNum = b?.number ?? 0;
    return aNum - bNum;
  });
  return sorted[0]?.id || null;
}

function syncSeriesRatingCache(seriesId, nextRating, nextCount) {
  if (typeof window === "undefined" || !seriesId) {
    return;
  }

  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(`mn_api_cache:/api/series/${seriesId}`))
      .forEach((key) => {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw);
        if (!parsed?.response?.data?.series) {
          return;
        }

        parsed.response.data.series.rating = nextRating;
        parsed.response.data.series.ratingCount = nextCount;
        window.localStorage.setItem(key, JSON.stringify(parsed));
      });
  } catch {
    // ignore cache sync issues
  }
}

function hasSeriesPayload(payload) {
  return Boolean(payload?.series?.id);
}

function getInitialSeriesLoading(hasPayload, initialState) {
  return (
    !hasPayload &&
    initialState !== "not-found" &&
    initialState !== "adult-gated" &&
    initialState !== "unavailable"
  );
}

function getInitialSeriesError(hasPayload, initialState) {
  if (hasPayload) {
    return null;
  }
  if (initialState === "not-found") {
    return "NOT_FOUND";
  }
  if (initialState === "adult-gated") {
    return "ADULT_GATED";
  }
  if (initialState === "unavailable") {
    return "UNAVAILABLE";
  }
  return null;
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function openAuthModal() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("auth:open"));
}

export default function SeriesPage({
  seriesId,
  initialSeriesPayload = null,
  initialSeriesState = "unavailable",
  initialGateStatus = "OK",
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasInitialSeriesPayload = hasSeriesPayload(initialSeriesPayload);
  const [data, setData] = useState(() => (hasInitialSeriesPayload ? initialSeriesPayload : null));
  const [loading, setLoading] = useState(() =>
    getInitialSeriesLoading(hasInitialSeriesPayload, initialSeriesState),
  );
  const [error, setError] = useState(() =>
    getInitialSeriesError(hasInitialSeriesPayload, initialSeriesState),
  );
  const [gateStatus, setGateStatus] = useState(() =>
    initialSeriesState === "adult-gated" ? initialGateStatus || "NEED_LOGIN" : "OK",
  );
  const [activeModal, setActiveModal] = useState(null);
  const [showSecondarySections, setShowSecondarySections] = useState(false);
  const [authError, setAuthError] = useState("");
  const [commerceNotice, setCommerceNotice] = useState(null);
  const gateReportedRef = useRef(false);
  const requestRef = useRef(0);
  const dataRef = useRef(data);
  const secondarySectionsRef = useRef(null);
  const desktopPrimaryActionRef = useRef(null);
  const mobilePrimaryActionRef = useRef(null);

  const walletStore = useWalletStore();
  const { loadWallet } = walletStore;
  const { bySeriesId, loadEntitlement, unlockEpisode, claimTTF } =
    useEntitlementStore();
  const { report } = useRewardsStore();
  const { followedSeriesIds, loadFollowed, follow, unfollow } = useFollowStore();
  const { viewSeries, followSeries } = useBehaviorStore();
  const { signIn, isSignedIn, hydrated } = useAuthStore();
  const { coupons, loadCoupons } = useCouponStore();
  const {
    adultConfirmed,
    ageRuleKey,
    legalAge,
    isAdultMode,
    requestAdultToggle,
    confirmAge: confirmAdultAge,
    forceDisableAdultMode,
  } = useAdultGateStore();
  const { bySeriesId: progressBySeriesId, getProgress, loadProgress } = useProgressStore();
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(searchParams),
    [searchParams],
  );

  const series = data?.series || {};
  const episodes = useMemo(
    () => (Array.isArray(data?.episodes) ? data.episodes : []),
    [data?.episodes]
  );
  const entitlement = bySeriesId[seriesId] || { seriesId, unlockedEpisodeIds: [] };
  const firstEpisodeId = useMemo(
    () => getFirstEpisodeId(episodes),
    [episodes]
  );
  const [lastReadEpisodeId, setLastReadEpisodeId] = useState(null);
  const progress = useMemo(
    () => progressBySeriesId?.[seriesId] || getProgress(seriesId),
    [progressBySeriesId, getProgress, seriesId]
  );
  const lastReadEpisode = useMemo(
    () =>
      progress?.lastEpisodeId
        ? episodes.find((episode) => episode?.id === progress.lastEpisodeId) || null
        : null,
    [episodes, progress?.lastEpisodeId],
  );

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (hasInitialSeriesPayload) {
      setData(initialSeriesPayload);
      setLoading(false);
      setError(null);
      setGateStatus("OK");
      return;
    }

    setData(null);
    setLoading(getInitialSeriesLoading(hasInitialSeriesPayload, initialSeriesState));
    setError(getInitialSeriesError(hasInitialSeriesPayload, initialSeriesState));
    setGateStatus(initialSeriesState === "adult-gated" ? initialGateStatus || "NEED_LOGIN" : "OK");
  }, [
    hasInitialSeriesPayload,
    initialGateStatus,
    initialSeriesPayload,
    initialSeriesState,
    seriesId,
  ]);

  const fetchSeries = useCallback(
    async ({ bust = false, showLoading = true } = {}) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const adultFlag = isAdultMode ? "1" : "0";
      const path = `/api/series/${seriesId}?adult=${adultFlag}`;
      const isCurrentRequest = () => requestRef.current === requestId;
      const applyFailure = (response) => {
        if (!isCurrentRequest()) {
          return false;
        }

        const hasVisibleData = Boolean(dataRef.current?.series?.id);

        if (!showLoading && hasVisibleData && response.error !== "ADULT_GATED") {
          setLoading(false);
          return true;
        }

        if (response.status === 403 || response.error === "ADULT_GATED") {
          setError("ADULT_GATED");
          if (response.reason === "NEED_LOGIN") {
            forceDisableAdultMode();
          }
          if (response.reason) {
            setGateStatus(response.reason);
          }
          if (!gateReportedRef.current) {
            trackEvent("adult_gate_blocked", {
              source: "series",
              seriesId,
              reason: response.reason,
              requestId: response.requestId,
            });
            gateReportedRef.current = true;
          }
        } else if (response.status === 404 || response.error === "NOT_FOUND") {
          setData(null);
          setError("NOT_FOUND");
        } else if (response.status === 401) {
          window.dispatchEvent(new CustomEvent("auth:open"));
          setError("FETCH_ERROR");
        } else {
          setError("UNAVAILABLE");
        }
        if (showLoading) {
          setLoading(false);
        }
        return true;
      };

      const response = await apiGet(path, bust ? { bust: true, dedupeMs: 0 } : undefined);
      if (!isCurrentRequest()) {
        return;
      }

      if (!response.ok) {
        applyFailure(response);
        return;
      }

      if (response.data?.error === "ADULT_GATED") {
        applyFailure({
          ...response,
          ok: false,
          status: 403,
          error: "ADULT_GATED",
          reason: response.data?.reason,
          requestId: response.data?.requestId,
        });
        return;
      }

      setData(response.data);
      setGateStatus("OK");
      if (showLoading) {
        setLoading(false);
      }

      if (!bust && response.stale) {
        apiGet(path, {
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          if (!isCurrentRequest()) {
            return;
          }
          if (!freshResponse.ok) {
            applyFailure(freshResponse);
            return;
          }
          if (freshResponse.data?.error === "ADULT_GATED") {
            applyFailure({
              ...freshResponse,
              ok: false,
              status: 403,
              error: "ADULT_GATED",
              reason: freshResponse.data?.reason,
              requestId: freshResponse.data?.requestId,
            });
            return;
          }
          setData(freshResponse.data);
          setGateStatus("OK");
        });
      }
    },
    [forceDisableAdultMode, isAdultMode, seriesId]
  );

  useEffect(() => {
    fetchSeries({
      showLoading: getInitialSeriesLoading(hasInitialSeriesPayload, initialSeriesState),
    });
  }, [fetchSeries, hasInitialSeriesPayload, initialSeriesState]);

  useEffect(() => {
    if (!routeAttribution) {
      return;
    }

    const attribution = mergePaymentAttribution(
      loadPersistedPaymentAttribution(),
      routeAttribution,
    );
    if (attribution) {
      persistPaymentAttribution(attribution);
    }
  }, [routeAttribution]);

  useEffect(() => {
    gateReportedRef.current = false;
  }, [seriesId]);

  useEffect(() => {
    if (!seriesId) {
      return;
    }
    const progress = progressBySeriesId?.[seriesId] || getProgress(seriesId);
    if (progress?.lastEpisodeId) {
      setLastReadEpisodeId(progress.lastEpisodeId);
      return;
    }
    setLastReadEpisodeId(null);
  }, [seriesId, data?.series?.id, getProgress, progressBySeriesId]);

  useEffect(() => {
    if (data?.series?.id) {
      trackEvent("view_series", { seriesId: data.series.id });
      viewSeries(data.series.id);
      if (isSignedIn) {
        loadWallet();
        loadEntitlement(data.series.id);
        loadFollowed();
        loadCoupons();
        loadProgress();
      }
    }
  }, [
    data?.series?.id,
    isSignedIn,
    loadCoupons,
    loadEntitlement,
    loadFollowed,
    loadProgress,
    loadWallet,
    viewSeries,
  ]);

  useEffect(() => {
    if (error === "ADULT_GATED") {
      return;
    }
    if (!series?.adult) {
      setGateStatus("OK");
      return;
    }
    if (!hydrated) {
      return;
    }
    if (!isSignedIn) {
      setGateStatus("NEED_LOGIN");
      return;
    }
    if (!adultConfirmed || !isAdultMode) {
      setGateStatus("NEED_AGE_CONFIRM");
      return;
    }
    setGateStatus("OK");
  }, [adultConfirmed, error, hydrated, isAdultMode, isSignedIn, series?.adult]);

  useEffect(() => {
    setShowSecondarySections(false);
  }, [seriesId]);

  useEffect(() => {
    setCommerceNotice(
      getCommerceSuccessPresentation(consumeCommerceSuccessForPath(`/series/${seriesId}`)),
    );
  }, [seriesId]);

  useEffect(() => {
    if (!commerceNotice) {
      return undefined;
    }

    return focusInteractiveTarget(() => {
      const prefersDesktop =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width: 640px)").matches;
      return prefersDesktop ? desktopPrimaryActionRef.current : mobilePrimaryActionRef.current;
    });
  }, [commerceNotice]);

  useEffect(() => {
    if (showSecondarySections || loading || error) {
      return;
    }
    const target = secondarySectionsRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setShowSecondarySections(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShowSecondarySections(true);
          observer.disconnect();
        }
      },
      { rootMargin: "260px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [showSecondarySections, loading, error]);

  const openGateModal = () => {
    if (!hydrated) {
      setGateStatus("NEED_LOGIN");
      setActiveModal("login");
      return;
    }
    const status = requestAdultToggle(isSignedIn);
    setGateStatus(status);
    if (status === "NEED_LOGIN") {
      setActiveModal("login");
      return;
    }
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    setActiveModal(null);
    fetchSeries({ bust: true });
  };

  const handleLogin = async ({ email, password, mode }) => {
    const response = await signIn(email, password, mode);
    if (response?.status === 202) {
      setAuthError("");
      return response;
    }
    if (!response.ok) {
      setAuthError("Invalid email or password.");
      return;
    }
    setAuthError("");
    const status = requestAdultToggle(true);
    setGateStatus(status);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return response;
    }
    setActiveModal(null);
    if (status === "OK") {
      fetchSeries({ bust: true });
    }
    return response;
  };

  const handleAgeConfirm = () => {
    confirmAdultAge(ageRuleKey);
    setActiveModal(null);
    setGateStatus("OK");
    fetchSeries({ bust: true });
  };

  const handleRead = useCallback((seriesIdValue, episodeId) => {
    trackEvent("click_episode_read", { seriesId: seriesIdValue, episodeId });
    router.push(`/read/${seriesIdValue}/${episodeId}`);
  }, [router]);

  const handleUnlock = useCallback(
    (seriesIdValue, episodeId, idempotencyKey) =>
      unlockEpisode(seriesIdValue, episodeId, idempotencyKey),
    [unlockEpisode]
  );

  const handleClaim = useCallback(
    (seriesIdValue, episodeId) => claimTTF(seriesIdValue, episodeId),
    [claimTTF]
  );

  const handleSubscribe = useCallback((seriesIdValue, episodeId) => {
    trackEvent("click_subscribe_from_ttf", { seriesId: seriesIdValue, episodeId });
    router.push(
      buildPathWithAttribution("/subscribe", {
        entryPoint: "SERIES_TTF",
        sourcePath: `/series/${seriesIdValue}`,
        sourceSeriesId: seriesIdValue,
        sourceEpisodeId: episodeId || undefined,
        returnTo: `/series/${seriesIdValue}`,
      })
    );
  }, [router]);

  const handleContinue = lastReadEpisodeId
    ? () => handleRead(seriesId, lastReadEpisodeId)
    : null;
  const handleStart = firstEpisodeId
    ? () => handleRead(seriesId, firstEpisodeId)
    : null;
  const handleOpenStore = useCallback(() => {
    router.push(
      buildPathWithAttribution(
        "/store",
        {
          entryPoint: "SERIES_HEADER_STORE",
          sourcePath: `/series/${seriesId}`,
          sourceSeriesId: seriesId,
          returnTo: `/series/${seriesId}`,
        },
        { focus: "auto" },
      ),
    );
  }, [router, seriesId]);
  const handleOpenMembership = useCallback(() => {
    router.push(
      buildPathWithAttribution("/subscribe", {
        entryPoint: "SERIES_HEADER_MEMBERSHIP",
        sourcePath: `/series/${seriesId}`,
        sourceSeriesId: seriesId,
        returnTo: `/series/${seriesId}`,
      }),
    );
  }, [router, seriesId]);
  const creatorHref = useMemo(() => {
    const targetPath = buildCreatorHref(series?.author || "Studio");
    return buildPathWithAttribution(targetPath, {
      entryPoint: "SERIES_CREATOR",
      campaignId: slugifyCreatorName(series?.author || "Studio"),
      sourcePath: `/series/${seriesId}`,
      sourceSeriesId: seriesId,
      returnTo: `/series/${seriesId}`,
    });
  }, [series?.author, seriesId]);
  const latestEpisode = useMemo(() => {
    if (!Array.isArray(episodes) || episodes.length === 0) {
      return null;
    }

    return [...episodes].sort((left, right) => Number(right?.number || 0) - Number(left?.number || 0))[0] || null;
  }, [episodes]);
  const primaryReadAction = useMemo(
    () =>
      getSeriesPrimaryReadAction({
        series,
        episodes,
        progress,
        unlockedEpisodeIds: entitlement?.unlockedEpisodeIds || [],
        subscription: walletStore?.subscription,
        subscriptionUsage: walletStore?.subscriptionUsage,
        coupons,
        isSignedIn,
      }),
    [
      coupons,
      entitlement?.unlockedEpisodeIds,
      episodes,
      isSignedIn,
      progress,
      series,
      walletStore?.subscription,
      walletStore?.subscriptionUsage,
    ],
  );
  const seriesAccessSummary = useMemo(() => {
    const episodeStateMap = buildEpisodeAccessStateMap({
      episodes,
      unlockedEpisodeIds: entitlement?.unlockedEpisodeIds || [],
      subscription: walletStore?.subscription,
      subscriptionUsage: walletStore?.subscriptionUsage,
      coupons,
      fallbackPrice: series?.pricing?.episodePrice ?? 0,
    });

    return getEpisodeAvailabilitySummary({
      episodes,
      episodeStateMap,
    });
  }, [
    coupons,
    entitlement?.unlockedEpisodeIds,
    episodes,
    series?.pricing?.episodePrice,
    walletStore?.subscription,
    walletStore?.subscriptionUsage,
  ]);
  const handleSeriesPrimaryAction = useCallback(async () => {
    if (!primaryReadAction) {
      return;
    }

    const targetEpisodeId = primaryReadAction.episodeId;
    if (!targetEpisodeId) {
      if (primaryReadAction.actionKind === "subscribe") {
        handleSubscribe(seriesId, null);
      }
      return;
    }

    if (primaryReadAction.actionKind === "read" || primaryReadAction.actionKind === "preview") {
      handleRead(seriesId, targetEpisodeId);
      return;
    }

    if (primaryReadAction.actionKind === "claim") {
      let response;
      try {
        response = await handleClaim(seriesId, targetEpisodeId);
      } catch {
        response = { ok: false, status: 500, error: "CLAIM_FAILED" };
      }

      if (response.ok) {
        handleRead(seriesId, targetEpisodeId);
      } else if (response.status === 401) {
        openAuthModal();
      }
      return;
    }

    if (primaryReadAction.actionKind === "unlock") {
      let response;
      try {
        response = await handleUnlock(seriesId, targetEpisodeId, createIdempotencyKey());
      } catch {
        response = { ok: false, status: 500, error: "UNLOCK_FAILED" };
      }

      if (response.ok) {
        handleRead(seriesId, targetEpisodeId);
      } else if (response.status === 401) {
        openAuthModal();
      } else if (response.status === 402) {
        handleOpenStore();
      }
      return;
    }

    if (primaryReadAction.actionKind === "subscribe") {
      handleSubscribe(seriesId, targetEpisodeId);
    }
  }, [
    handleClaim,
    handleOpenStore,
    handleRead,
    handleSubscribe,
    handleUnlock,
    primaryReadAction,
    seriesId,
  ]);

  const isFollowing = followedSeriesIds.includes(seriesId);

  const handleFollowToggle = async () => {
    if (isFollowing) {
      await unfollow(seriesId);
      return;
    }
    await follow(seriesId);
    report("FOLLOW_SERIES");
    followSeries(seriesId);
  };

  const handleRatingUpdate = (nextRating, nextCount) => {
    syncSeriesRatingCache(seriesId, nextRating, nextCount);
    setData((prev) => {
      if (!prev?.series) {
        return prev;
      }
      return {
        ...prev,
        series: {
          ...prev.series,
          rating: nextRating,
          ratingCount: nextCount,
        },
      };
    });
  };

  if (loading) {
    return (
      <main className="gush-page-shell overflow-hidden">
        <div className="gush-page-ambient h-[clamp(21rem,40vw,30rem)]" />
        <SiteHeader variant="light" />
        <div className="gush-page-main">
          <section className="rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
              <Skeleton className="aspect-[3/4] w-full rounded-[28px]" />
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                </div>
                <Skeleton className="h-12 w-4/5 rounded-[20px]" />
                <Skeleton className="h-5 w-3/5 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-4 w-[92%] rounded-full" />
                  <Skeleton className="h-4 w-[76%] rounded-full" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-36 rounded-full" />
                  <Skeleton className="h-9 w-32 rounded-full" />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={`series-header-skeleton-${index}`} className="h-28 rounded-[22px]" />
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="mt-6 rounded-[28px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center justify-between border-b border-black/6 pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-9 w-24 rounded-full" />
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={`episode-${index}`} className="h-20 w-full rounded-[24px]" />
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (error === "NOT_FOUND") {
    return (
      <main className="gush-page-shell overflow-hidden">
        <div className="gush-page-ambient h-[clamp(21rem,40vw,30rem)]" />
        <SiteHeader variant="light" />
        <div className="gush-page-main max-w-[960px]">
          <div className="rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,248,252,0.98))] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Series unavailable
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              This title is not available in the public catalog.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-[15px]">
              Try Top Series, browse the wider catalog, or search for another title so the session keeps moving.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Browse Top Series
              </button>
              <button
                type="button"
                onClick={() => router.push("/comics")}
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                Browse comics
              </button>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                Search titles
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error && error !== "ADULT_GATED") {
    const isUnavailable = error === "UNAVAILABLE";

    return (
      <main className="gush-page-shell overflow-hidden">
        <div className="gush-page-ambient h-[clamp(21rem,40vw,30rem)]" />
        <SiteHeader variant="light" />
        <div className="gush-page-main">
          <div className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.98))] p-6 text-center shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
            <p className="mb-2 text-sm font-semibold text-red-600">
              {isUnavailable ? "Series details are unavailable right now" : "Series details could not load"}
            </p>
            <p className="mb-4 text-xs text-red-500">
              {isUnavailable
                ? "Retry in a moment, search for another title, or head back to Top Series."
                : "We could not load the cover, episode list, or access details for this title. Retry, search, or head back to Top Series."}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => fetchSeries({ bust: true })}
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings?type=popular&window=week")}
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                Browse Top Series
              </button>
              <button
                type="button"
                onClick={() => router.push(isUnavailable ? "/search" : "/store")}
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                {isUnavailable ? "Search titles" : "See point packs"}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if ((series?.adult || error === "ADULT_GATED") && gateStatus !== "OK") {
    return (
      <main className="gush-page-shell overflow-hidden">
        <div className="gush-page-ambient h-[clamp(21rem,40vw,30rem)]" />
        <SiteHeader variant="light" />

        <AdultGateBlockingPanel status={gateStatus} onOpenModal={openGateModal} />
        {activeModal === "login" ? (
          <AdultLoginModal
            open
            onClose={() => {
              setActiveModal(null);
              setAuthError("");
            }}
            onSubmit={handleLogin}
            errorMessage={authError}
          />
        ) : null}
        {activeModal === "age" ? (
          <AdultAgeModal
            open
            onClose={() => setActiveModal(null)}
            onConfirm={handleAgeConfirm}
            ageRuleKey={ageRuleKey}
            legalAge={legalAge}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className="gush-page-shell overflow-hidden">
      <div className="gush-page-ambient h-[clamp(21rem,40vw,30rem)]" />
      <SiteHeader variant="light" />
      <div className="gush-page-main">
        {commerceNotice ? (
          <div className="pt-6">
            <CommerceSuccessBanner
              notice={commerceNotice}
              onDismiss={() => setCommerceNotice(null)}
              className="mb-6"
            />
          </div>
        ) : null}

        <SeriesHeader
          series={series}
          progress={progress}
          lastReadEpisode={lastReadEpisode}
          episodeCount={episodes.length}
          latestEpisode={latestEpisode}
          onPrimaryAction={handleSeriesPrimaryAction}
          onContinue={handleContinue}
          onStart={handleStart}
          primaryActionLabelOverride={primaryReadAction?.label || ""}
          accessSummary={seriesAccessSummary}
          onFollowToggle={handleFollowToggle}
          isFollowing={isFollowing}
          desktopPrimaryActionRef={desktopPrimaryActionRef}
          mobilePrimaryActionRef={mobilePrimaryActionRef}
          highlightPrimaryAction={Boolean(commerceNotice)}
          creatorHref={creatorHref}
          onOpenStore={handleOpenStore}
          onOpenMembership={handleOpenMembership}
        />

        <EpisodeList
          series={series}
          episodes={episodes}
          entitlement={entitlement}
          wallet={walletStore}
          coupons={coupons}
          isSignedIn={isSignedIn}
          onRead={handleRead}
          onUnlock={handleUnlock}
          onClaim={handleClaim}
          onSubscribe={handleSubscribe}
        />

        <SeriesArrivalPanel
          series={series}
          attribution={routeAttribution}
          creatorHref={creatorHref}
        />

        <div ref={secondarySectionsRef} className="mt-8 h-px w-full" />
        {showSecondarySections ? (
          <>
            <SimilarSeriesSection seriesId={seriesId} series={series} />
            <div className="mt-8 border-t border-black/6 pt-6" />
            <CommentsSection
              seriesId={seriesId}
              rating={series.rating}
              ratingCount={series.ratingCount}
              onRatingUpdate={handleRatingUpdate}
              seriesTitle={series.title}
              author={series.author}
              status={series.status}
              genres={series.genres}
              followers={series.followers}
              isFollowing={isFollowing}
              onFollowToggle={handleFollowToggle}
              sharePath={`/series/${seriesId}`}
            />
          </>
        ) : (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        )}
      </div>

      {activeModal === "login" ? (
        <AdultLoginModal
          open
          onClose={() => {
            setActiveModal(null);
            setAuthError("");
          }}
          onSubmit={handleLogin}
          errorMessage={authError}
        />
      ) : null}
      {activeModal === "age" ? (
        <AdultAgeModal
          open
          onClose={() => setActiveModal(null)}
          onConfirm={handleAgeConfirm}
          ageRuleKey={ageRuleKey}
          legalAge={legalAge}
        />
      ) : null}
    </main>
  );
}
