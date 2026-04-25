"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SeriesHeader from "./SeriesHeader";
import AdultGateBlockingPanel from "./AdultGateBlockingPanel";
import SiteHeader from "../layout/SiteHeader";
import NetworkFallback from "../common/NetworkFallback";
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
import { buildDiscoveryContext } from "../../lib/discoveryContext";
import { resolveSeriesCreatorIdentity } from "../../lib/creatorIdentity";
import { getSeriesPrimaryReadAction } from "../../lib/episodeAccessState";

function EpisodeListSkeleton() {
  return (
    <section className="mt-6 rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_20px_46px_rgba(15,23,42,0.08)] sm:mt-8 sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-black/8 pb-4">
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
          <Skeleton
            key={`episode-list-skeleton-${index}`}
            className="h-24 w-full rounded-[24px]"
          />
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
  const [data, setData] = useState(() =>
    hasInitialSeriesPayload ? initialSeriesPayload : null,
  );
  const [loading, setLoading] = useState(() =>
    getInitialSeriesLoading(hasInitialSeriesPayload, initialSeriesState),
  );
  const [error, setError] = useState(() =>
    getInitialSeriesError(hasInitialSeriesPayload, initialSeriesState),
  );
  const [gateStatus, setGateStatus] = useState(() =>
    initialSeriesState === "adult-gated"
      ? initialGateStatus || "NEED_LOGIN"
      : "OK",
  );
  const [activeModal, setActiveModal] = useState(null);
  const [showSecondarySections, setShowSecondarySections] = useState(false);
  const [interactiveStory, setInteractiveStory] = useState(null);
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
  const { followedSeriesIds, loadFollowed, follow, unfollow } =
    useFollowStore();
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
  const {
    bySeriesId: progressBySeriesId,
    getProgress,
    loadProgress,
  } = useProgressStore();
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(searchParams),
    [searchParams],
  );

  const series = data?.series || {};
  const discoveryContext = useMemo(
    () => buildDiscoveryContext(series, routeAttribution),
    [routeAttribution, series],
  );
  const episodes = useMemo(
    () => (Array.isArray(data?.episodes) ? data.episodes : []),
    [data?.episodes],
  );
  const creatorPresentation = useMemo(
    () => resolveSeriesCreatorIdentity(series),
    [series],
  );
  const entitlement = bySeriesId[seriesId] || {
    seriesId,
    unlockedEpisodeIds: [],
  };
  const firstEpisodeId = useMemo(() => getFirstEpisodeId(episodes), [episodes]);
  const progress = useMemo(
    () => progressBySeriesId?.[seriesId] || getProgress(seriesId),
    [progressBySeriesId, getProgress, seriesId],
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
    setLoading(
      getInitialSeriesLoading(hasInitialSeriesPayload, initialSeriesState),
    );
    setError(
      getInitialSeriesError(hasInitialSeriesPayload, initialSeriesState),
    );
    setGateStatus(
      initialSeriesState === "adult-gated"
        ? initialGateStatus || "NEED_LOGIN"
        : "OK",
    );
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
      const detailPath = `/api/series/${seriesId}?adult=${adultFlag}`;
      const isCurrentRequest = () => requestRef.current === requestId;
      const applyFailure = (response) => {
        if (!isCurrentRequest()) {
          return false;
        }

        const hasVisibleData = Boolean(dataRef.current?.series?.id);

        if (
          !showLoading &&
          hasVisibleData &&
          response.error !== "ADULT_GATED"
        ) {
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

      const response = await apiGet(
        detailPath,
        bust ? { bust: true, dedupeMs: 0 } : undefined,
      );
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
        apiGet(detailPath, {
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
    [forceDisableAdultMode, isAdultMode, seriesId],
  );

  useEffect(() => {
    fetchSeries({
      showLoading: getInitialSeriesLoading(
        hasInitialSeriesPayload,
        initialSeriesState,
      ),
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
    const seriesType = String(data?.series?.type || "").trim().toLowerCase();
    if (!data?.series?.id || seriesType !== "novel") {
      setInteractiveStory(null);
      return;
    }

    let cancelled = false;
    apiGet(`/api/interactive-stories/by-series/${encodeURIComponent(seriesId)}`, {
      suppressAuthModal: true,
      cacheMs: 30_000,
    })
      .then((response) => {
        if (cancelled) {
          return;
        }
        if (response.ok && response.data?.story?.id) {
          setInteractiveStory(response.data.story);
          return;
        }
        setInteractiveStory(null);
      })
      .catch(() => {
        if (!cancelled) {
          setInteractiveStory(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data?.series?.id, data?.series?.type, seriesId]);

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
      getCommerceSuccessPresentation(
        consumeCommerceSuccessForPath(`/series/${seriesId}`),
      ),
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
      return prefersDesktop
        ? desktopPrimaryActionRef.current
        : mobilePrimaryActionRef.current;
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
      { rootMargin: "260px 0px" },
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

  const handleRead = useCallback(
    (seriesIdValue, episodeId) => {
      trackEvent("click_episode_read", { seriesId: seriesIdValue, episodeId });
      router.push(`/read/${seriesIdValue}/${episodeId}`);
    },
    [router],
  );

  const handleUnlock = useCallback(
    (seriesIdValue, episodeId, idempotencyKey) =>
      unlockEpisode(seriesIdValue, episodeId, idempotencyKey),
    [unlockEpisode],
  );

  const handleClaim = useCallback(
    (seriesIdValue, episodeId) => claimTTF(seriesIdValue, episodeId),
    [claimTTF],
  );

  const handleSubscribe = useCallback(
    (seriesIdValue, episodeId) => {
      trackEvent("click_subscribe_from_ttf", {
        seriesId: seriesIdValue,
        episodeId,
      });
      router.push(
        buildPathWithAttribution("/subscribe", {
          entryPoint: "SERIES_TTF",
          sourcePath: `/series/${seriesIdValue}`,
          sourceSeriesId: seriesIdValue,
          sourceEpisodeId: episodeId || undefined,
          returnTo: `/series/${seriesIdValue}`,
        }),
      );
    },
    [router],
  );

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
  const handleReturnToDiscovery = useCallback(() => {
    if (!discoveryContext?.sourcePath) {
      return;
    }

    trackEvent("series_return_to_source", {
      seriesId,
      entryPoint: routeAttribution?.entryPoint,
      campaignId: routeAttribution?.campaignId,
      sourcePath: discoveryContext.sourcePath,
    });
    router.push(discoveryContext.sourcePath);
  }, [
    discoveryContext?.sourcePath,
    routeAttribution?.campaignId,
    routeAttribution?.entryPoint,
    router,
    seriesId,
  ]);
  const creatorHref = useMemo(() => {
    if (!creatorPresentation.hasPublicCredit || !creatorPresentation.href) {
      return "";
    }

    return buildPathWithAttribution(creatorPresentation.href, {
      entryPoint: "SERIES_CREATOR",
      campaignId: creatorPresentation.slug || "",
      sourcePath: `/series/${seriesId}`,
      sourceSeriesId: seriesId,
      returnTo: `/series/${seriesId}`,
    });
  }, [
    creatorPresentation.hasPublicCredit,
    creatorPresentation.href,
    creatorPresentation.slug,
    seriesId,
  ]);
  const latestEpisode = useMemo(() => {
    if (!Array.isArray(episodes) || episodes.length === 0) {
      return null;
    }

    return (
      [...episodes].sort(
        (left, right) => Number(right?.number || 0) - Number(left?.number || 0),
      )[0] || null
    );
  }, [episodes]);
  const primaryButtonClass =
    "rounded-full border border-black bg-black px-4 py-2 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-all duration-200 hover:bg-black/90";
  const secondaryButtonClass =
    "rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-colors hover:border-black/18 hover:bg-black/[0.03]";
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

    if (
      primaryReadAction.actionKind === "read" ||
      primaryReadAction.actionKind === "preview"
    ) {
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
        response = await handleUnlock(
          seriesId,
          targetEpisodeId,
          createIdempotencyKey(),
        );
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
    if (!hydrated || !isSignedIn) {
      openAuthModal();
      return;
    }

    if (isFollowing) {
      await unfollow(seriesId);
      return;
    }
    await follow(seriesId);
    report("FOLLOW_SERIES");
    followSeries(seriesId);
  };

  if (loading) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
        <SiteHeader variant="home" />
        <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
          <section className="rounded-[30px] border border-black/10 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-7">
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
                    <Skeleton
                      key={`series-header-skeleton-${index}`}
                      className="h-28 rounded-[22px]"
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="mt-6 rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_20px_46px_rgba(15,23,42,0.08)]">
            <div className="mb-4 flex items-center justify-between border-b-[3px] border-black pb-4">
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
                <Skeleton
                  key={`episode-${index}`}
                  className="h-20 w-full rounded-[24px]"
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (error === "NOT_FOUND") {
    return (
      <main className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
        <SiteHeader variant="home" />
        <div className="mx-auto max-w-[960px] px-4 py-8 md:px-8 md:py-10">
          <div className="rounded-[28px] border border-amber-200/80 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8eb_100%)] p-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
              Series unavailable
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.03em] text-black sm:text-4xl">
              Title unavailable.
            </h1>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/rankings?view=featured")}
                className={primaryButtonClass}
              >
                Featured
              </button>
              <button
                type="button"
                onClick={() => router.push("/comics")}
                className={secondaryButtonClass}
              >
                Comics
              </button>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className={secondaryButtonClass}
              >
                Search
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
      <main className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
        <SiteHeader variant="home" />
        <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
          <NetworkFallback
            compact
            title={
              isUnavailable
                ? "Title unavailable."
                : "Load failed."
            }
            description={
              isUnavailable
                ? ""
                : ""
            }
            onRetry={() => fetchSeries({ bust: true })}
          >
            <button
              type="button"
              onClick={() => router.push("/rankings?view=featured")}
              className={secondaryButtonClass}
            >
              Featured
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(isUnavailable ? "/support" : "/search")
              }
              className={secondaryButtonClass}
            >
              {isUnavailable ? "Support" : "Search"}
            </button>
          </NetworkFallback>
        </div>
      </main>
    );
  }

  if ((series?.adult || error === "ADULT_GATED") && gateStatus !== "OK") {
    return (
      <main className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
        <SiteHeader variant="home" />

        <AdultGateBlockingPanel
          status={gateStatus}
          onOpenModal={openGateModal}
        />
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
    <main className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <SiteHeader variant="home" />
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        {commerceNotice ? (
          <div className="pt-6">
            <CommerceSuccessBanner
              notice={commerceNotice}
              onDismiss={() => setCommerceNotice(null)}
              className="mb-6"
            />
          </div>
        ) : null}

        {discoveryContext ? (
          <div className="mb-4 rounded-[22px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fff8eb_100%)] px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.06)] sm:px-5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff007a]">
                  {discoveryContext.sourceLabel} / {discoveryContext.laneValue}
                </p>
                <h2 className="mt-1 text-sm font-black uppercase tracking-[0.02em] text-black sm:text-base">
                  {discoveryContext.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleReturnToDiscovery}
                className="shrink-0 rounded-full border border-black/12 bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.02em] text-black shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-all hover:border-black/18 hover:bg-black/[0.03]"
              >
                {discoveryContext.returnLabel}
              </button>
            </div>
          </div>
        ) : null}

        <SeriesHeader
          series={series}
          episodeCount={episodes.length}
          latestEpisode={latestEpisode}
          onPrimaryAction={primaryReadAction ? handleSeriesPrimaryAction : null}
          primaryActionLabelOverride={primaryReadAction?.label || ""}
          onFollowToggle={handleFollowToggle}
          isFollowing={isFollowing}
          desktopPrimaryActionRef={desktopPrimaryActionRef}
          mobilePrimaryActionRef={mobilePrimaryActionRef}
          highlightPrimaryAction={Boolean(commerceNotice)}
          creatorHref={creatorHref}
        />

        {interactiveStory ? (
          <section className="rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                  Interactive
                </p>
                <p className="mt-1 text-sm font-black uppercase tracking-[0.02em] text-black">
                  Interactive is live.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/series/${encodeURIComponent(seriesId)}/interactive`)}
                className="rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all hover:border-black/18 hover:bg-black/[0.03]"
              >
                Open
              </button>
            </div>
          </section>
        ) : null}

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

        <div ref={secondarySectionsRef} className="mt-8 h-px w-full" />
        {showSecondarySections ? (
          <>
            <SimilarSeriesSection seriesId={seriesId} series={series} />
            <div className="mt-8 border-t-[3px] border-black pt-6" />
            <CommentsSection
              seriesId={seriesId}
              seriesTitle={series.title}
              author={
                creatorPresentation.hasPublicCredit
                  ? creatorPresentation.displayName
                  : ""
              }
              status={series.status}
              genres={series.genres}
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
