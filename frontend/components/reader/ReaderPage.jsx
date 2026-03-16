"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "../../lib/apiClient";
import { trackEvent } from "../../lib/trackEvent";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useWalletStore } from "../../store/useWalletStore";
import PageStream from "./PageStream";
import ReaderTopBar from "./ReaderTopBar";
import { useProgressStore } from "../../store/useProgressStore";
import { useRewardsStore } from "../../store/useRewardsStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBehaviorStore } from "../../store/useBehaviorStore";
import { useCouponStore } from "../../store/useCouponStore";
import AdultGateBlockingPanel from "../series/AdultGateBlockingPanel";
import { useAuthStore } from "../../store/useAuthStore";
import { useReaderSettingsStore } from "../../store/useReaderSettingsStore";
import { useBookmarkStore } from "../../store/useBookmarkStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useAutoSaveProgress } from "../../hooks/useAutoSaveProgress";
import {
  buildPathWithAttribution,
  loadPersistedPaymentAttribution,
  mergePaymentAttribution,
  persistPaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import { focusInteractiveTarget } from "../../lib/focusTarget";
import { parallelRequests2 } from "../../lib/parallelRequests";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { buildDiscoveryContext } from "../../lib/discoveryContext";
import { STOREFRONT_TERMS } from "../../lib/storefrontCopy";

const EndOfEpisodeOverlay = dynamic(() => import("./EndOfEpisodeOverlay"), {
  ssr: false,
});
const ActionModal = dynamic(() => import("../series/ActionModal"), {
  ssr: false,
});
const ReaderDrawer = dynamic(() => import("./ReaderDrawer"), {
  ssr: false,
});
const ReaderSettingsPanel = dynamic(() => import("./ReaderSettingsPanel"), {
  ssr: false,
});
const AdultLoginModal = dynamic(() => import("../series/AdultLoginModal"), {
  ssr: false,
});
const AdultAgeModal = dynamic(() => import("../series/AdultAgeModal"), {
  ssr: false,
});

function getEpisodeIndex(episodes, episodeId) {
  return episodes.findIndex((episode) => episode.id === episodeId);
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function createPricingFallback(basePrice = 0) {
  return {
    finalPrice: Number(basePrice || 0),
    discountPct: 0,
    appliedCoupon: null,
    appliedDailyFree: false,
  };
}

function shouldPreserveDiscoveryAttribution(entryPoint) {
  const normalized = String(entryPoint || "").trim().toLowerCase();
  return (
    normalized.startsWith("reader_") ||
    normalized.startsWith("store_") ||
    normalized.startsWith("subscribe_") ||
    normalized.startsWith("unlock_") ||
    normalized.startsWith("series_")
  );
}

export default function ReaderPage({ seriesId, episodeId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [commerceNotice, setCommerceNotice] = useState(null);
  const [commerceEntryPoint, setCommerceEntryPoint] = useState("");
  const [activeAttribution, setActiveAttribution] = useState(null);
  const [pendingResume, setPendingResume] = useState(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [gateStatus, setGateStatus] = useState("OK");
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [commerceState, setCommerceState] = useState({
    loading: false,
    offerDecision: null,
    currentPricing: createPricingFallback(),
    nextPricing: createPricingFallback(),
    packPricing: null,
  });
  const previewEndRef = useRef(null);
  const endRef = useRef(null);
  const scrollRef = useRef(0);
  const scrollRafRef = useRef(null);
  const lastUiProgressRef = useRef(-1);
  const progressTimerRef = useRef(null);
  const resumeRef = useRef(false);
  const gateReportedRef = useRef(false);
  const requestRef = useRef(0);
  const commerceExposureRef = useRef(new Set());
  const unlockCurrentButtonRef = useRef(null);
  const endOverlayPrimaryActionRef = useRef(null);

  const { bySeriesId, loadEntitlement, unlockEpisode, unlockPack, claimTTF } =
    useEntitlementStore();
  const {
    loadWallet,
    topup,
    paidPts,
    bonusPts,
    subscription,
    subscriptionUsage,
  } = useWalletStore();
  const {
    adultConfirmed,
    ageRuleKey,
    legalAge,
    isAdultMode,
    requestAdultToggle,
    confirmAge: confirmAdultAge,
    forceDisableAdultMode,
  } = useAdultGateStore();
  const { setProgress, getProgress } = useProgressStore();
  const { report } = useRewardsStore();
  const { readEpisode, unlockEpisode: recordUnlock } = useBehaviorStore();
  const { addHistory } = useHistoryStore();
  const { coupons, loadCoupons } = useCouponStore();
  const { signIn, isSignedIn, hydrated } = useAuthStore();
  const {
    nightMode,
    toggleNightMode,
    layoutMode,
    setLayoutMode,
    brightness,
    autoScroll,
    setAutoScroll,
    autoScrollSpeed,
    fullscreen,
    setFullscreen,
    setBrightness,
    setAutoScrollSpeed,
  } = useReaderSettingsStore();
  const { bookmarksBySeries, addBookmark, removeBookmark } = useBookmarkStore();
  const reportedRef = useRef(false);
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(searchParams),
    [searchParams],
  );

  const { restoreProgress } = useAutoSaveProgress(seriesId, episodeId, {
    enabled: isSignedIn, // 
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
  const walletBalance = paidPts + bonusPts;
  const bookmarks = bookmarksBySeries[seriesId] || [];
  const isComic = episodeData?.type === "comic";
  const layoutModeForView = isComic ? layoutMode : "vertical";
  const upcomingEpisodes = useMemo(
    () =>
      currentIndex >= 0
        ? episodes.slice(currentIndex + 1, currentIndex + 4).map((episode) => ({
            id: episode.id,
            title: episode.title,
            pricePts: Number(episode.pricePts || 0),
            unlocked: entitlement.unlockedEpisodeIds.includes(episode.id),
            ttfEligible: Boolean(episode.ttfEligible),
          }))
        : [],
    [currentIndex, entitlement.unlockedEpisodeIds, episodes],
  );

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
  const commerceActive =
    showPaywall || showEndOverlay || modalState?.type === "SHORTFALL";
  const offerDecision = commerceState.offerDecision;
  const currentPricing =
    commerceState.currentPricing ||
    createPricingFallback(episodeData?.pricePts || 0);
  const nextPricing =
    commerceState.nextPricing || createPricingFallback(nextEpisode?.pricePts || 0);
  const packPricing = commerceState.packPricing;
  const readerPath = useMemo(() => `/read/${seriesId}/${episodeId}`, [episodeId, seriesId]);
  const seriesPath = useMemo(() => `/series/${seriesId}`, [seriesId]);
  const discoveryContext = useMemo(
    () => buildDiscoveryContext(seriesData?.series, activeAttribution),
    [activeAttribution, seriesData?.series],
  );

  const buildEpisodeHref = useCallback(
    (targetEpisodeId) => {
      if (!targetEpisodeId) {
        return readerPath;
      }

      const targetPath = `/read/${seriesId}/${targetEpisodeId}`;
      const attribution = mergePaymentAttribution(activeAttribution, {
        sourceSeriesId: seriesId,
        sourceEpisodeId: targetEpisodeId,
        returnTo: targetPath,
      });

      return attribution ? buildPathWithAttribution(targetPath, attribution) : targetPath;
    },
    [activeAttribution, readerPath, seriesId],
  );

  const buildSeriesHref = useCallback(() => {
    const attribution = mergePaymentAttribution(activeAttribution, {
      sourceSeriesId: seriesId,
      returnTo: seriesPath,
    });

    return attribution ? buildPathWithAttribution(seriesPath, attribution) : seriesPath;
  }, [activeAttribution, seriesId, seriesPath]);

  const buildReaderCommerceAttribution = useCallback(
    (entryPoint, targetEpisodeId = episodeId, extra = {}) =>
      mergePaymentAttribution(activeAttribution, {
        entryPoint,
        sourcePath: readerPath,
        sourceSeriesId: seriesId,
        sourceEpisodeId: targetEpisodeId || episodeId,
        returnTo: readerPath,
        ...extra,
      }),
    [activeAttribution, episodeId, readerPath, seriesId],
  );

  const handleReturnToDiscovery = useCallback(() => {
    if (!discoveryContext?.sourcePath) {
      return;
    }

    trackEvent("reader_return_to_source", {
      seriesId,
      episodeId,
      entryPoint: activeAttribution?.entryPoint,
      campaignId: activeAttribution?.campaignId,
      sourcePath: discoveryContext.sourcePath,
    });
    router.push(discoveryContext.sourcePath);
  }, [
    activeAttribution?.campaignId,
    activeAttribution?.entryPoint,
    discoveryContext?.sourcePath,
    episodeId,
    router,
    seriesId,
  ]);

  useEffect(() => {
    const payload = consumeCommerceSuccessForPath(`/read/${seriesId}/${episodeId}`);
    setCommerceNotice(getCommerceSuccessPresentation(payload));
    setCommerceEntryPoint(String(payload?.entryPoint || ""));
  }, [episodeId, seriesId]);

  useEffect(() => {
    if (
      loading ||
      !commerceNotice ||
      commerceEntryPoint !== "READER_END" ||
      !nextEpisode ||
      showPaywall ||
      showEndOverlay
    ) {
      return;
    }

    setShowEndOverlay(true);
  }, [
    commerceEntryPoint,
    commerceNotice,
    loading,
    nextEpisode,
    showEndOverlay,
    showPaywall,
  ]);

  useEffect(() => {
    if (!commerceNotice || !showPaywall) {
      return undefined;
    }

    return focusInteractiveTarget(unlockCurrentButtonRef);
  }, [commerceNotice, showPaywall]);

  useEffect(() => {
    if (!commerceNotice || !showEndOverlay) {
      return undefined;
    }

    return focusInteractiveTarget(endOverlayPrimaryActionRef);
  }, [commerceNotice, showEndOverlay]);

  useEffect(() => {
    if (!commerceActive) {
      return;
    }

    let cancelled = false;

    setCommerceState({
      loading: true,
      offerDecision: null,
      currentPricing: createPricingFallback(episodeData?.pricePts || 0),
      nextPricing: createPricingFallback(nextEpisode?.pricePts || 0),
      packPricing: null,
    });

    Promise.all([
      import("../../lib/offers/decide"),
      import("../../lib/experiments/ab"),
      import("../../lib/pricing"),
    ])
      .then(([offersModule, experimentsModule, pricingModule]) => {
        if (cancelled) {
          return;
        }

        const isNewPayer =
          typeof window !== "undefined"
            ? window.localStorage.getItem("mn_has_purchased") !== "1"
            : true;
        const userId =
          typeof window !== "undefined"
            ? experimentsModule.getOrCreateUserId()
            : "guest";
        const bucketMap = {
          unlock_offer_v1: experimentsModule.getBucket(userId, "unlock_offer_v1"),
          topup_offer_v1: experimentsModule.getBucket(userId, "topup_offer_v1"),
          subscribe_upsell_v1: experimentsModule.getBucket(userId, "subscribe_upsell_v1"),
          reader_paywall_v1: experimentsModule.getBucket(userId, "reader_paywall_v1"),
        };

        Object.entries(bucketMap).forEach(([experimentId, bucket]) => {
          const exposureKey = `${experimentId}:${bucket}`;
          if (commerceExposureRef.current.has(exposureKey)) {
            return;
          }
          commerceExposureRef.current.add(exposureKey);
          experimentsModule.trackExposure(experimentId, bucket);
        });

        const nextOfferDecision = offersModule.decideOffers({
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
        });

        const nextCurrentPricing = pricingModule.calculatePrice({
          basePrice: episodeData?.pricePts || 0,
          subscription: subscription?.active ? subscription : null,
          coupons,
          method: "WALLET",
          applyDailyFree: Boolean(subscriptionUsage?.remaining),
        });

        const nextEpisodePricing = pricingModule.calculatePrice({
          basePrice: nextEpisode?.pricePts || 0,
          subscription: subscription?.active ? subscription : null,
          coupons,
          method: "WALLET",
          applyDailyFree: Boolean(subscriptionUsage?.remaining),
        });

        const recommendedPack = nextOfferDecision?.recommendedUnlockOffer;
        const nextPackPricing =
          recommendedPack?.type === "unlock" && recommendedPack?.episodes > 1
            ? pricingModule.calculatePrice({
                basePrice: recommendedPack.pricePts || 0,
                subscription: subscription?.active ? subscription : null,
                coupons,
                method: "PACK",
                applyDailyFree: false,
              })
            : null;

        setCommerceState({
          loading: false,
          offerDecision: nextOfferDecision,
          currentPricing: nextCurrentPricing,
          nextPricing: nextEpisodePricing,
          packPricing: nextPackPricing,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setCommerceState({
          loading: false,
          offerDecision: null,
          currentPricing: createPricingFallback(episodeData?.pricePts || 0),
          nextPricing: createPricingFallback(nextEpisode?.pricePts || 0),
          packPricing: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    commerceActive,
    isSubscriber,
    paidPts,
    bonusPts,
    isAdultMode,
    seriesId,
    episodeId,
    nextEpisode?.pricePts,
    nextEpisode?.ttfEligible,
    episodeData?.pricePts,
    subscription,
    coupons,
    subscriptionUsage?.remaining,
  ]);

  const fetchEpisode = useCallback(
    async ({ bustSeries = false, showLoading = true } = {}) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const adultFlag = isAdultMode ? "1" : "0";
      const episodePath = `/api/episode?seriesId=${seriesId}&episodeId=${episodeId}`;
      const seriesPath = `/api/series/${seriesId}?adult=${adultFlag}`;
      const isCurrentRequest = () => requestRef.current === requestId;
      const applyFailure = (response, fallbackError) => {
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
              source: "reader",
              seriesId,
              reason: response.reason,
              requestId: response.requestId,
            });
            gateReportedRef.current = true;
          }
        } else if (response.status === 401) {
          window.dispatchEvent(new CustomEvent("auth:open"));
          setError(fallbackError);
        } else {
          setError(fallbackError);
        }

        if (showLoading) {
          setLoading(false);
        }
        return true;
      };

      const [episodeResponse, seriesResponse] = await parallelRequests2(
        () => apiGet(episodePath, bustSeries ? { dedupeMs: 0 } : undefined),
        () =>
          apiGet(
            seriesPath,
            bustSeries
              ? {
                  bust: true,
                  dedupeMs: 0,
                }
              : undefined
          )
      );

      if (!isCurrentRequest()) {
        return;
      }

      if (!episodeResponse.ok) {
        applyFailure(episodeResponse, "EPISODE_ERROR");
        return;
      }

      if (!seriesResponse.ok) {
        applyFailure(seriesResponse, "SERIES_ERROR");
        return;
      }

      if (seriesResponse.data?.error === "ADULT_GATED") {
        applyFailure(
          {
            ...seriesResponse,
            ok: false,
            status: 403,
            error: "ADULT_GATED",
            reason: seriesResponse.data?.reason,
            requestId: seriesResponse.data?.requestId,
          },
          "SERIES_ERROR"
        );
        return;
      }

      setEpisodeData(episodeResponse.data?.episode);
      setSeriesData(seriesResponse.data);
      setGateStatus("OK");
      if (showLoading) {
        setLoading(false);
      }

      if (!bustSeries && seriesResponse.stale) {
        apiGet(seriesPath, {
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          if (!isCurrentRequest()) {
            return;
          }
          if (!freshResponse.ok) {
            applyFailure(freshResponse, "SERIES_ERROR");
            return;
          }
          if (freshResponse.data?.error === "ADULT_GATED") {
            applyFailure(
              {
                ...freshResponse,
                ok: false,
                status: 403,
                error: "ADULT_GATED",
                reason: freshResponse.data?.reason,
                requestId: freshResponse.data?.requestId,
              },
              "SERIES_ERROR"
            );
            return;
          }
          setSeriesData(freshResponse.data);
          setGateStatus("OK");
        });
      }
    },
    [forceDisableAdultMode, isAdultMode, episodeId, seriesId]
  );

  useEffect(() => {
    if (!loading && episodeData && isSignedIn) {
      restoreProgress();
    }
  }, [loading, episodeData, isSignedIn, restoreProgress]);

  useEffect(() => {
    if (!routeAttribution) {
      setActiveAttribution(null);
      return;
    }

    const persistedAttribution = loadPersistedPaymentAttribution();
    const attribution = shouldPreserveDiscoveryAttribution(routeAttribution?.entryPoint)
      ? mergePaymentAttribution(routeAttribution, {
          entryPoint: persistedAttribution?.entryPoint || routeAttribution?.entryPoint,
          campaignId: persistedAttribution?.campaignId || routeAttribution?.campaignId,
          sourcePath: persistedAttribution?.sourcePath || routeAttribution?.sourcePath,
        })
      : mergePaymentAttribution(persistedAttribution, routeAttribution);
    setActiveAttribution(attribution);
    if (attribution) {
      persistPaymentAttribution(attribution);
    }
  }, [routeAttribution]);

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
    if (typeof document === "undefined") {
      return undefined;
    }
    document.body.classList.add("reader-page");
    return () => {
      document.body.classList.remove("reader-page");
      document.body.classList.remove("reader-page-fullscreen");
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.body.classList.toggle("reader-page-fullscreen", Boolean(fullscreen));
  }, [fullscreen]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    const syncFullscreenState = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, [setFullscreen]);

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
      trackEvent("view_reader", { seriesId, episodeId });
    }
  }, [episodeData?.id, episodeId, seriesId]);

  useEffect(() => {
    if (error !== "ADULT_GATED") {
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
    if (gateStatus !== "OK") {
      setGateStatus("OK");
    }
  }, [adultConfirmed, error, gateStatus, hydrated, isAdultMode, isSignedIn]);

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
    fetchEpisode({ bustSeries: true });
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
      fetchEpisode({ bustSeries: true });
    }
    return response;
  };

  const handleAgeConfirm = () => {
    confirmAdultAge(ageRuleKey);
    setActiveModal(null);
    setGateStatus("OK");
    fetchEpisode({ bustSeries: true });
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
      trackEvent("paywall_impression", { seriesId, episodeId, source: "preview" });
    }
  }, [showPaywall, seriesId, episodeId]);

  useEffect(() => {
    if (!showEndOverlay) {
      return;
    }
    if (offerDecision?.recommendedUnlockOfferId) {
      trackEvent("offer_impression", {
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
      trackEvent("offer_impression", {
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
      if (scrollRafRef.current) {
        return;
      }
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const percent = total > 0 ? window.scrollY / total : 0;
        const next = Math.min(1, Math.max(0, percent));
        scrollRef.current = next;
        if (Math.abs(next - lastUiProgressRef.current) >= 0.005) {
          lastUiProgressRef.current = next;
          setScrollPercent(next);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    progressTimerRef.current = setInterval(() => {
      setProgress(seriesId, episodeId, scrollRef.current);
    }, 2000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
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
      label: `Ep ${episodeId} - ${Math.round(scrollRef.current * 100)}%`,
    });
    setModalState({
      type: "SUCCESS",
      title: "Bookmarked",
      description: "Bookmark saved.",
    });
  }, [addBookmark, episodeId, activePageIndex, seriesId]);

  const handleToggleAutoScroll = useCallback(() => {
    const next = !autoScroll;
    setAutoScroll(next);
    setUiToast(next ? "Auto scroll ON" : "Auto scroll OFF");
  }, [autoScroll, setAutoScroll]);

  const handleToggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setUiToast("Fullscreen OFF");
        return;
      }

      if (typeof document.documentElement.requestFullscreen !== "function") {
        setUiToast("Fullscreen unavailable");
        return;
      }

      await document.documentElement.requestFullscreen();
      setUiToast("Fullscreen ON");
    } catch {
      setUiToast("Fullscreen unavailable");
    }
  }, []);

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
        handleToggleAutoScroll();
      }
      if (event.key === "ArrowLeft" && prevEpisode) {
        router.push(buildEpisodeHref(prevEpisode.id));
      }
      if (event.key === "ArrowRight") {
        if (!nextEpisode) {
          return;
        }
        if (nextUnlocked) {
          router.push(buildEpisodeHref(nextEpisode.id));
          return;
        }
        setShowEndOverlay(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleAddBookmark,
    buildEpisodeHref,
    handleToggleAutoScroll,
    nextEpisode,
    nextUnlocked,
    prevEpisode,
    router,
    seriesId,
    toggleNightMode,
    nightMode,
  ]);

  useEffect(() => {
    if (!autoScroll || typeof window === "undefined") {
      return;
    }
    const step = Math.max(32, Number(autoScrollSpeed || 1) * 36);
    const timer = window.setInterval(() => {
      window.scrollBy({ top: step, behavior: "auto" });
    }, 80);
    return () => window.clearInterval(timer);
  }, [autoScroll, autoScrollSpeed]);

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
      title: "Not enough points",
      description: "Add points or use member perks to keep reading.",
      shortfallPts: response.shortfallPts || 0,
      targetEpisodeId,
      offerId: offerDecision?.recommendedTopupOffer?.id,
    });
  };

  const handleUnlockCurrent = async () => {
    trackEvent("paywall_unlock_click", { seriesId, episodeId });
    const response = await handleUnlock(episodeId);
    if (response.ok) {
      setModalState({
        type: "SUCCESS",
        title: "Episode unlocked",
        description: "This episode is now in your library.",
      });
      return;
    }
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:open"));
      setModalState({
        type: "ERROR",
        title: "Sign in required",
        description: "Sign in to unlock this episode and keep your progress synced.",
      });
      return;
    }
    if (response.status === 402) {
      handleShortfall(response, episodeId);
      return;
    }
    trackEvent("unlock_fail", {
      seriesId,
      episodeId,
      status: response.status,
      errorCode: response.error,
      requestId: response.requestId,
    });
    setModalState({
      type: "ERROR",
      title: "Unlock failed",
      description: response.error || "Please try again in a moment.",
    });
  };

  const handleUnlockNext = async () => {
    if (!nextEpisode) {
      return;
    }
    const response = await handleUnlock(nextEpisode.id);
    if (response.ok) {
      router.push(buildEpisodeHref(nextEpisode.id));
      return;
    }
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:open"));
      setModalState({
        type: "ERROR",
        title: "Sign in required",
        description: "Sign in to unlock this episode and keep your progress synced.",
      });
      return;
    }
    if (response.status === 402) {
      handleShortfall(response, nextEpisode.id);
      return;
    }
    trackEvent("unlock_fail", {
      seriesId,
      episodeId: nextEpisode.id,
      status: response.status,
      errorCode: response.error,
      requestId: response.requestId,
    });
    setModalState({
      type: "ERROR",
      title: "Unlock failed",
      description: response.error || "Please try again in a moment.",
    });
  };

  const handleClaimNext = async () => {
    if (!nextEpisode) {
      return;
    }
    const response = await handleClaim(nextEpisode.id);
    if (response.ok) {
      router.push(buildEpisodeHref(nextEpisode.id));
      return;
    }
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:open"));
      setModalState({
        type: "ERROR",
        title: "Sign in required",
        description: "Sign in to claim this free unlock and keep your progress synced.",
      });
      return;
    }
    setModalState({
      type: "ERROR",
      title: "Free unlock unavailable",
      description: response.error || "The free unlock timer is not ready yet.",
    });
  };

  const handlePackOffer = async (offer) => {
    const packSize = Number(offer?.episodes || 0);
    if (!packSize || currentIndex < 0 || !offer?.id) {
      return;
    }
    const targets = episodes.slice(currentIndex + 1, currentIndex + 1 + packSize);
    if (targets.length === 0) {
      return;
    }
    const response = await unlockPack(
      seriesId,
      targets.map((episode) => episode.id),
      offer.id
    );
    if (!response.ok) {
      if (response.status === 402) {
        handleShortfall(response, targets[0].id);
        return;
      }
      setModalState({
        type: "ERROR",
        title: "Unlock failed",
        description: response.error || "Please try again in a moment.",
      });
      return;
    }
    setModalState({
      type: "SUCCESS",
      title: "Pack unlocked",
      description: `${targets.length} episodes are now unlocked and ready to read.`,
    });
    router.push(buildEpisodeHref(targets[0].id));
  };

  const handleGoBookmark = (bookmark) => {
    if (bookmark.episodeId && bookmark.episodeId !== episodeId) {
      router.push(buildEpisodeHref(bookmark.episodeId));
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
      router.push(buildEpisodeHref(nextId));
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
          onBack={() => router.push(buildSeriesHref())}
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
          onBack={() => router.push(buildSeriesHref())}
        />
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

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <ReaderTopBar
          title="Error"
          episodeLabel="..."
          onBack={() => router.push(buildSeriesHref())}
        />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-200 font-semibold mb-2">Failed to Load</p>
            <p className="text-xs text-red-300 mb-4">Unable to load episode content. Please check your connection or try again later.</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => fetchEpisode({ bustSeries: true })}
                className="rounded-full border border-red-400 bg-red-500/20 px-4 py-2 text-xs text-red-200 hover:bg-red-500/30"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => router.push(buildSeriesHref())}
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200"
              >
                Back to Series
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${nightMode ? "bg-black text-neutral-100" : "bg-neutral-950 text-neutral-100"}`}>
      <ReaderTopBar
        title={seriesData?.series?.title || "Series"}
        episodeLabel={episodeData?.title || episodeId}
        onBack={() => router.push(buildSeriesHref())}
        onOpenToc={() => setDrawerOpen(true)}
        onAddBookmark={handleAddBookmark}
        onToggleNight={toggleNightMode}
        onToggleLayout={handleToggleLayout}
        onOpenSettings={() => setSettingsPanelOpen(true)} // 
        onToggleAutoScroll={handleToggleAutoScroll}
        autoScroll={autoScroll}
        nightMode={nightMode}
        layoutMode={layoutModeForView}
        disableLayoutToggle={!isComic}
        progress={scrollPercent}
        onPrev={() =>
          prevEpisode
            ? router.push(buildEpisodeHref(prevEpisode.id))
            : null
        }
        onNext={() => {
          if (!nextEpisode) {
            return;
          }
          if (nextUnlocked) {
            router.push(buildEpisodeHref(nextEpisode.id));
            return;
          }
          setShowEndOverlay(true);
        }}
        nextLocked={nextEpisode ? !nextUnlocked : false}
      />
      <div className="mx-auto hidden max-w-5xl px-4 pt-3 text-[11px] text-neutral-500 md:block">
        Shortcuts: N = night mode, T = contents, B = bookmark, Left/Right = prev/next, A = auto scroll
      </div>

      {commerceNotice && !showPaywall ? (
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        </div>
      ) : null}

      {discoveryContext ? (
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left shadow-[0_20px_70px_rgba(0,0,0,0.18)] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/85">
                Opened from
              </p>
              <p className="mt-2 font-semibold text-white">
                {discoveryContext.sourceLabel} | {discoveryContext.laneValue}
              </p>
              <p className="mt-1 text-sm leading-6 text-neutral-400">{discoveryContext.returnHint}</p>
            </div>
            <button
              type="button"
              onClick={handleReturnToDiscovery}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
            >
              {discoveryContext.returnLabel}
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ filter: `brightness(${brightness || 100}%)` }}>
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
      </div>

      {showPaywall ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/95 p-6 text-center">
            {commerceNotice ? (
              <div className="mb-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/85">
                      {commerceNotice.eyebrow}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">{commerceNotice.title}</p>
                    <p className="mt-2 text-xs leading-6 text-neutral-300">{commerceNotice.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommerceNotice(null)}
                    className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold text-neutral-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}
            <h2 className="text-xl font-semibold">Unlock this episode</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Continue reading with a one-tap unlock, points pack, or member perk.
            </p>
            {previewCount ? (
              <p className="mt-2 text-xs text-neutral-500">
                Free preview reached: {previewCount} pages.
              </p>
            ) : previewParagraphs ? (
              <p className="mt-2 text-xs text-neutral-500">
                Free preview reached: {previewParagraphs} sections.
              </p>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Wallet
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{walletBalance} points</p>
                <p className="mt-1 text-xs text-neutral-500">Current balance across this account.</p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Unlock price
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {currentPricing.finalPrice === 0 ? "Free" : `${currentPricing.finalPrice} points`}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {currentPricing.appliedDailyFree
                    ? "Daily free unlock is ready."
                    : currentPricing.discountPct
                      ? `Subscriber ${currentPricing.discountPct}% off is active.`
                      : "Standard wallet pricing."}
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Reading mode
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{isSubscriber ? "Member" : "Standard"}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {isSubscriber ? "Discounts and daily perks are available." : "Points and packs are available."}
                </p>
              </div>
            </div>
            {currentPricing.appliedDailyFree ? (
              <p className="mt-3 text-xs text-emerald-300">Daily free unlock available</p>
            ) : currentPricing.discountPct ? (
              <p className="mt-3 text-xs text-emerald-300">
                Subscriber {currentPricing.discountPct}% off
              </p>
            ) : null}
            {upcomingEpisodes.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-4 text-left">
                <p className="text-sm font-semibold text-neutral-100">What opens up next</p>
                <div className="mt-3 space-y-2">
                  {upcomingEpisodes.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-black/20 px-3 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.unlocked
                            ? "Already unlocked"
                            : item.ttfEligible
                              ? "Timed free unlock supported"
                              : "Premium chapter"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-neutral-300">
                        {item.unlocked ? "Ready" : item.pricePts ? `${item.pricePts} pts` : "Locked"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              ref={unlockCurrentButtonRef}
              type="button"
              onClick={handleUnlockCurrent}
              className={`mt-6 w-full min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold text-neutral-900 transition-all active:scale-95 ${
                commerceNotice
                  ? "bg-emerald-200 shadow-[0_0_0_1px_rgba(110,231,183,0.35),0_24px_60px_rgba(16,185,129,0.24)] motion-safe:animate-pulse hover:bg-emerald-100 active:bg-emerald-200"
                  : "bg-white hover:bg-emerald-50 active:bg-emerald-100"
              }`}
              style={{ willChange: "transform" }}
            >
              {currentPricing.finalPrice === 0
                ? "Unlock free"
                : `Unlock (${currentPricing.finalPrice} points)`}
            </button>
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-left text-[11px] text-neutral-300">
              <div className="font-semibold text-neutral-100">Why unlock?</div>
              <div className="mt-2 space-y-1 text-neutral-400">
                <div>- Unlocking keeps this episode in your library.</div>
                <div>- Episode packs lower your cost per chapter.</div>
                <div>- Membership adds daily free unlocks and shorter wait timers.</div>
                <div>- Orders and Support stay available if billing follow-up is needed.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                trackEvent("click_subscribe_from_paywall", { seriesId, episodeId });
                router.push(
                  buildPathWithAttribution(
                    "/subscribe",
                    buildReaderCommerceAttribution("READER_PAYWALL", episodeId),
                  )
                );
              }}
              className="mt-3 w-full rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100"
            >
              {STOREFRONT_TERMS.compareMembership}
            </button>
            <button
              type="button"
              onClick={() => {
                trackEvent("offer_click", { offerId: "store_entry", entry: "READER_PAYWALL" });
                router.push(
                  buildPathWithAttribution(
                    "/store",
                    buildReaderCommerceAttribution("READER_PAYWALL", episodeId),
                    { returnTo: readerPath, focus: "auto" }
                  )
                );
              }}
              className="mt-2 w-full rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300"
            >
              {STOREFRONT_TERMS.viewPointPacks}
            </button>
            <button
              type="button"
              onClick={() => router.push(buildSeriesHref())}
              className="mt-2 w-full rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300"
            >
              Back to series details
            </button>
          </div>
        </div>
      ) : null}

      {showEndOverlay ? (
        <EndOfEpisodeOverlay
          open
          seriesId={seriesId}
          series={seriesData?.series}
          sourcePath={readerPath}
          returnTo={readerPath}
          discoveryContext={discoveryContext}
          nextEpisode={nextEpisode}
          nextUnlocked={nextUnlocked}
          decision={offerDecision}
          pricing={nextPricing}
          packPricing={packPricing}
          seriesTitle={seriesData?.series?.title}
          episodeTitle={episodeData?.episode?.title}
          onNext={() => router.push(buildEpisodeHref(nextEpisode?.id))}
          onUnlock={handleUnlockNext}
          onSubscribe={() => {
            trackEvent("click_subscribe_from_reader_end", {
              seriesId,
              episodeId,
              nextEpisodeId: nextEpisode?.id || null,
            });
            router.push(
              buildPathWithAttribution(
                "/subscribe",
                buildReaderCommerceAttribution("READER_END", nextEpisode?.id || episodeId),
              )
            );
          }}
          onClaim={handleClaimNext}
          onOfferClick={(offerId) =>
            trackEvent("offer_click", { offerId, entry: "READER_END" })
          }
          onPackOffer={handlePackOffer}
          walletBalance={walletBalance}
          isSubscriber={isSubscriber}
          upcomingEpisodes={upcomingEpisodes}
          onOpenStore={() =>
            router.push(
              buildPathWithAttribution(
                "/store",
                buildReaderCommerceAttribution("READER_END", nextEpisode?.id || episodeId),
                { returnTo: readerPath, focus: "auto" }
              )
            )
          }
          onViewSeries={() => router.push(buildSeriesHref())}
          onReturnToSource={handleReturnToDiscovery}
          onOpenSupport={() => router.push("/support")}
          primaryActionRef={endOverlayPrimaryActionRef}
          highlightPrimaryAction={Boolean(commerceNotice)}
          onNotify={() =>
            setModalState({
              type: "INFO",
              title: "Notify me",
              description: "We will notify you when it's ready.",
            })
          }
        />
      ) : null}

      {drawerOpen ? (
        <ReaderDrawer
          open
          onClose={() => setDrawerOpen(false)}
          episodes={episodes}
          unlockedIds={entitlement.unlockedEpisodeIds}
          currentSeriesId={seriesId}
          currentEpisodeId={episodeId}
          bookmarks={bookmarks}
          onSelectEpisode={handleSelectEpisode}
          onGoBookmark={handleGoBookmark}
          onRemoveBookmark={(id) => removeBookmark(seriesId, id)}
          onSubscribe={() =>
            router.push(
              buildPathWithAttribution(
                "/subscribe",
                buildReaderCommerceAttribution("READER_DRAWER", episodeId),
              )
            )
          }
        />
      ) : null}

      {modalState ? (
        <ActionModal
          open
          type={modalState?.type}
          title={modalState?.title}
          description={modalState?.description}
          shortfallPts={modalState?.shortfallPts}
          offer={
            modalState?.type === "SHORTFALL"
              ? offerDecision?.recommendedTopupOffer
              : offerDecision?.recommendedUnlockOffer
          }
          offerBadge={
            modalState?.type === "SHORTFALL"
              ? offerDecision?.recommendedTopupOffer?.tag
              : offerDecision?.recommendedUnlockOffer?.tag
          }
          offerSavingsText={
            modalState?.type !== "SHORTFALL" && offerDecision?.recommendedUnlockOffer?.savingsPct
              ? `You save ${offerDecision.recommendedUnlockOffer.savingsPct}%`
              : null
          }
          compareItems={
            modalState?.type === "SHORTFALL" &&
            offerDecision?.recommendedUnlockOffer?.episodes > 1
              ? [
                  {
                    label: "Single episode",
                    value: `${episodeData?.pricePts || 0} points`,
                  },
                  {
                    label: `${offerDecision.recommendedUnlockOffer.episodes}-episode pack`,
                    value: `${offerDecision.recommendedUnlockOffer.pricePts} points`,
                  },
                  {
                    label: "Membership",
                    value: isSubscriber ? "Already active" : "Daily free + lower unlock cost",
                  },
                ]
              : []
          }
          compareTitle="Single, pack, or membership"
          tips={
            modalState?.type === "SHORTFALL"
              ? [
                  "Unlocking keeps this episode in your library.",
                  "Episode packs lower your cost per chapter.",
                  "Membership adds daily free unlocks and shorter wait timers.",
                  "Member perks can reduce unlock costs on supported titles.",
                ]
              : []
          }
          tipsTitle="What changes after each choice"
          actions={
            modalState?.type === "SHORTFALL"
              ? [
                  {
                    label: STOREFRONT_TERMS.viewPointPacks,
                    onClick: () => {
                      router.push(
                        buildPathWithAttribution(
                          "/store",
                          buildReaderCommerceAttribution("READER_PAYWALL", episodeId),
                          { returnTo: readerPath, focus: "auto" }
                        )
                      );
                      trackEvent("offer_click", {
                        offerId: "store_entry",
                        entry: "READER_PAYWALL",
                      });
                      setModalState(null);
                    },
                    variant: "secondary",
                  },
                  {
                    label: STOREFRONT_TERMS.compareMembership,
                    onClick: () => {
                      trackEvent("click_subscribe_from_shortfall", {
                        seriesId,
                        episodeId,
                      });
                      router.push(
                        buildPathWithAttribution(
                          "/subscribe",
                          buildReaderCommerceAttribution(
                            "READER_PAYWALL",
                            modalState?.targetEpisodeId || episodeId,
                          ),
                        )
                      );
                      setModalState(null);
                    },
                    variant: "secondary",
                  },
                  {
                    label: offerDecision?.recommendedTopupOffer?.name
                      ? `Top up ${offerDecision.recommendedTopupOffer.name}`
                      : "Top up recommended pack",
                    onClick: async () => {
                      const packageId =
                        offerDecision?.recommendedTopupOffer?.id?.replace(
                          "points_pack_",
                          ""
                        ) || "starter";
                      trackEvent("offer_click", {
                        offerId: offerDecision?.recommendedTopupOffer?.id,
                        entry: "READER_PAYWALL",
                      });
                      const topupResponse = await topup(packageId, {
                        attribution: buildReaderCommerceAttribution("READER_PAYWALL", episodeId, {
                          offerId: offerDecision?.recommendedTopupOffer?.id || `points_pack_${packageId}`,
                        }),
                      });
                      if (topupResponse.ok) {
                        const retryId = modalState?.targetEpisodeId || episodeId;
                        const retry = await handleUnlock(retryId);
                        if (retry.ok && nextEpisode && retryId === nextEpisode.id) {
                          router.push(buildEpisodeHref(nextEpisode.id));
                          return;
                        }
                        trackEvent("offer_purchase_success", {
                          offerId: offerDecision?.recommendedTopupOffer?.id,
                          entry: "READER_PAYWALL",
                          orderId: topupResponse.data?.order?.orderId,
                        });
                        trackEvent("topup_success", {
                          packageId,
                          orderId: topupResponse.data?.order?.orderId,
                        });
                        setModalState({
                          type: "SUCCESS",
                          title: "Episode unlocked",
                          description: "This episode is now in your library.",
                        });
                        return;
                      }
                      trackEvent("topup_fail", {
                        packageId,
                        status: topupResponse.status,
                        errorCode: topupResponse.error,
                        requestId: topupResponse.requestId,
                      });
                      setModalState({
                        type: "ERROR",
                        title: "Couldn't top up",
                        description: "We couldn't complete the top-up and unlock flow.",
                      });
                    },
                    variant: "primary",
                  },
                ]
              : null
          }
          onClose={() => setModalState(null)}
        />
      ) : null}

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
      {settingsPanelOpen ? (
        <ReaderSettingsPanel
          isOpen
          onClose={() => setSettingsPanelOpen(false)}
          nightMode={nightMode}
          onToggleNight={toggleNightMode}
          layoutMode={layoutModeForView}
          onToggleLayout={handleToggleLayout}
          disableLayoutToggle={!isComic}
          brightness={brightness}
          onBrightnessChange={setBrightness}
          autoScroll={autoScroll}
          onToggleAutoScroll={handleToggleAutoScroll}
          autoScrollSpeed={autoScrollSpeed}
          onAutoScrollSpeedChange={setAutoScrollSpeed}
          fullscreen={fullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          showLayoutControls={isComic}
        />
      ) : null}
    </main>
  );
}
