"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "../../lib/apiClient";
import { track } from "../../lib/analytics";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useWalletStore } from "../../store/useWalletStore";
import PageStream from "./PageStream";
import ReaderTopBar from "./ReaderTopBar";
import EndOfEpisodeOverlay from "./EndOfEpisodeOverlay";
import ActionModal from "../series/ActionModal";
import ReaderDrawer from "./ReaderDrawer";
import ReaderSettingsPanel from "./ReaderSettingsPanel";
import { useProgressStore } from "../../store/useProgressStore";
import { useRewardsStore } from "../../store/useRewardsStore";
import { decideOffers } from "../../lib/offers/decide";
import { getBucket, getOrCreateUserId, trackExposure } from "../../lib/experiments/ab";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { OFFERS } from "../../lib/offers/catalog";
import { useCouponStore } from "../../store/useCouponStore";
import { calculatePrice } from "../../lib/pricing";
import AdultGateBlockingPanel from "../series/AdultGateBlockingPanel";
import AdultLoginModal from "../series/AdultLoginModal";
import AdultAgeModal from "../series/AdultAgeModal";
import { confirmAge, readAdultState, requestEnableAdult } from "../../lib/adultGate";
import { useAuthStore } from "../../store/useAuthStore";
import { useReaderSettingsStore } from "../../store/useReaderSettingsStore";
import { useBookmarkStore } from "../../store/useBookmarkStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useAutoSaveProgress } from "../../hooks/useAutoSaveProgress";

function getEpisodeIndex(episodes, episodeId) {
  return episodes.findIndex((episode) => episode.id === episodeId);
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function getPackSize(offerId) {
  const offer = OFFERS[offerId];
  if (!offer) {
    return 0;
  }
  return offer.episodes || 0;
}

export default function ReaderPage({ seriesId, episodeId }) {
  const router = useRouter();
  const [episodeData, setEpisodeData] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [modalState, setModalState] = useState(null);
  const [imageQuality, setImageQuality] = useState(75);
  const [imageSizes, setImageSizes] = useState("(max-width: 768px) 100vw, 768px");
  const [prefetchCount, setPrefetchCount] = useState(3);
  const [resumeMessage, setResumeMessage] = useState("");
  const [uiToast, setUiToast] = useState("");
  const [autoScroll, setAutoScroll] = useState(false);
  const [pendingResume, setPendingResume] = useState(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false); // 老王注释：设置面板状态
  const [gateStatus, setGateStatus] = useState("OK");
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [adultState, setAdultState] = useState(readAdultState());
  const previewEndRef = useRef(null);
  const endRef = useRef(null);
  const scrollRef = useRef(0);
  const progressTimerRef = useRef(null);
  const resumeRef = useRef(false);
  const gateReportedRef = useRef(false);

  const { bySeriesId, loadEntitlement, unlockEpisode, unlockPack, claimTTF } =
    useEntitlementStore();
  const { loadWallet, topup } = useWalletStore();
  const { paidPts, bonusPts, subscription, subscriptionUsage } = useWalletStore();
  const { isAdultMode } = useAdultGateStore();
  const { setProgress, getProgress } = useProgressStore();
  const { report } = useRewardsStore();
  const { readEpisode, unlockEpisode: recordUnlock } = useBehaviorStore();
  const { addHistory } = useHistoryStore();
  const { coupons, loadCoupons } = useCouponStore();
  const { signIn, isSignedIn } = useAuthStore();
  const { nightMode, toggleNightMode, layoutMode, setLayoutMode } = useReaderSettingsStore();
  const { bookmarksBySeries, addBookmark, removeBookmark } = useBookmarkStore();
  const reportedRef = useRef(false);

  // 启用阅读进度自动保存
  const { restoreProgress } = useAutoSaveProgress(seriesId, episodeId, {
    enabled: isSignedIn, // 只为登录用户保存进度
  });

  const entitlement = bySeriesId[seriesId] || { unlockedEpisodeIds: [] };
  const unlocked = entitlement.unlockedEpisodeIds.includes(episodeId);
  const episodes = seriesData?.episodes || [];
  const currentIndex = getEpisodeIndex(episodes, episodeId);
  const nextEpisode = currentIndex >= 0 ? episodes[currentIndex + 1] : null;
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextUnlocked = nextEpisode
    ? entitlement.unlockedEpisodeIds.includes(nextEpisode.id)
    : false;
  const bookmarks = bookmarksBySeries[seriesId] || [];
  const isComic = episodeData?.type === "comic";
  const layoutModeForView = isComic ? layoutMode : "vertical";

  const previewCount = useMemo(() => {
    if (unlocked) {
      return null;
    }
    return episodeData?.previewFreePages ?? 3;
  }, [episodeData?.previewFreePages, unlocked]);

  const previewParagraphs = useMemo(() => {
    if (unlocked) {
      return null;
    }
    return episodeData?.previewParagraphs ?? 3;
  }, [episodeData?.previewParagraphs, unlocked]);

  const isSubscriber = Boolean(subscription?.active);
  const isNewPayer =
    typeof window !== "undefined"
      ? window.localStorage.getItem("mn_has_purchased") !== "1"
      : true;
  const userId = typeof window !== "undefined" ? getOrCreateUserId() : "guest";
  const bucketMap = useMemo(
    () => ({
      unlock_offer_v1: getBucket(userId, "unlock_offer_v1"),
      topup_offer_v1: getBucket(userId, "topup_offer_v1"),
      subscribe_upsell_v1: getBucket(userId, "subscribe_upsell_v1"),
      reader_paywall_v1: getBucket(userId, "reader_paywall_v1"),
    }),
    [userId]
  );

  useEffect(() => {
    Object.entries(bucketMap).forEach(([experimentId, bucket]) => {
      trackExposure(experimentId, bucket);
    });
  }, [bucketMap]);

  const offerDecision = useMemo(
    () =>
      decideOffers({
        user: {
          isSubscriber,
          paidPts,
          bonusPts,
          isNewPayer,
          region: "global",
          isAdultMode,
        },
        content: {
          seriesId,
          episodeId,
          pricePts: nextEpisode?.pricePts || episodeData?.pricePts || 0,
          isAdult: false,
          ttfEligible: nextEpisode?.ttfEligible,
        },
        entry: "READER_END",
        experiments: { bucketMap },
      }),
    [
      isSubscriber,
      paidPts,
      bonusPts,
      isNewPayer,
      isAdultMode,
      seriesId,
      episodeId,
      nextEpisode?.pricePts,
      episodeData?.pricePts,
      nextEpisode?.ttfEligible,
      bucketMap,
    ]
  );

  const fetchEpisode = useCallback(async () => {
    setLoading(true);
    setError(null);
    const adultFlag = adultState.isAdultMode ? "1" : "0";
    const [episodeResponse, seriesResponse] = await Promise.all([
      apiGet(`/api/episode-seriesId=${seriesId}&episodeId=${episodeId}`),
      apiGet(`/api/series/${seriesId}?adult=${adultFlag}`),
    ]);

    if (!episodeResponse.ok) {
      if (episodeResponse.status === 403 || episodeResponse.error === "ADULT_GATED") {
        setError("ADULT_GATED");
        if (episodeResponse.reason) {
          setGateStatus(episodeResponse.reason);
        }
        if (!gateReportedRef.current) {
          track("adult_gate_blocked", {
            source: "reader",
            seriesId,
            reason: episodeResponse.reason,
            requestId: episodeResponse.requestId,
          });
          gateReportedRef.current = true;
        }
      } else if (episodeResponse.status === 401) {
        window.dispatchEvent(new CustomEvent("auth:open"));
        setError("EPISODE_ERROR");
      } else {
        setError("EPISODE_ERROR");
      }
      setLoading(false);
      return;
    }
    if (!seriesResponse.ok) {
      if (seriesResponse.status === 403 || seriesResponse.error === "ADULT_GATED") {
        setError("ADULT_GATED");
        if (seriesResponse.reason) {
          setGateStatus(seriesResponse.reason);
        }
        if (!gateReportedRef.current) {
          track("adult_gate_blocked", {
            source: "reader",
            seriesId,
            reason: seriesResponse.reason,
            requestId: seriesResponse.requestId,
          });
          gateReportedRef.current = true;
        }
      } else if (seriesResponse.status === 401) {
        window.dispatchEvent(new CustomEvent("auth:open"));
        setError("SERIES_ERROR");
      } else {
        setError("SERIES_ERROR");
      }
      setLoading(false);
      return;
    }
    setEpisodeData(episodeResponse.data?.episode);
    setSeriesData(seriesResponse.data);
    setLoading(false);
  }, [adultState.isAdultMode, episodeId, seriesId]);

  // 恢复阅读进度
  useEffect(() => {
    if (!loading && episodeData && isSignedIn) {
      restoreProgress();
    }
  }, [loading, episodeData, isSignedIn, restoreProgress]);

  useEffect(() => {
    fetchEpisode();
  }, [fetchEpisode]);

  useEffect(() => {
    gateReportedRef.current = false;
  }, [seriesId, episodeId]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const update = () => {
      let quality = 75;
      let sizes = "(max-width: 768px) 100vw, 768px";
      let prefetch = 3;
      if (connection?.saveData) {
        quality = 40;
        sizes = "(max-width: 768px) 90vw, 600px";
        prefetch = 1;
      } else if (connection?.effectiveType) {
        if (connection.effectiveType.includes("2g")) {
          quality = 35;
          sizes = "(max-width: 768px) 80vw, 520px";
          prefetch = 1;
        } else if (connection.effectiveType.includes("3g")) {
          quality = 50;
          sizes = "(max-width: 768px) 90vw, 680px";
          prefetch = 2;
        }
      }
      setImageQuality(quality);
      setImageSizes(sizes);
      setPrefetchCount(prefetch);
    };
    update();
    if (connection?.addEventListener) {
      connection.addEventListener("change", update);
      return () => connection.removeEventListener("change", update);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    loadWallet();
    loadEntitlement(seriesId);
    loadCoupons();
  }, [isSignedIn, loadEntitlement, loadWallet, loadCoupons, seriesId]);

  useEffect(() => {
    if (episodeData?.id) {
      track("view_reader", { seriesId, episodeId });
    }
  }, [episodeData?.id, episodeId, seriesId]);

  useEffect(() => {
    if (error !== "ADULT_GATED") {
      return;
    }
    if (gateStatus === "OK") {
      setGateStatus(requestEnableAdult());
    }
  }, [error, gateStatus]);

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
    fetchEpisode();
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
    fetchEpisode();
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === endRef.current) {
            setShowEndOverlay(entry.isIntersecting);
          }
          if (entry.target === previewEndRef.current) {
            if (entry.isIntersecting && !unlocked) {
              setShowPaywall(true);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    if (endRef.current) {
      observer.observe(endRef.current);
    }
    if (previewEndRef.current) {
      observer.observe(previewEndRef.current);
    }

    return () => observer.disconnect();
  }, [unlocked]);

  useEffect(() => {
    if (showEndOverlay && !reportedRef.current) {
      report("READ_EPISODE");
      readEpisode(seriesId, episodeId);
      addHistory({
        seriesId,
        episodeId,
        title: seriesData?.series?.title || "",
        percent: 1,
      });
      reportedRef.current = true;
    }
  }, [report, readEpisode, addHistory, seriesId, episodeId, showEndOverlay, seriesData?.series?.title]);

  useEffect(() => {
    if (showPaywall) {
      track("paywall_impression", { seriesId, episodeId, source: "preview" });
    }
  }, [showPaywall, seriesId, episodeId]);

  useEffect(() => {
    if (!showEndOverlay) {
      return;
    }
    if (offerDecision?.recommendedUnlockOfferId) {
      track("offer_impression", {
        offerId: offerDecision.recommendedUnlockOfferId,
        entry: "READER_END",
      });
    }
  }, [offerDecision?.recommendedUnlockOfferId, showEndOverlay]);

  useEffect(() => {
    if (modalState?.type !== "SHORTFALL") {
      return;
    }
    if (offerDecision?.recommendedUnlockOffer?.id) {
      track("offer_impression", {
        offerId: offerDecision.recommendedUnlockOffer.id,
        entry: "READER_PAYWALL",
      });
    }
  }, [modalState?.type, offerDecision?.recommendedUnlockOffer?.id]);

  useEffect(() => {
    reportedRef.current = false;
  }, [episodeId]);

  useEffect(() => {
    resumeRef.current = false;
  }, [episodeId]);

  useEffect(() => {
    const onScroll = () => {
      const total =
        document.documentElement.scrollHeight - window.innerHeight;
      const percent = total > 0 ? window.scrollY / total : 0;
      scrollRef.current = Math.min(1, Math.max(0, percent));
      setScrollPercent(scrollRef.current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    progressTimerRef.current = setInterval(() => {
      setProgress(seriesId, episodeId, scrollRef.current);
    }, 2000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      setProgress(seriesId, episodeId, scrollRef.current);
    };
  }, [episodeId, seriesId, setProgress]);

  useEffect(() => {
    if (!episodeData?.id || !unlocked || resumeRef.current) {
      return;
    }
    const progress = getProgress(seriesId);
    if (!progress || progress.lastEpisodeId !== episodeId) {
      return;
    }
    if (progress.percent <= 0.05 || progress.percent >= 0.98) {
      return;
    }
    resumeRef.current = true;
    setPendingResume({
      percent: progress.percent,
      label: `Resume at ${Math.round(progress.percent * 100)}%`,
    });
  }, [episodeData?.id, unlocked, seriesId, episodeId, getProgress]);

  const handleAddBookmark = useCallback(() => {
    addBookmark(seriesId, {
      episodeId,
      percent: scrollRef.current,
      pageIndex: activePageIndex,
      label: `Ep ${episodeId} ? ${Math.round(scrollRef.current * 100)}%`,
    });
    setModalState({
      type: "SUCCESS",
      title: "Bookmarked",
      description: "Bookmark saved.",
    });
  }, [addBookmark, episodeId, activePageIndex, seriesId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented) {
        return;
      }
      const target = event.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "n") {
        toggleNightMode();
        setUiToast(`Night ${nightMode ? "OFF" : "ON"}`);
      }
      if (key === "t") {
        setDrawerOpen(true);
        setUiToast("Open contents");
      }
      if (key === "b") {
        handleAddBookmark();
        setUiToast("Bookmark saved");
      }
      if (key === "a") {
        setAutoScroll((prev) => {
          const next = !prev;
          setUiToast(next ? "Auto scroll ON" : "Auto scroll OFF");
          return next;
        });
      }
      if (event.key === "ArrowLeft" && prevEpisode) {
        router.push(`/read/${seriesId}/${prevEpisode.id}`);
      }
      if (event.key === "ArrowRight") {
        if (!nextEpisode) {
          return;
        }
        if (nextUnlocked) {
          router.push(`/read/${seriesId}/${nextEpisode.id}`);
          return;
        }
        setShowEndOverlay(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleAddBookmark,
    nextEpisode,
    nextUnlocked,
    prevEpisode,
    router,
    seriesId,
    toggleNightMode,
    nightMode,
  ]);

  useEffect(() => {
    if (!autoScroll) {
      return;
    }
    const timer = setInterval(() => {
      window.scrollBy({ top: 120, behavior: "smooth" });
    }, 100);
    return () => clearInterval(timer);
  }, [autoScroll]);

  useEffect(() => {
    if (!uiToast) {
      return;
    }
    const timer = setTimeout(() => setUiToast(""), 1500);
    return () => clearTimeout(timer);
  }, [uiToast]);

  const handleUnlock = async (targetEpisodeId) => {
    const response = await unlockEpisode(
      seriesId,
      targetEpisodeId,
      createIdempotencyKey()
    );
    if (response.ok) {
      recordUnlock(seriesId, targetEpisodeId);
      setShowPaywall(false);
    }
    return response;
  };

  const handleClaim = async (targetEpisodeId) => {
    const response = await claimTTF(seriesId, targetEpisodeId);
    return response;
  };

  const handleShortfall = (response, targetEpisodeId) => {
    setModalState({
      type: "SHORTFALL",
      title: "Not enough POINTS",
      description: "Not enough POINTS to unlock this episode.",
      shortfallPts: response.shortfallPts || 0,
      targetEpisodeId,
      offerId: offerDecision?.recommendedTopupOffer?.id,
    });
  };

  const handleUnlockCurrent = async () => {
    track("paywall_unlock_click", { seriesId, episodeId });
    const response = await handleUnlock(episodeId);
    if (response.ok) {
      setModalState({
        type: "SUCCESS",
        title: "Unlocked",
        description: "Episode unlocked successfully.",
      });
      return;
    }
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:open"));
      setModalState({
        type: "ERROR",
        title: "Sign in required",
        description: "Please sign in to unlock this episode.",
      });
      return;
    }
    if (response.status === 402) {
      handleShortfall(response, episodeId);
      return;
    }
    track("unlock_fail", {
      seriesId,
      episodeId,
      status: response.status,
      errorCode: response.error,
      requestId: response.requestId,
    });
    setModalState({
      type: "ERROR",
      title: "Unlock failed",
      description: response.error || "Please try again.",
    });
  };

  const handleUnlockNext = async () => {
    if (!nextEpisode) {
      return;
    }
    const response = await handleUnlock(nextEpisode.id);
    if (response.ok) {
      router.push(`/read/${seriesId}/${nextEpisode.id}`);
      return;
    }
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:open"));
      setModalState({
        type: "ERROR",
        title: "Sign in required",
        description: "Please sign in to unlock this episode.",
      });
      return;
    }
    if (response.status === 402) {
      handleShortfall(response, nextEpisode.id);
      return;
    }
    track("unlock_fail", {
      seriesId,
      episodeId: nextEpisode.id,
      status: response.status,
      errorCode: response.error,
      requestId: response.requestId,
    });
    setModalState({
      type: "ERROR",
      title: "Unlock failed",
      description: response.error || "Please try again.",
    });
  };

  const handleClaimNext = async () => {
    if (!nextEpisode) {
      return;
    }
    const response = await handleClaim(nextEpisode.id);
    if (response.ok) {
      router.push(`/read/${seriesId}/${nextEpisode.id}`);
      return;
    }
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:open"));
      setModalState({
        type: "ERROR",
        title: "Sign in required",
        description: "Please sign in to claim this episode.",
      });
      return;
    }
    setModalState({
      type: "ERROR",
      title: "Claim failed",
      description: response.error || "TTF not ready.",
    });
  };

  const handlePackOffer = async (offerId) => {
    const packSize = getPackSize(offerId);
    if (!packSize || currentIndex < 0) {
      return;
    }
    const targets = episodes.slice(currentIndex + 1, currentIndex + 1 + packSize);
    if (targets.length === 0) {
      return;
    }
    const response = await unlockPack(
      seriesId,
      targets.map((episode) => episode.id),
      offerId
    );
    if (!response.ok) {
      if (response.status === 402) {
        handleShortfall(response, targets[0].id);
        return;
      }
      setModalState({
        type: "ERROR",
        title: "Unlock failed",
        description: response.error || "Please try again.",
      });
      return;
    }
    setModalState({
      type: "SUCCESS",
      title: "Pack unlocked",
      description: `Unlocked ${targets.length} episodes.`,
    });
    router.push(`/read/${seriesId}/${targets[0].id}`);
  };

  const currentPricing = useMemo(
    () =>
      calculatePrice({
        basePrice: episodeData?.pricePts || 0,
        subscription: subscription?.active ? subscription : null,
        coupons,
        method: "WALLET",
        applyDailyFree: Boolean(subscriptionUsage?.remaining),
      }),
    [episodeData?.pricePts, subscription, coupons, subscriptionUsage?.remaining]
  );

  const nextPricing = useMemo(
    () =>
      calculatePrice({
        basePrice: nextEpisode?.pricePts || 0,
        subscription: subscription?.active ? subscription : null,
        coupons,
        method: "WALLET",
        applyDailyFree: Boolean(subscriptionUsage?.remaining),
      }),
    [nextEpisode?.pricePts, subscription, coupons, subscriptionUsage?.remaining]
  );

  const packPricing = useMemo(() => {
    const offerId = offerDecision?.recommendedUnlockOffer?.id;
    const offer = offerId ? OFFERS[offerId] : null;
    if (!offer || offer.type !== "unlock" || offer.episodes <= 1) {
      return null;
    }
    return calculatePrice({
      basePrice: offer.pricePts || 0,
      subscription: subscription?.active ? subscription : null,
      coupons,
      method: "PACK",
      applyDailyFree: false,
    });
  }, [offerDecision?.recommendedUnlockOffer?.id, subscription, coupons]);

  const handleGoBookmark = (bookmark) => {
    if (bookmark.episodeId && bookmark.episodeId !== episodeId) {
      router.push(`/read/${seriesId}/${bookmark.episodeId}`);
      return;
    }
    const total =
      document.documentElement.scrollHeight - window.innerHeight;
    if (total > 0) {
      window.scrollTo({
        top: total * (bookmark.percent || 0),
        behavior: "auto",
      });
    }
    setDrawerOpen(false);
  };

  const handleSelectEpisode = (nextId) => {
    if (!nextId || nextId === episodeId) {
      setDrawerOpen(false);
      return;
    }
    const isUnlocked = entitlement.unlockedEpisodeIds.includes(nextId);
    if (isUnlocked) {
      router.push(`/read/${seriesId}/${nextId}`);
      setDrawerOpen(false);
      return;
    }
    setShowEndOverlay(true);
    setDrawerOpen(false);
  };

  const handleToggleLayout = () => {
    if (!isComic) {
      return;
    }
    setLayoutMode(layoutMode === "horizontal" ? "vertical" : "horizontal");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <ReaderTopBar
          title="Loading..."
          episodeLabel="..."
          onBack={() => router.push(`/series/${seriesId}`)}
        />
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-400">
          Loading episode...
        </div>
      </main>
    );
  }

  if (error === "ADULT_GATED") {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <ReaderTopBar
          title="Adult content"
          episodeLabel="..."
          onBack={() => router.push(`/series/${seriesId}`)}
        />
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

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <ReaderTopBar
          title="Error"
          episodeLabel="..."
          onBack={() => router.push(`/series/${seriesId}`)}
        />
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-400">
          Failed to load episode.
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${nightMode ? "bg-black text-neutral-100" : "bg-neutral-950 text-neutral-100"}`}>
      <ReaderTopBar
        title={seriesData?.series?.title || "Series"}
        episodeLabel={episodeData?.title || episodeId}
        onBack={() => router.push(`/series/${seriesId}`)}
        onOpenToc={() => setDrawerOpen(true)}
        onAddBookmark={handleAddBookmark}
        onToggleNight={toggleNightMode}
        onToggleLayout={handleToggleLayout}
        onOpenSettings={() => setSettingsPanelOpen(true)} // 老王注释：打开设置面板
        onToggleAutoScroll={() => {
          setAutoScroll((prev) => {
            const next = !prev;
            setUiToast(next ? "Auto scroll ON" : "Auto scroll OFF");
            return next;
          });
        }}
        autoScroll={autoScroll}
        nightMode={nightMode}
        layoutMode={layoutModeForView}
        disableLayoutToggle={!isComic}
        progress={scrollPercent}
        onPrev={() =>
          prevEpisode
            ? router.push(`/read/${seriesId}/${prevEpisode.id}`)
            : null
        }
        onNext={() => {
          if (!nextEpisode) {
            return;
          }
          if (nextUnlocked) {
            router.push(`/read/${seriesId}/${nextEpisode.id}`);
            return;
          }
          setShowEndOverlay(true);
        }}
        nextLocked={nextEpisode ? !nextUnlocked : false}
      />
      <div className="mx-auto hidden max-w-5xl px-4 pt-3 text-[11px] text-neutral-500 md:block">
        Shortcuts: N = night mode, T = contents, B = bookmark, ←/→ = prev/next, A = auto scroll
      </div>

      <PageStream
        pages={episodeData?.pages || []}
        paragraphs={episodeData?.paragraphs || []}
        previewCount={previewCount}
        previewParagraphs={previewParagraphs}
        imageQuality={imageQuality}
        imageSizes={imageSizes}
        prefetchCount={prefetchCount}
        layoutMode={layoutModeForView}
        isNightMode={nightMode}
        onActiveIndexChange={setActivePageIndex}
        onPreviewEndRef={previewEndRef}
        onEndRef={endRef}
      />

      {showPaywall ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/95 p-6 text-center">
            <h2 className="text-xl font-semibold">Unlock this episode</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Continue reading by unlocking this episode.
            </p>
            {previewCount ? (
              <p className="mt-2 text-xs text-neutral-500">
                Free preview reached ({previewCount} pages).
              </p>
            ) : previewParagraphs ? (
              <p className="mt-2 text-xs text-neutral-500">
                Free preview reached ({previewParagraphs} sections).
              </p>
            ) : null}
            {currentPricing.appliedDailyFree ? (
              <p className="mt-3 text-xs text-emerald-300">Daily free available</p>
            ) : currentPricing.discountPct ? (
              <p className="mt-3 text-xs text-emerald-300">
                Subscriber {currentPricing.discountPct}% off
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleUnlockCurrent}
              className="mt-6 w-full min-h-[44px] rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition-all hover:bg-emerald-50 active:scale-95 active:bg-emerald-100"
              style={{ willChange: "transform" }}
            >
              {currentPricing.finalPrice === 0
                ? "Unlock Free"
                : `Unlock (${currentPricing.finalPrice} POINTS)`}
            </button>
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-left text-[11px] text-neutral-300">
              <div className="font-semibold text-neutral-100">Why unlock?</div>
              <div className="mt-2 space-y-1 text-neutral-400">
                <div>- Keep this episode in your library.</div>
                <div>- Packs save more POINTS over time.</div>
                <div>- Subscribers get daily free unlocks & faster TTF.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                track("click_subscribe_from_paywall", { seriesId, episodeId });
                router.push("/subscribe");
              }}
              className="mt-3 w-full rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100"
            >
              Subscribe for perks
            </button>
            <button
              type="button"
              onClick={() => {
                track("offer_click", { offerId: "store_entry", entry: "READER_PAYWALL" });
                router.push(`/store?returnTo=/read/${seriesId}/${episodeId}&focus=auto`);
              }}
              className="mt-2 w-full rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300"
            >
              Top up POINTS
            </button>
          </div>
        </div>
      ) : null}

      <EndOfEpisodeOverlay
        open={showEndOverlay}
        nextEpisode={nextEpisode}
        nextUnlocked={nextUnlocked}
        decision={offerDecision}
        pricing={nextPricing}
        packPricing={packPricing}
        onNext={() => router.push(`/read/${seriesId}/${nextEpisode?.id}`)}
        onUnlock={handleUnlockNext}
        onSubscribe={() => {
          track("click_subscribe_from_reader_end", {
            seriesId,
            episodeId,
            nextEpisodeId: nextEpisode?.id || null,
          });
          router.push("/subscribe");
        }}
        onClaim={handleClaimNext}
        onOfferClick={(offerId) =>
          track("offer_click", { offerId, entry: "READER_END" })
        }
        onPackOffer={handlePackOffer}
        onNotify={() =>
          setModalState({
            type: "INFO",
            title: "Notify me",
            description: "We will notify you when it's ready.",
          })
        }
      />

      <ReaderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        episodes={episodes}
        unlockedIds={entitlement.unlockedEpisodeIds}
        currentSeriesId={seriesId}
        currentEpisodeId={episodeId}
        bookmarks={bookmarks}
        onSelectEpisode={handleSelectEpisode}
        onGoBookmark={handleGoBookmark}
        onRemoveBookmark={(id) => removeBookmark(seriesId, id)}
        onSubscribe={() => router.push("/subscribe")}
      />

      <ActionModal
        open={Boolean(modalState)}
        type={modalState?.type}
        title={modalState?.title}
        description={modalState?.description}
        shortfallPts={modalState?.shortfallPts}
        offer={offerDecision?.recommendedUnlockOffer}
        offerBadge={offerDecision?.recommendedUnlockOffer?.tag}
        offerSavingsText={
          offerDecision?.recommendedUnlockOffer?.savingsPct
            ? `You save ${offerDecision.recommendedUnlockOffer.savingsPct}%`
            : null
        }
        compareItems={
          modalState?.type === "SHORTFALL" &&
          offerDecision?.recommendedUnlockOffer?.episodes > 1
            ? [
                {
                  label: "Single",
                  value: `${episodeData?.pricePts || 0} POINTS`,
                },
                {
                  label: `${offerDecision.recommendedUnlockOffer.episodes} Pack`,
                  value: `${offerDecision.recommendedUnlockOffer.pricePts} POINTS`,
                },
              ]
            : []
        }
        tips={
          modalState?.type === "SHORTFALL"
            ? [
                "Unlock keeps this episode in your library.",
                "Packs save more POINTS on future episodes.",
                "Subscribers get daily free unlocks and faster TTF.",
                "Subscribe to unlock daily free chapters.",
              ]
            : []
        }
        actions={
          modalState?.type === "SHORTFALL"
            ? [
                {
                  label: "Top up POINTS",
                  onClick: () => {
                    router.push(
                      `/store?returnTo=/read/${seriesId}/${episodeId}&focus=auto`
                    );
                    track("offer_click", {
                      offerId: "store_entry",
                      entry: "READER_PAYWALL",
                    });
                    setModalState(null);
                  },
                  variant: "secondary",
                },
                {
                  label: "Subscribe for perks",
                  onClick: () => {
                    track("click_subscribe_from_shortfall", {
                      seriesId,
                      episodeId,
                    });
                    router.push(`/subscribe?returnTo=/read/${seriesId}/${episodeId}`);
                    setModalState(null);
                  },
                  variant: "secondary",
                },
                {
                  label: "Quick top up",
                  onClick: async () => {
                    const packageId =
                      offerDecision?.recommendedTopupOffer?.id?.replace(
                        "points_pack_",
                        ""
                      ) || "starter";
                    track("topup_start", { packageId, entry: "READER_PAYWALL" });
                    track("offer_click", {
                      offerId: offerDecision?.recommendedTopupOffer?.id,
                      entry: "READER_PAYWALL",
                    });
                    const topupResponse = await topup(packageId);
                    if (topupResponse.ok) {
                      const retryId = modalState?.targetEpisodeId || episodeId;
                      const retry = await handleUnlock(retryId);
                      if (retry.ok && nextEpisode && retryId === nextEpisode.id) {
                        router.push(`/read/${seriesId}/${nextEpisode.id}`);
                        return;
                      }
                      track("offer_purchase_success", {
                        offerId: offerDecision?.recommendedTopupOffer?.id,
                        entry: "READER_PAYWALL",
                        orderId: topupResponse.data?.order?.orderId,
                      });
                      track("topup_success", {
                        packageId,
                        orderId: topupResponse.data?.order?.orderId,
                      });
                      setModalState({
                        type: "SUCCESS",
                        title: "Unlocked",
                        description: "Episode unlocked successfully.",
                      });
                      return;
                    }
                    track("topup_fail", {
                      packageId,
                      status: topupResponse.status,
                      errorCode: topupResponse.error,
                      requestId: topupResponse.requestId,
                    });
                    setModalState({
                      type: "ERROR",
                      title: "Top up failed",
                      description: "Unable to top up and unlock.",
                    });
                  },
                  variant: "primary",
                },
              ]
            : null
        }
        onClose={() => setModalState(null)}
      />

      {pendingResume ? (
        <div className="fixed bottom-20 right-6 z-40 rounded-2xl border border-neutral-800 bg-neutral-900/95 px-4 py-3 text-xs text-neutral-200 shadow-lg">
          <div className="text-sm font-semibold">{pendingResume.label}</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const total =
                  document.documentElement.scrollHeight - window.innerHeight;
                if (total > 0) {
                  window.scrollTo({
                    top: total * pendingResume.percent,
                    behavior: "auto",
                  });
                }
                setPendingResume(null);
                setResumeMessage("Resumed");
                setTimeout(() => setResumeMessage(""), 1500);
              }}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => setPendingResume(null)}
              className="rounded-full border border-neutral-700 px-3 py-1 text-xs"
            >
              Start over
            </button>
          </div>
        </div>
      ) : null}

      {resumeMessage ? (
        <div className="fixed bottom-6 right-6 z-40 rounded-full border border-neutral-800 bg-neutral-900/90 px-4 py-2 text-xs text-neutral-200 shadow-lg">
          {resumeMessage}
        </div>
      ) : null}
      {uiToast ? (
        <div className="fixed bottom-16 right-6 z-40 rounded-full border border-neutral-800 bg-neutral-900/90 px-4 py-2 text-xs text-neutral-200 shadow-lg">
          {uiToast}
        </div>
      ) : null}

      {/* 老王注释：阅读器设置面板 */}
      <ReaderSettingsPanel isOpen={settingsPanelOpen} onClose={() => setSettingsPanelOpen(false)} />
    </main>
  );
}
