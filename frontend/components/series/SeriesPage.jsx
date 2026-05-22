"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SeriesHeader from "./SeriesHeader";
import EpisodeList from "./EpisodeList";
import AdultGateBlockingPanel from "./AdultGateBlockingPanel";
import NetworkFallback from "../common/NetworkFallback";
import Skeleton from "../common/Skeleton";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
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
import { toURLSearchParams } from "../../lib/pageSearchParams";
import { focusInteractiveTarget } from "../../lib/focusTarget";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { resolveSeriesCreatorIdentity } from "../../lib/creatorIdentity";
import { getSeriesPrimaryReadAction } from "../../lib/episodeAccessState";
import { buildReaderPath } from "../../lib/readerRoutes";
import { siteConfig } from "../../lib/siteConfig";

const seriesPageShellClass =
  "min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(43,28,56,0.48)_0%,rgba(19,16,27,0.96)_34%,#0f0d13_100%)] text-white";

function EpisodeListSkeleton() {
  return (
    <SurfacePanel
      appearance="dark"
      tone="muted"
      accent="cyan"
      className="mt-6 sm:mt-8"
    >
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-28 rounded-full bg-white/16" />
          <Skeleton className="h-4 w-10 rounded-full bg-white/[0.06]" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-full bg-white/16" />
          <Skeleton className="h-9 w-24 rounded-full bg-white/16" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton
            key={`episode-list-skeleton-${index}`}
            className="h-24 w-full rounded-[24px] bg-white/[0.05]"
          />
        ))}
      </div>
    </SurfacePanel>
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
  initialSearchParams = null,
}) {
  const router = useRouter();
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
  const resolvedInitialSearchParams = useMemo(
    () => toURLSearchParams(initialSearchParams),
    [initialSearchParams],
  );
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(resolvedInitialSearchParams),
    [resolvedInitialSearchParams],
  );

  const series = data?.series || {};
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
    const seriesType = String(data?.series?.type || "")
      .trim()
      .toLowerCase();
    if (!data?.series?.id || seriesType !== "novel") {
      setInteractiveStory(null);
      return;
    }

    let cancelled = false;
    apiGet(
      `/api/interactive-stories/by-series/${encodeURIComponent(seriesId)}`,
      {
        suppressAuthModal: true,
        cacheMs: 30_000,
      },
    )
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

  const handleRead = useCallback((seriesIdValue, episodeId) => {
    trackEvent("click_episode_read", { seriesId: seriesIdValue, episodeId });
  }, []);

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
  const primaryReadHref = useMemo(() => {
    if (!primaryReadAction?.episodeId) {
      return "";
    }

    if (
      primaryReadAction.actionKind !== "read" &&
      primaryReadAction.actionKind !== "preview"
    ) {
      return "";
    }

    return buildReaderPath(seriesId, primaryReadAction.episodeId);
  }, [primaryReadAction, seriesId]);
  const checkoutEnabled = siteConfig.monetization.checkoutEnabled === true;
  const primaryActionLabel = useMemo(() => {
    if (!primaryReadAction) {
      return "";
    }
    if (checkoutEnabled) {
      return primaryReadAction.label || "";
    }
    if (
      primaryReadAction.actionKind === "unlock" ||
      primaryReadAction.actionKind === "subscribe"
    ) {
      return "Preview only";
    }
    return primaryReadAction.label || "";
  }, [checkoutEnabled, primaryReadAction]);
  const handleSeriesPrimaryLinkClick = useCallback(() => {
    if (!primaryReadAction?.episodeId) {
      return;
    }
    handleRead(seriesId, primaryReadAction.episodeId);
  }, [handleRead, primaryReadAction?.episodeId, seriesId]);
  const handleSeriesPrimaryAction = useCallback(async () => {
    if (!primaryReadAction) {
      return;
    }

    const targetEpisodeId = primaryReadAction.episodeId;
    if (
      !checkoutEnabled &&
      (primaryReadAction.actionKind === "unlock" ||
        primaryReadAction.actionKind === "subscribe")
    ) {
      handleOpenStore();
      return;
    }
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
    checkoutEnabled,
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
      <main className={seriesPageShellClass}>
        <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
          <SurfacePanel
            appearance="dark"
            tone="highlight"
            accent="rose"
            className="p-5 sm:p-7"
          >
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
              <Skeleton className="aspect-[3/4] w-full rounded-[28px] bg-white/[0.06]" />
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-24 rounded-full bg-white/16" />
                  <Skeleton className="h-7 w-24 rounded-full bg-white/16" />
                </div>
                <Skeleton className="h-12 w-4/5 rounded-[20px] bg-white/16" />
                <Skeleton className="h-5 w-3/5 rounded-full bg-white/[0.06]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-full bg-white/[0.06]" />
                  <Skeleton className="h-4 w-[92%] rounded-full bg-white/[0.06]" />
                  <Skeleton className="h-4 w-[76%] rounded-full bg-white/[0.06]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-36 rounded-full bg-white/16" />
                  <Skeleton className="h-9 w-32 rounded-full bg-white/16" />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={`series-header-skeleton-${index}`}
                      className="h-28 rounded-[22px] bg-white/[0.05]"
                    />
                  ))}
                </div>
              </div>
            </div>
          </SurfacePanel>
          <EpisodeListSkeleton />
        </div>
      </main>
    );
  }

  if (error === "NOT_FOUND") {
    return (
      <main className={seriesPageShellClass}>
        <div className="mx-auto max-w-[960px] px-4 py-8 md:px-8 md:py-10">
          <SurfacePanel
            appearance="dark"
            tone="highlight"
            accent="rose"
            className="p-6 sm:p-7"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">
              Series unavailable
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-[2.3rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[3.15rem]">
              This title isn&apos;t available right now.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/72">
              Try another hit from rankings, jump back into comics, or search
              for something new.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/rankings?view=featured")}
                className={storefrontPrimaryButtonClass}
              >
                Explore rankings
              </button>
              <button
                type="button"
                onClick={() => router.push("/comics")}
                className={storefrontSecondaryButtonClass}
              >
                Comics
              </button>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className={storefrontSecondaryButtonClass}
              >
                Search
              </button>
            </div>
          </SurfacePanel>
        </div>
      </main>
    );
  }

  if (error && error !== "ADULT_GATED") {
    const isUnavailable = error === "UNAVAILABLE";

    return (
      <main className={seriesPageShellClass}>
        <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
          <NetworkFallback
            compact
            title={
              isUnavailable
                ? "This title isn't available right now."
                : "We couldn't load this page."
            }
            description={
              isUnavailable
                ? "You can head to support, or jump into another title while this one is offline."
                : "Try again in a moment, or keep exploring while we catch up."
            }
            onRetry={() => fetchSeries({ bust: true })}
          >
            <button
              type="button"
              onClick={() => router.push("/rankings?view=featured")}
              className={storefrontSecondaryButtonClass}
            >
              Explore rankings
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(isUnavailable ? "/support" : "/search")
              }
              className={storefrontSecondaryButtonClass}
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
      <main className={seriesPageShellClass}>
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
    <main className={seriesPageShellClass}>
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

        <SeriesHeader
          series={series}
          episodeCount={episodes.length}
          latestEpisode={latestEpisode}
          onPrimaryAction={
            primaryReadHref
              ? handleSeriesPrimaryLinkClick
              : primaryReadAction
                ? handleSeriesPrimaryAction
                : null
          }
          primaryActionHref={primaryReadHref}
          primaryActionLabelOverride={primaryActionLabel}
          onFollowToggle={handleFollowToggle}
          isFollowing={isFollowing}
          desktopPrimaryActionRef={desktopPrimaryActionRef}
          mobilePrimaryActionRef={mobilePrimaryActionRef}
          highlightPrimaryAction={Boolean(commerceNotice)}
          creatorHref={creatorHref}
        />

        {interactiveStory ? (
          <SurfacePanel
            appearance="dark"
            tone="muted"
            accent="rose"
            className="p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/56">
                  Interactive
                </p>
                <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-white">
                  Make a choice. Change the route.
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                  This title includes an interactive edition with branch
                  moments, quick decisions, and replayable paths.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/series/${encodeURIComponent(seriesId)}/interactive`,
                  )
                }
                className={storefrontSecondaryButtonClass}
              >
                Start reading
              </button>
            </div>
          </SurfacePanel>
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
            <div className="mt-8 border-t border-white/10 pt-6" />
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
              seriesType={series.type}
              isFollowing={isFollowing}
              onFollowToggle={handleFollowToggle}
              sharePath={`/series/${seriesId}`}
            />
          </>
        ) : (
          <SurfacePanel
            appearance="dark"
            tone="muted"
            accent="cyan"
            className="mt-8 space-y-4"
          >
            <Skeleton className="h-8 w-48 rounded-lg bg-white/[0.08]" />
            <Skeleton className="h-36 w-full rounded-2xl bg-white/[0.05]" />
          </SurfacePanel>
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
