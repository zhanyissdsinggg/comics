"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SeriesHeader from "./SeriesHeader";
import AdultGateBlockingPanel from "./AdultGateBlockingPanel";
import SiteHeader from "../layout/SiteHeader";
import Skeleton from "../common/Skeleton";
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
import { buildPathWithAttribution } from "../../lib/paymentAttribution";

function EpisodeListSkeleton() {
  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:mt-8 sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
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

export default function SeriesPage({ seriesId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gateStatus, setGateStatus] = useState("OK");
  const [activeModal, setActiveModal] = useState(null);
  const [showSecondarySections, setShowSecondarySections] = useState(false);
  const [authError, setAuthError] = useState("");
  const gateReportedRef = useRef(false);
  const requestRef = useRef(0);
  const secondarySectionsRef = useRef(null);

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

  const series = data?.series || {};
  const episodes = useMemo(
    () => (Array.isArray(data?.episodes) ? data.episodes : []),
    [data?.episodes]
  );
  const previewHint = useMemo(() => {
    if (!episodes.length) {
      return "";
    }
    const maxPreview = episodes.reduce((max, ep) => {
      const value = Number(ep?.previewFreePages || 0);
      return value > max ? value : max;
    }, 0);
    if (maxPreview <= 0) {
      return "";
    }
    return `Free preview: up to ${maxPreview} pages`;
  }, [episodes]);
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
        } else if (response.status === 401) {
          window.dispatchEvent(new CustomEvent("auth:open"));
          setError("FETCH_ERROR");
        } else {
          setError("FETCH_ERROR");
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
    fetchSeries();
  }, [fetchSeries]);

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
  const handleStart = !lastReadEpisodeId && firstEpisodeId
    ? () => handleRead(seriesId, firstEpisodeId)
    : null;

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
      <main className="min-h-screen bg-neutral-950">
        <SiteHeader />
        <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <Skeleton className="h-80 w-full sm:w-56 md:w-64 flex-shrink-0 rounded-lg" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-4 w-1/4 rounded" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-20 w-full rounded" />
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={`episode-${index}`} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error && error !== "ADULT_GATED") {
    return (
      <main className="min-h-screen bg-neutral-950">
        <SiteHeader />
        <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-200 font-semibold mb-2">Failed to Load</p>
            <p className="text-xs text-red-300 mb-4">Unable to load series info. Please check your connection or try again later.</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => fetchSeries({ bust: true })}
                className="rounded-lg border border-red-400 bg-red-500/20 px-4 py-2 text-xs text-red-200 hover:bg-red-500/30"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if ((series?.adult || error === "ADULT_GATED") && gateStatus !== "OK") {
    return (
      <main className="min-h-screen bg-neutral-950">
        <SiteHeader />

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
    <main className="min-h-screen bg-neutral-950">
      <SiteHeader />

      <div className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 sm:pb-8 lg:px-8">
        <SeriesHeader
          series={series}
          previewHint={previewHint}
          progress={progress}
          episodeCount={episodes.length}
          onContinue={handleContinue}
          onStart={handleStart}
          onFollowToggle={handleFollowToggle}
          isFollowing={isFollowing}
        />

        <EpisodeList
          series={series}
          episodes={episodes}
          entitlement={entitlement}
          wallet={walletStore}
          coupons={coupons}
          onRead={handleRead}
          onUnlock={handleUnlock}
          onClaim={handleClaim}
          onSubscribe={handleSubscribe}
        />

        <div ref={secondarySectionsRef} className="mt-8 h-px w-full" />
        {showSecondarySections ? (
          <>
            <SimilarSeriesSection seriesId={seriesId} />
            <div className="mt-8 border-t border-neutral-800 pt-6" />
            <CommentsSection
              seriesId={seriesId}
              rating={series.rating}
              ratingCount={series.ratingCount}
              onRatingUpdate={handleRatingUpdate}
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
