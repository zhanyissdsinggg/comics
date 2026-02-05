"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SeriesHeader from "./SeriesHeader";
import EpisodeList from "./EpisodeList";
import AdultGateBlockingPanel from "./AdultGateBlockingPanel";
import AdultLoginModal from "./AdultLoginModal";
import AdultAgeModal from "./AdultAgeModal";
import ActionModal from "./ActionModal";
import CommentsSection from "./CommentsSection";
import SiteHeader from "../layout/SiteHeader";
import Skeleton from "../common/Skeleton";
import {
  confirmAge,
  readAdultState,
  requestEnableAdult,
} from "../../lib/adultGate";
import { apiGet } from "../../lib/apiClient";
import { track } from "../../lib/analytics";
import { useWalletStore } from "../../store/useWalletStore";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useRewardsStore } from "../../store/useRewardsStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useCouponStore } from "../../store/useCouponStore";
import { useProgressStore } from "../../store/useProgressStore";

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

function WalletCard({ wallet }) {
  const paidPts = wallet?.paidPts || 0;
  const bonusPts = wallet?.bonusPts || 0;
  const subscription = wallet?.subscription || {};
  const usage = wallet?.subscriptionUsage;
  const voucher = wallet?.subscriptionVoucher;
  const totalPts = paidPts + bonusPts;

  return (
    <aside className="wallet-card">
      <div className="wallet-card-header">
        <h3>Wallet</h3>
        <span>Total: {totalPts} POINTS</span>
      </div>
      <div className="wallet-card-body">
        <div>Paid: {paidPts}</div>
        <div>Bonus: {bonusPts}</div>
        <div>Subscription: {subscription.active ? "Active" : "Inactive"}</div>
        {subscription.active ? (
          <>
            <div>Renews: {subscription.renewAt}</div>
            {usage ? (
              <div>
                Daily free: {usage.remaining}/{usage.dailyFreeUnlocks}
              </div>
            ) : null}
            {subscription?.perks?.ttfMultiplier ? (
              <div>TTF Speed: {Math.round(subscription.perks.ttfMultiplier * 100)}%</div>
            ) : null}
            {voucher ? <div>Subscriber voucher: {voucher.label}</div> : null}
          </>
        ) : null}
      </div>
    </aside>
  );
}

export default function SeriesPage({ seriesId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gateStatus, setGateStatus] = useState("OK");
  const [activeModal, setActiveModal] = useState(null);
  const [adultState, setAdultState] = useState(readAdultState());
  const [infoModal, setInfoModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const gateReportedRef = useRef(false);

  const walletStore = useWalletStore();
  const { loadWallet } = walletStore;
  const { bySeriesId, loadEntitlement, unlockEpisode, claimTTF } =
    useEntitlementStore();
  const { report } = useRewardsStore();
  const { followedSeriesIds, loadFollowed, follow, unfollow } = useFollowStore();
  const { viewSeries, followSeries } = useBehaviorStore();
  const { signIn } = useAuthStore();
  const { coupons, loadCoupons } = useCouponStore();
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

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const adultFlag = adultState.isAdultMode ? "1" : "0";
    const response = await apiGet(`/api/series/${seriesId}?adult=${adultFlag}`);

    if (!response.ok) {
      if (response.status === 403 || response.error === "ADULT_GATED") {
        setError("ADULT_GATED");
        if (response.reason) {
          setGateStatus(response.reason);
        }
        if (!gateReportedRef.current) {
          track("adult_gate_blocked", {
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
      setLoading(false);
      return;
    }

    if (response.data?.error === "ADULT_GATED") {
      setError("ADULT_GATED");
      if (response.data?.reason) {
        setGateStatus(response.data.reason);
      }
      if (!gateReportedRef.current) {
        track("adult_gate_blocked", {
          source: "series",
          seriesId,
          reason: response.data?.reason,
          requestId: response.data?.requestId,
        });
        gateReportedRef.current = true;
      }
      setLoading(false);
      return;
    }

    setData(response.data);
    setLoading(false);
  }, [adultState.isAdultMode, seriesId]);

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
      track("view_series", { seriesId: data.series.id });
      viewSeries(data.series.id);
      loadWallet();
      loadEntitlement(data.series.id);
      loadFollowed();
      loadCoupons();
      loadProgress();
    }
  }, [
    data?.series?.id,
    loadEntitlement,
    loadWallet,
    loadFollowed,
    viewSeries,
    loadCoupons,
    loadProgress,
  ]);

  useEffect(() => {
    if (error === "ADULT_GATED") {
      return;
    }
    if (series?.adult) {
      setGateStatus(requestEnableAdult());
      return;
    }
    setGateStatus("OK");
  }, [error, series?.adult, adultState.isAdultMode]);

  const openGateModal = () => {
    const status = requestEnableAdult();
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
    fetchSeries();
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
    setAdultState(readAdultState());
    setActiveModal(null);
    setAuthError("");
    openGateModal();
    return response;
  };

  const handleAgeConfirm = () => {
    confirmAge();
    setAdultState(readAdultState());
    setActiveModal(null);
    setGateStatus("OK");
    fetchSeries();
  };

  const handleRead = useCallback((seriesIdValue, episodeId) => {
    track("click_episode_read", { seriesId: seriesIdValue, episodeId });
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
    track("click_subscribe_from_ttf", { seriesId: seriesIdValue, episodeId });
    router.push("/subscribe");
  }, [router]);

  const handleSubscribeSeries = useCallback(() => {
    track("click_subscribe_from_series", { seriesId });
    router.push(`/subscribe?returnTo=/series/${seriesId}`);
  }, [router, seriesId]);

  const handleStore = useCallback(() => {
    track("offer_click", { offerId: "store_entry", entry: "SERIES" });
    router.push(`/store?returnTo=/series/${seriesId}&focus=auto`);
  }, [router, seriesId]);

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

  const handleAddToLibrary = () => {
    setInfoModal({
      type: "INFO",
      title: "Add to Library",
      description: "Add to Library will be available in P0-2.",
    });
  };

  const handleRatingUpdate = (nextRating, nextCount) => {
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
      <main className="series-page">
        <SiteHeader />
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* 老王注释：SeriesHeader骨架屏 */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-64 w-48 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-3/4 rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-32 rounded-full" />
                  <Skeleton className="h-10 w-32 rounded-full" />
                </div>
              </div>
            </div>
            {/* 老王注释：EpisodeList骨架屏 */}
            <div className="mt-8 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={`episode-${index}`} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error && error !== "ADULT_GATED") {
    return (
      <main className="series-page">
        <SiteHeader />
        <div className="max-w-6xl mx-auto px-4">
          <p>Failed to load series.</p>
        </div>
      </main>
    );
  }

  if ((series?.adult || error === "ADULT_GATED") && gateStatus !== "OK") {
    return (
      <main className="series-page">
        <SiteHeader />

        <AdultGateBlockingPanel status={gateStatus} onOpenModal={openGateModal} />
        <AdultLoginModal
          open={activeModal === "login"}
          onClose={() => {
            setActiveModal(null);
            setAuthError("");
          }}
          onSubmit={handleLogin}
          errorMessage={authError}
        />
        <AdultAgeModal
          open={activeModal === "age"}
          onClose={() => setActiveModal(null)}
          onConfirm={handleAgeConfirm}
          ageRuleKey={adultState.ageRuleKey}
          legalAge={adultState.legalAge}
        />
      </main>
    );
  }

  return (
    <main className="series-page">
      <SiteHeader />

      <div className="max-w-6xl mx-auto px-4">
        <SeriesHeader
          series={series}
          wallet={walletStore}
          previewHint={previewHint}
          progress={progress}
          onContinue={handleContinue}
          onStart={handleStart}
          onFollowToggle={handleFollowToggle}
          isFollowing={isFollowing}
          onAddToLibrary={handleAddToLibrary}
          onSubscribe={handleSubscribeSeries}
          onStore={handleStore}
        />

        <div className="lg:grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
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
          </div>
          <div className="lg:col-span-4">
            <WalletCard wallet={walletStore} />
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-900 pt-6" />
        <CommentsSection
          seriesId={seriesId}
          rating={series.rating}
          ratingCount={series.ratingCount}
          onRatingUpdate={handleRatingUpdate}
        />
      </div>

      <AdultLoginModal
        open={activeModal === "login"}
        onClose={() => {
          setActiveModal(null);
          setAuthError("");
        }}
        onSubmit={handleLogin}
        errorMessage={authError}
      />
      <AdultAgeModal
        open={activeModal === "age"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleAgeConfirm}
        ageRuleKey={adultState.ageRuleKey}
        legalAge={adultState.legalAge}
      />
      <ActionModal
        open={Boolean(infoModal)}
        type={infoModal?.type}
        title={infoModal?.title}
        description={infoModal?.description}
        onClose={() => setInfoModal(null)}
      />
    </main>
  );
}
