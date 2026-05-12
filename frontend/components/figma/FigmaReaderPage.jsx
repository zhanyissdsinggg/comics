"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Heart,
  List,
  Lock,
  MessageCircle,
  Moon,
  MoreVertical,
  Settings2,
  Share2,
  SunMedium,
  Wallet,
  X,
} from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { resolveSeriesCreatorName } from "../../lib/creatorIdentity";
import {
  formatInstallmentLabel,
  getInstallmentLabel,
  isDefaultInstallmentTitle,
} from "../../lib/seriesFormatLabels";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useBookmarkStore } from "../../store/useBookmarkStore";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useReaderSettingsStore } from "../../store/useReaderSettingsStore";
import { useWalletStore } from "../../store/useWalletStore";
import { trackEvent } from "../../lib/trackEvent";
import PageStream from "../reader/PageStream";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import FigmaCommentsSection from "./FigmaCommentsSection";
import {
  getContentModeQueryParam,
  isAdultContent,
  matchesContentMode,
} from "../../lib/contentFilters";
import { cn } from "./figma-utils";

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `reader_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatMetaDate(value) {
  if (!value) {
    return "Today";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Today";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatPriceLabel(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? `${numeric} pts` : "Free";
}

function resolveEpisodeDisplayTitle(title, fallbackLabel, seriesType) {
  const normalizedTitle = String(title || "").trim();
  if (!normalizedTitle || isDefaultInstallmentTitle(normalizedTitle, seriesType)) {
    return fallbackLabel;
  }

  return normalizedTitle;
}

function scrollToNode(node, offset = 88) {
  if (typeof window === "undefined" || !node) {
    return;
  }

  const top = node.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function scheduleIdleTask(callback, timeout = 180) {
  if (typeof window === "undefined" || typeof callback !== "function") {
    return () => undefined;
  }

  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(() => callback(), { timeout });
    return () => window.cancelIdleCallback(idleId);
  }

  const timer = window.setTimeout(() => callback(), timeout);
  return () => window.clearTimeout(timer);
}

function withFallbackAdultFlag(item, fallbackAdult = false) {
  if (!item || typeof item !== "object") {
    return item;
  }

  const hasModeSignal = [
    "adult",
    "isAdult",
    "mature",
    "isMature",
    "nsfw",
    "rating",
    "ageRating",
    "contentRating",
    "category",
    "tags",
    "genres",
    "mode",
  ].some((field) => Object.prototype.hasOwnProperty.call(item, field));

  return hasModeSignal ? item : { ...item, adult: fallbackAdult };
}

function resolveModeBlockFromError(response) {
  if (!response || response.ok) {
    return "";
  }

  if (response.reason === "NORMAL_MODE_REQUIRED") {
    return "normal";
  }

  if (response.error === "ADULT_GATED" || response.reason === "NEED_AGE_CONFIRM") {
    return "adult";
  }

  return "";
}

function Pill({ className = "", children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-base font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function QueueCard({
  eyebrow,
  title,
  description,
  ctaLabel,
  onClick,
  buttonClassName = "",
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{eyebrow}</p>
      <p className="mt-2 text-sm font-black text-white">{title}</p>
      <p className="mt-2 min-h-[44px] text-sm leading-6 text-gray-400">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition-all active:scale-[0.98]",
          buttonClassName ||
            "border border-white/10 bg-white/5 text-white hover:bg-white/10",
        )}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

function ReaderContent({ seriesId, episodeId, fallbackData = null }) {
  const router = useRouter();
  const previewEndRef = useRef(null);
  const endRef = useRef(null);
  const commentsRef = useRef(null);
  const historyLoggedRef = useRef(false);
  const gateReportedRef = useRef("");
  const episodeStartRef = useRef("");
  const episodeCompleteRef = useRef("");
  const adultReaderEnterRef = useRef("");
  const progressMilestonesRef = useRef([]);
  const { palette, contentMode, handleAdultToggle, confirmAdultMode, openLogin } = useFigmaSite();
  const { bookmarksBySeries, addBookmark, removeBookmark } = useBookmarkStore();
  const { loadEntitlement, unlockEpisode, bySeriesId } = useEntitlementStore();
  const { isSignedIn } = useAuthStore();
  const { isAdultMode } = useAdultGateStore();
  const { addHistory } = useHistoryStore();
  const { loadWallet, paidPts, bonusPts } = useWalletStore();
  const { nightMode, toggleNightMode, layoutMode, setLayoutMode, brightness, setBrightness } =
    useReaderSettingsStore();
  const [seriesData, setSeriesData] = useState(null);
  const [episodeData, setEpisodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modeBlock, setModeBlock] = useState("");
  const [showNav, setShowNav] = useState(true);
  const [liked, setLiked] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [hasReachedPreviewEnd, setHasReachedPreviewEnd] = useState(false);
  const [hasReachedChapterEnd, setHasReachedChapterEnd] = useState(false);
  const entitlement = bySeriesId[seriesId] || { unlockedEpisodeIds: [] };

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setModeBlock("");
      gateReportedRef.current = "";
      episodeStartRef.current = "";
      episodeCompleteRef.current = "";
      adultReaderEnterRef.current = "";
      progressMilestonesRef.current = [];
      const adultFlag = getContentModeQueryParam(contentMode);
      const seriesResponse = await apiGet(
        `/api/series/${encodeURIComponent(seriesId)}?adult=${adultFlag}`,
        { cacheMs: 0 },
      );

      if (!active) {
        return;
      }

      const seriesModeBlock = resolveModeBlockFromError(seriesResponse);
      if (seriesModeBlock) {
        setSeriesData(null);
        setEpisodeData(null);
        setModeBlock(seriesModeBlock);
        setLoading(false);
        return;
      }

      if (!seriesResponse.ok || !seriesResponse.data?.series) {
        setSeriesData(null);
        setEpisodeData(null);
        setError(seriesResponse.error || "SERIES_LOAD_FAILED");
        setLoading(false);
        return;
      }

      const nextSeriesData = seriesResponse.data;
      const nextIsAdultSeries = isAdultContent(nextSeriesData?.series);
      setSeriesData(nextSeriesData);

      if (!matchesContentMode(nextSeriesData?.series, contentMode)) {
        setEpisodeData(null);
        setModeBlock(nextIsAdultSeries ? "adult" : "normal");
        setLoading(false);
        return;
      }

      const episodeResponse = await apiGet(
        `/api/episode?seriesId=${encodeURIComponent(seriesId)}&episodeId=${encodeURIComponent(episodeId)}&adult=${adultFlag}`,
        { cacheMs: 0 },
      );

      if (!active) {
        return;
      }

      const episodeModeBlock = resolveModeBlockFromError(episodeResponse);
      if (episodeModeBlock) {
        setEpisodeData(null);
        setModeBlock(episodeModeBlock);
        setLoading(false);
        return;
      }

      if (!episodeResponse.ok || !episodeResponse.data?.episode) {
        setEpisodeData(null);
        setError(episodeResponse.error || "EPISODE_LOAD_FAILED");
        setLoading(false);
        return;
      }

      const nextEpisode = withFallbackAdultFlag(
        episodeResponse.data.episode,
        nextIsAdultSeries,
      );

      if (!matchesContentMode(nextEpisode, contentMode)) {
        setEpisodeData(null);
        setModeBlock(nextIsAdultSeries ? "adult" : "normal");
        setLoading(false);
        return;
      }

      historyLoggedRef.current = false;
      setEpisodeData(nextEpisode);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [contentMode, episodeId, isAdultMode, seriesId]);

  useEffect(() => {
    if (
      !isSignedIn ||
      !seriesId ||
      modeBlock ||
      !seriesData?.series ||
      !matchesContentMode(seriesData.series, contentMode)
    ) {
      return;
    }

    void loadEntitlement(seriesId);
  }, [contentMode, isSignedIn, loadEntitlement, modeBlock, seriesData?.series, seriesId]);

  useEffect(() => {
    if (!isSignedIn || !episodeData?.id || modeBlock) {
      return undefined;
    }

    return scheduleIdleTask(() => {
      void loadWallet();
    });
  }, [episodeData?.id, isSignedIn, loadWallet, modeBlock]);

  useEffect(() => {
    if (!isSignedIn || historyLoggedRef.current || !seriesData?.series || !episodeData?.id) {
      return;
    }

    historyLoggedRef.current = true;
    void addHistory({ seriesId, episodeId, title: seriesData.series.title, percent: 0.08 });
  }, [addHistory, episodeData?.id, episodeId, isSignedIn, seriesData?.series, seriesId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let lastScroll = window.scrollY;
    const onScroll = () => {
      if (window.scrollY > lastScroll && window.scrollY > 100) {
        setShowNav(false);
      } else if (window.scrollY < lastScroll) {
        setShowNav(true);
      }
      lastScroll = window.scrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const seriesIsAdult = useMemo(
    () => isAdultContent(seriesData?.series),
    [seriesData?.series],
  );
  const episodes = useMemo(() => {
    const list = Array.isArray(seriesData?.episodes) ? seriesData.episodes : [];
    return list.filter((item) =>
      matchesContentMode(withFallbackAdultFlag(item, seriesIsAdult), contentMode),
    );
  }, [contentMode, seriesData, seriesIsAdult]);
  const currentEpisode = useMemo(
    () => episodes.find((item) => String(item?.id || "") === String(episodeId || "")) || null,
    [episodeId, episodes],
  );
  const currentIndex = useMemo(
    () => episodes.findIndex((item) => String(item?.id || "") === String(episodeId || "")),
    [episodeId, episodes],
  );
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;
  const seriesType = seriesData?.series?.type || episodeData?.type || "comic";
  const installmentLabel = getInstallmentLabel(seriesType);
  const installmentPlural = getInstallmentLabel(seriesType, { plural: true });
  const currentNumber = currentEpisode?.number || episodeData?.number || 1;
  const currentInstallmentLabel = formatInstallmentLabel(seriesType, currentNumber);
  const rawEpisodeTitle = String(
    currentEpisode?.title || episodeData?.title || fallbackData?.episodeTitle || "",
  ).trim();
  const currentEpisodeTitle =
    rawEpisodeTitle && !isDefaultInstallmentTitle(rawEpisodeTitle, seriesType)
      ? rawEpisodeTitle
      : currentInstallmentLabel;
  const currentPricePts = Number(
    currentEpisode?.access?.pricePts ?? currentEpisode?.pricePts ?? episodeData?.pricePts ?? 0,
  );
  const unlocked =
    currentPricePts <= 0 || entitlement.unlockedEpisodeIds.includes(String(episodeId));
  const seriesBookmarks = useMemo(
    () => (Array.isArray(bookmarksBySeries?.[seriesId]) ? bookmarksBySeries[seriesId] : []),
    [bookmarksBySeries, seriesId],
  );
  const currentBookmark = useMemo(
    () =>
      seriesBookmarks.find(
        (item) => String(item?.episodeId || "") === String(episodeId || ""),
      ) || null,
    [episodeId, seriesBookmarks],
  );
  const isComic = (episodeData?.type || seriesType) === "comic";
  const previewCount = !unlocked && isComic ? episodeData?.previewFreePages ?? 3 : null;
  const previewParagraphs = !unlocked && !isComic ? episodeData?.previewParagraphs ?? 3 : null;
  const pages = Array.isArray(episodeData?.pages) ? episodeData.pages : [];
  const paragraphs = Array.isArray(episodeData?.paragraphs) ? episodeData.paragraphs : [];
  const visibleUnits = isComic
    ? typeof previewCount === "number"
      ? Math.min(previewCount, pages.length)
      : pages.length
    : typeof previewParagraphs === "number"
      ? Math.min(previewParagraphs, paragraphs.length)
      : paragraphs.length;
  const safeVisibleUnits = Math.max(visibleUnits, 1);
  const readingPercent = safeVisibleUnits
    ? Math.max(
        0.01,
        Math.min(1, (Math.min(activeIndex, safeVisibleUnits - 1) + 1) / safeVisibleUnits),
      )
    : 0;
  const progressPercent = visibleUnits
    ? hasReachedChapterEnd || (!unlocked && hasReachedPreviewEnd)
      ? 100
      : Math.max(
          1,
          Math.min(
            100,
            Math.round(
              ((Math.min(activeIndex, safeVisibleUnits - 1) + 1) / safeVisibleUnits) * 100,
            ),
          ),
        )
    : 0;
  const isEpisodeComplete = Boolean(unlocked && hasReachedChapterEnd);
  const queuePercent =
    episodes.length > 1 && currentIndex >= 0 ? Math.round(((currentIndex + 1) / episodes.length) * 100) : 100;
  const creatorName =
    resolveSeriesCreatorName(seriesData?.series) || String(seriesData?.series?.author || "").trim() || "Editorial Crew";
  const walletBalance = Number(paidPts || 0) + Number(bonusPts || 0);
  const shortfallPts = Math.max(0, currentPricePts - walletBalance);
  const backToSeriesHref =
    fallbackData?.backToSeriesHref || `/series/${encodeURIComponent(seriesId)}`;
  const readerPath = `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`;
  const layoutModeForView = isComic ? layoutMode : "vertical";
  const shareUrl = typeof window !== "undefined" ? window.location.href : backToSeriesHref;
  const readerAnalyticsPayload = useMemo(
    () => ({
      seriesId,
      episodeId,
      contentMode,
      seriesType,
      isAdult: seriesIsAdult,
      unlocked,
    }),
    [contentMode, episodeId, seriesId, seriesIsAdult, seriesType, unlocked],
  );
  const previousQueueLabel = prevEpisode
    ? formatInstallmentLabel(seriesType, prevEpisode?.number || Math.max(currentNumber - 1, 1))
    : "Series overview";
  const previousQueueDescription = prevEpisode
    ? resolveEpisodeDisplayTitle(
        prevEpisode?.title,
        previousQueueLabel,
        seriesType,
      )
    : "No earlier installment is listed here, so the series page becomes the safe reset point.";
  const currentQueueDescription = unlocked
    ? `${currentInstallmentLabel} is fully open and synced in this reading session.`
    : `${safeVisibleUnits} free ${isComic ? "page" : "block"}${safeVisibleUnits === 1 ? "" : "s"} are open before unlock.`;
  const nextQueueLabel = nextEpisode
    ? formatInstallmentLabel(seriesType, nextEpisode?.number || currentNumber + 1)
    : "Series overview";
  const nextQueueDescription = nextEpisode
    ? `${resolveEpisodeDisplayTitle(nextEpisode?.title, nextQueueLabel, seriesType)} is ready next${
        Number(nextEpisode?.pricePts || 0) > 0
          ? ` at ${formatPriceLabel(nextEpisode?.pricePts)} if still locked.`
          : "."
      }`
    : "No next installment is listed yet, so the overview page is the cleanest next stop.";

  const handleEnterAdultReader = useCallback(async () => {
    trackEvent("adult_gate_confirm", {
      ...readerAnalyticsPayload,
      source: "reader",
    });

    if (!isSignedIn) {
      openLogin("login", readerPath);
      return;
    }

    await confirmAdultMode();
  }, [confirmAdultMode, isSignedIn, openLogin, readerAnalyticsPayload, readerPath]);

  const handleAdultGateExit = useCallback(() => {
    trackEvent("adult_gate_exit", {
      ...readerAnalyticsPayload,
      source: "reader",
    });
    router.push(backToSeriesHref);
  }, [backToSeriesHref, readerAnalyticsPayload, router]);

  const handleNavigateEpisode = useCallback(
    (targetEpisode, direction, source = "reader") => {
      if (!targetEpisode?.id) {
        router.push(backToSeriesHref);
        return;
      }

      const safeTarget = withFallbackAdultFlag(targetEpisode, seriesIsAdult);
      if (!matchesContentMode(safeTarget, contentMode)) {
        setToast(
          contentMode === "adult"
            ? "Switch back to normal mode to open this chapter."
            : "Enable adult mode to open this chapter.",
        );
        return;
      }

      trackEvent(direction === "previous" ? "previous_chapter_click" : "next_chapter_click", {
        ...readerAnalyticsPayload,
        source,
        targetEpisodeId: targetEpisode.id,
      });
      router.push(`/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(targetEpisode.id)}`);
    },
    [
      backToSeriesHref,
      contentMode,
      readerAnalyticsPayload,
      router,
      seriesId,
      seriesIsAdult,
    ],
  );

  const handleBookmarkToggle = useCallback(() => {
    if (currentBookmark?.id) {
      removeBookmark(seriesId, currentBookmark.id);
      trackEvent("bookmark_remove", {
        ...readerAnalyticsPayload,
        bookmarkId: currentBookmark.id,
      });
      setToast("Bookmark removed");
      setOverflowOpen(false);
      return;
    }

    const percent = isEpisodeComplete ? 1 : readingPercent;
    const bookmark = addBookmark(seriesId, {
      episodeId,
      percent,
      pageIndex: activeIndex,
      label: `${currentInstallmentLabel} - ${Math.round(percent * 100)}%`,
    });

    trackEvent("bookmark_add", {
      ...readerAnalyticsPayload,
      bookmarkId: bookmark?.id,
      percent: Math.round(percent * 100),
      pageIndex: activeIndex,
    });
    setToast("Bookmark saved");
    setOverflowOpen(false);
  }, [
    activeIndex,
    addBookmark,
    currentBookmark,
    currentInstallmentLabel,
    episodeId,
    isEpisodeComplete,
    readingPercent,
    readerAnalyticsPayload,
    removeBookmark,
    seriesId,
  ]);

  const handleToggleNight = useCallback(() => {
    trackEvent("reader_theme_change", {
      ...readerAnalyticsPayload,
      theme: nightMode ? "day" : "night",
      sourceSection: "reader_settings",
    });
    toggleNightMode();
  }, [nightMode, readerAnalyticsPayload, toggleNightMode]);

  const handleToggleLayout = useCallback(() => {
    if (!isComic) {
      return;
    }

    const nextLayout =
      layoutModeForView === "horizontal" ? "vertical" : "horizontal";
    trackEvent("reader_theme_change", {
      ...readerAnalyticsPayload,
      layoutMode: nextLayout,
      sourceSection: "reader_settings",
    });
    setLayoutMode(nextLayout);
  }, [isComic, layoutModeForView, readerAnalyticsPayload, setLayoutMode]);

  const handleShare = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: seriesData?.series?.title, text: currentEpisodeTitle, url: shareUrl });
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setToast("Reader link ready");
    } catch {
      setToast("Share cancelled");
    }
  }, [currentEpisodeTitle, seriesData?.series?.title, shareUrl]);

  const handleUnlockCurrent = useCallback(async () => {
    if (!isSignedIn) {
      openLogin("login", `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`);
      return;
    }

    if (shortfallPts > 0) {
      router.push("/store");
      return;
    }

    trackEvent("paywall_unlock_click", {
      ...readerAnalyticsPayload,
      pricePts: currentPricePts,
    });
    setUnlockBusy(true);
    const response = await unlockEpisode(seriesId, episodeId, createIdempotencyKey());
    setUnlockBusy(false);
    if (response.ok) {
      trackEvent("unlock_success", {
        ...readerAnalyticsPayload,
        pricePts: currentPricePts,
      });
      trackEvent("purchase_success", {
        ...readerAnalyticsPayload,
        purchaseType: "episode_unlock",
        pricePts: currentPricePts,
      });
      setToast(`${currentInstallmentLabel} unlocked`);
      return;
    }
    trackEvent("unlock_fail", {
      ...readerAnalyticsPayload,
      status: response.status,
      errorCode: response.error,
      pricePts: currentPricePts,
    });
    setToast(response.status === 402 ? "Not enough points" : "Unlock failed");
    if (response.status === 402) {
      router.push("/store");
    }
  }, [
    currentInstallmentLabel,
    currentPricePts,
    episodeId,
    isSignedIn,
    openLogin,
    readerAnalyticsPayload,
    router,
    seriesId,
    shortfallPts,
    unlockEpisode,
  ]);

  const handleOpenComments = useCallback(() => {
    scrollToNode(commentsRef.current);
    setOverflowOpen(false);
  }, []);

  const handleJumpToCheckpoint = useCallback(() => {
    scrollToNode(unlocked ? endRef.current : previewEndRef.current);
    setOverflowOpen(false);
  }, [unlocked]);

  useEffect(() => {
    setHasReachedPreviewEnd(false);
    setHasReachedChapterEnd(false);
  }, [episodeId, unlocked]);

  useEffect(() => {
    if (loading || typeof window === "undefined") {
      return undefined;
    }

    const updateCompletionState = () => {
      const viewportBottom = window.scrollY + window.innerHeight;
      const previewCheckpoint =
        previewEndRef.current?.getBoundingClientRect().top + window.scrollY;
      const chapterCheckpoint =
        endRef.current?.getBoundingClientRect().top + window.scrollY;

      if (typeof previewCheckpoint === "number") {
        setHasReachedPreviewEnd(viewportBottom >= previewCheckpoint - 96);
      }

      if (typeof chapterCheckpoint === "number") {
        setHasReachedChapterEnd(viewportBottom >= chapterCheckpoint - 96);
      }
    };

    updateCompletionState();
    window.addEventListener("scroll", updateCompletionState, { passive: true });
    window.addEventListener("resize", updateCompletionState);

    return () => {
      window.removeEventListener("scroll", updateCompletionState);
      window.removeEventListener("resize", updateCompletionState);
    };
  }, [loading, pages.length, paragraphs.length, previewCount, previewParagraphs]);

  useEffect(() => {
    if (modeBlock !== "adult") {
      return;
    }

    const gateKey = `${seriesId}:${episodeId}:adult`;
    if (gateReportedRef.current === gateKey) {
      return;
    }

    gateReportedRef.current = gateKey;
    trackEvent("adult_gate_view", {
      ...readerAnalyticsPayload,
      source: "reader",
    });
    trackEvent("adult_reader_blocked", {
      ...readerAnalyticsPayload,
      source: "reader",
    });
  }, [episodeId, modeBlock, readerAnalyticsPayload, seriesId]);

  useEffect(() => {
    if (loading || modeBlock || !seriesData?.series || !episodeData?.id) {
      return;
    }

    const episodeKey = `${seriesId}:${episodeId}:${contentMode}`;
    if (episodeStartRef.current === episodeKey) {
      return;
    }

    episodeStartRef.current = episodeKey;
    progressMilestonesRef.current = [];
    episodeCompleteRef.current = "";

    trackEvent("view_reader", {
      ...readerAnalyticsPayload,
    });
    trackEvent(seriesIsAdult ? "adult_content_view" : "normal_content_view", {
      ...readerAnalyticsPayload,
      surface: "reader",
    });
    trackEvent("episode_start", {
      ...readerAnalyticsPayload,
      title: currentEpisodeTitle,
    });

    if (seriesIsAdult && contentMode === "adult" && adultReaderEnterRef.current !== episodeKey) {
      adultReaderEnterRef.current = episodeKey;
      trackEvent("adult_reader_enter", {
        ...readerAnalyticsPayload,
        source: "reader",
      });
    }
  }, [
    contentMode,
    currentEpisodeTitle,
    episodeData?.id,
    episodeId,
    loading,
    modeBlock,
    readerAnalyticsPayload,
    seriesData?.series,
    seriesId,
    seriesIsAdult,
  ]);

  useEffect(() => {
    if (loading || modeBlock || !episodeData?.id) {
      return;
    }

    const milestones = progressMilestonesRef.current;
    [25, 50, 75].forEach((milestone) => {
      if (progressPercent < milestone || milestones.includes(milestone)) {
        return;
      }

      milestones.push(milestone);
      trackEvent("episode_progress", {
        ...readerAnalyticsPayload,
        milestone,
        progressPercent,
      });
    });
  }, [
    episodeData?.id,
    loading,
    modeBlock,
    progressPercent,
    readerAnalyticsPayload,
  ]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    trackEvent("reader_settings_open", {
      ...readerAnalyticsPayload,
      layoutMode: layoutModeForView,
      nightMode: nightMode || isAdultMode,
    });
  }, [
    isAdultMode,
    layoutModeForView,
    nightMode,
    readerAnalyticsPayload,
    settingsOpen,
  ]);

  useEffect(() => {
    if (loading || modeBlock || !episodeData?.id || !isEpisodeComplete) {
      return;
    }

    const completeKey = `${seriesId}:${episodeId}`;
    if (episodeCompleteRef.current === completeKey) {
      return;
    }

    episodeCompleteRef.current = completeKey;
    trackEvent("episode_complete", {
      ...readerAnalyticsPayload,
      progressPercent: 100,
    });
  }, [
    episodeData?.id,
    episodeId,
    isEpisodeComplete,
    loading,
    modeBlock,
    readerAnalyticsPayload,
    seriesId,
  ]);

  if (loading) {
    return (
      <main className={cn("min-h-screen px-4 py-20 text-white", palette.rootBg)}>
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
              Loading reader
            </p>
            <h1 className="mt-3 text-3xl font-black text-white">
              {String(fallbackData?.seriesTitle || "Reader").trim() || "Reader"}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              {String(fallbackData?.episodeTitle || "Preparing installment").trim() ||
                "Preparing installment"}
            </p>
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[26px] bg-white/5" />
          ))}
        </div>
      </main>
    );
  }

  if (modeBlock === "adult") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#06080a] px-4 py-20 text-center text-white">
        <Lock className="mb-6 h-16 w-16 text-red-500 opacity-80" />
        <h1 className="mb-4 text-3xl font-black">Age Restricted Content</h1>
        <p className="mb-8 max-w-md text-gray-400">
          This title is marked mature. Enable adult mode before opening the reader.
        </p>
        <button
          type="button"
          onClick={handleEnterAdultReader}
          className={cn(
            "rounded-xl px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]",
            palette.primaryBg,
          )}
        >
          Verify Age Now
        </button>
        <button
          type="button"
          onClick={handleAdultGateExit}
          className="mt-6 font-bold text-gray-500 transition-colors hover:text-white"
        >
          Back to series
        </button>
      </main>
    );
  }

  if (modeBlock === "normal") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#06080a] px-4 py-20 text-center text-white">
        <Lock className="mb-6 h-16 w-16 text-red-500 opacity-80" />
        <h1 className="mb-4 text-3xl font-black">Normal Mode Required</h1>
        <p className="mb-8 max-w-md text-gray-400">
          This title belongs to the normal catalog. Switch back to normal mode to keep reading.
        </p>
        <button
          type="button"
          onClick={handleAdultToggle}
          className={cn(
            "rounded-xl px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]",
            palette.primaryBg,
          )}
        >
          Normal
        </button>
        <button
          type="button"
          onClick={() => router.push(backToSeriesHref)}
          className="mt-6 font-bold text-gray-500 transition-colors hover:text-white"
        >
          Back to series
        </button>
      </main>
    );
  }

  if (error || !seriesData?.series || !episodeData) {
    return (
      <main
        className={cn(
          "flex min-h-screen items-center justify-center px-4 py-20 text-white",
          palette.rootBg,
        )}
      >
        <div
          className={cn(
            "w-full max-w-xl rounded-[32px] border p-8 text-center shadow-2xl",
            palette.surface,
            palette.border,
          )}
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
            Reader unavailable
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            This installment failed to load
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-400">
            Try again or bounce back to the series queue to reopen the reader cleanly.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.refresh()}
              className={cn(
                "rounded-2xl px-6 py-3 font-black text-white transition-transform active:scale-[0.98]",
                palette.primaryBg,
              )}
            >
              Retry reader
            </button>
            <button
              type="button"
              onClick={() => router.push(backToSeriesHref)}
              className="rounded-2xl border border-white/10 px-6 py-3 font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Back to series
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={cn("relative min-h-screen overflow-x-hidden pb-28 text-white", palette.rootBg)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "absolute left-[-12%] top-24 h-72 w-72 rounded-full blur-3xl",
            palette.heroGlow,
          )}
        />
        <div className="absolute right-[-8%] top-[30rem] h-80 w-80 rounded-full bg-cyan-500/8 blur-3xl" />
      </div>

      <div
        className={cn(
          "fixed top-0 z-50 w-full border-b border-white/5 bg-[#0b0f16]/88 backdrop-blur-xl transition-transform duration-300",
          showNav ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="mx-auto flex min-h-[78px] w-full max-w-[1320px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.97]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <Pill className="border-white/10 bg-white/5 text-gray-300">Reader deck</Pill>
                <Pill className={cn("border-white/10", palette.primarySoft)}>
                  {currentInstallmentLabel}
                </Pill>
                {!unlocked ? (
                  <Pill className="border-amber-500/25 bg-amber-500/10 text-amber-200">
                    Preview mode
                  </Pill>
                ) : null}
              </div>
              <h1 className="truncate text-sm font-black text-white md:text-base">
                {seriesData.series.title}
              </h1>
              <p className="truncate text-xs text-gray-400 md:text-sm">{currentEpisodeTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenComments}
              aria-label="Open comments"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.97]"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen((value) => !value);
                setOverflowOpen(false);
              }}
              aria-label="Reader Settings"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.97]",
                settingsOpen && "border-white/20 bg-white/10 text-white",
              )}
            >
              <Settings2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setOverflowOpen((value) => !value);
                setSettingsOpen(false);
              }}
              aria-label="Reader actions"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.97]",
                overflowOpen && "border-white/20 bg-white/10 text-white",
              )}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {overflowOpen ? (
        <div className="fixed right-4 top-[92px] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[28px] border border-white/10 bg-[#0d121a]/95 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:right-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                Reader actions
              </p>
              <h2 className="mt-1 text-base font-black text-white">Quick jumps</h2>
            </div>
            <button
              type="button"
              onClick={() => setOverflowOpen(false)}
              aria-label="Close reader actions"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => router.push(backToSeriesHref)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span>
                <span className="block text-sm font-bold text-white">Back to series</span>
                <span className="mt-1 block text-xs text-gray-400">Open the full queue</span>
              </span>
              <ChevronRight className="h-4 w-4 text-white/70" />
            </button>
            <button
              type="button"
              onClick={handleJumpToCheckpoint}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span>
                <span className="block text-sm font-bold text-white">
                  {unlocked ? "Jump to end console" : "Jump to unlock card"}
                </span>
                <span className="mt-1 block text-xs text-gray-400">
                  Skip to the next decision point
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-white/70" />
            </button>
            <button
              type="button"
              onClick={handleBookmarkToggle}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span>
                <span className="block text-sm font-bold text-white">
                  {currentBookmark ? "Remove bookmark" : "Save bookmark"}
                </span>
                <span className="mt-1 block text-xs text-gray-400">
                  {currentBookmark
                    ? `Saved at ${Math.max(1, Math.round((currentBookmark.percent || 0) * 100))}% in this chapter.`
                    : "Keep this reading position in your library."}
                </span>
              </span>
              {currentBookmark ? (
                <BookmarkCheck className="h-4 w-4 text-white/70" />
              ) : (
                <Bookmark className="h-4 w-4 text-white/70" />
              )}
            </button>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="fixed bottom-[92px] right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-[30px] border border-white/10 bg-[#0d121a]/95 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:right-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                Reader settings
              </p>
              <h2 className="mt-1 text-base font-black text-white">Live controls</h2>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close reader settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
                      onClick={handleToggleNight}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-bold transition-all active:scale-[0.98]",
                nightMode
                  ? "border-white/20 bg-white/12 text-white"
                  : "border-white/10 bg-black/20 text-gray-300 hover:border-white/20 hover:bg-white/[0.06]",
              )}
            >
              {nightMode ? "Night mode on" : "Night mode off"}
            </button>
            <button
              type="button"
                      onClick={handleToggleLayout}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-bold transition-all active:scale-[0.98]",
                isComic
                  ? layoutModeForView === "horizontal"
                    ? "border-white/20 bg-white/12 text-white"
                    : "border-white/10 bg-black/20 text-gray-300 hover:border-white/20 hover:bg-white/[0.06]"
                  : "border-white/10 bg-black/20 text-gray-500",
              )}
            >
              {isComic
                ? layoutModeForView === "horizontal"
                  ? "Horizontal pages"
                  : "Vertical scroll"
                : "Novel mode stays vertical"}
            </button>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">Brightness</p>
                <p className="mt-1 text-xs text-gray-400">Tune the reader without leaving the page.</p>
              </div>
              <span className="text-sm font-black text-white">{brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={brightness}
              onChange={(event) => setBrightness(Number(event.target.value))}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
            />
          </div>
        </div>
      ) : null}

      <section className="relative px-4 pb-6 pt-24 md:px-6 md:pt-28">
        <div className="mx-auto grid w-full max-w-[1320px] gap-4 lg:grid-cols-[minmax(0,1.18fr)_340px]">
          <div
            className={cn(
              "relative overflow-hidden rounded-[34px] border p-6 shadow-[0_28px_90px_rgba(0,0,0,0.32)] md:p-7",
              palette.surface,
              palette.border,
            )}
          >
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Pill className={cn("border-white/10", palette.primarySoft)}>Active reader</Pill>
                <Pill className="border-white/10 bg-white/5 text-gray-300">
                  {`${currentIndex >= 0 ? currentIndex + 1 : 1}/${Math.max(episodes.length, 1)} queue`}
                </Pill>
                <Pill className="border-white/10 bg-black/20 text-gray-300">
                  {unlocked ? "Full access" : formatPriceLabel(currentPricePts)}
                </Pill>
              </div>

              <h2 className="mt-4 text-[clamp(2rem,3.4vw,3.6rem)] font-black leading-[0.96] tracking-[-0.04em] text-white">
                {seriesData.series.title}
              </h2>
              <p className="mt-2 max-w-3xl text-base font-semibold text-gray-200 md:text-lg">
                {currentEpisodeTitle}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                {creatorName} · Released{" "}
                {formatMetaDate(
                  currentEpisode?.releasedAt || episodeData?.releasedAt || seriesData.series.updatedAt,
                )}{" "}
                ·{" "}
                {unlocked
                  ? `Full ${installmentLabel.toLowerCase()} is live.`
                  : `${safeVisibleUnits} free ${isComic ? "page" : "block"}${safeVisibleUnits === 1 ? "" : "s"} before unlock.`}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Installment" value={currentInstallmentLabel} hint="Current reader label" />
                <Metric
                  label="Reading mode"
                  value={isComic ? (layoutModeForView === "horizontal" ? "Horizontal pages" : "Vertical scroll") : "Story text"}
                  hint={nightMode ? "Night mode enabled" : "Core palette enabled"}
                />
                <Metric
                  label="Access state"
                  value={unlocked ? "Full chapter open" : `${formatPriceLabel(currentPricePts)} to unlock`}
                  hint={unlocked ? "No preview cap is active" : "Preview gate is still active"}
                />
                <Metric
                  label="Wallet"
                  value={`${walletBalance} pts`}
                  hint={isSignedIn ? `${paidPts} paid · ${bonusPts} bonus` : "Sign in to sync points"}
                />
              </div>
            </div>
          </div>

          <aside
            className={cn(
              "overflow-hidden rounded-[34px] border p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] md:p-6",
              palette.surface,
              palette.border,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                  Reading queue
                </p>
                <h2 className="mt-2 text-xl font-black text-white">What&apos;s around this read</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Keep the previous and next move visible without breaking the flow.
                </p>
              </div>
              <div className={cn("rounded-2xl border px-3 py-2 text-xs font-black", palette.primarySoft)}>
                {queuePercent}%
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className={cn("h-full transition-[width] duration-300", palette.primaryBg)} style={{ width: `${queuePercent}%` }} />
            </div>

            <div className="mt-5 grid gap-3">
              <QueueCard
                eyebrow="Previous"
                title={previousQueueLabel}
                description={previousQueueDescription}
                ctaLabel={prevEpisode ? "Open previous" : "Back to series"}
                onClick={
                  prevEpisode
                    ? () => handleNavigateEpisode(prevEpisode, "previous", "queue-card")
                    : () => router.push(backToSeriesHref)
                }
              />
              <QueueCard
                eyebrow="Current"
                title={currentInstallmentLabel}
                description={currentQueueDescription}
                ctaLabel={unlocked ? "Continue reading" : "Jump to checkpoint"}
                buttonClassName={cn("text-white", palette.primaryBg)}
                onClick={unlocked ? () => scrollToNode(endRef.current) : handleJumpToCheckpoint}
              />
              <QueueCard
                eyebrow="Next"
                title={nextQueueLabel}
                description={nextQueueDescription}
                ctaLabel={nextEpisode ? "Open next" : "Back to series"}
                buttonClassName={cn(
                  nextEpisode ? `text-white ${palette.primaryBg}` : "border border-white/10 bg-white/5 text-white hover:bg-white/10",
                )}
                onClick={
                  nextEpisode
                    ? () => handleNavigateEpisode(nextEpisode, "next", "queue-card")
                    : () => router.push(backToSeriesHref)
                }
              />
            </div>
          </aside>
        </div>
      </section>

      <section className="relative">
        <div className="mx-auto w-full max-w-[1200px]">
          <div
            className="relative"
            style={{ filter: `brightness(${brightness}%)` }}
            onClick={() => setShowNav((value) => !value)}
          >
            <PageStream
              pages={pages}
              paragraphs={paragraphs}
              previewCount={previewCount}
              previewParagraphs={previewParagraphs}
              layoutMode={layoutModeForView}
              isNightMode={nightMode || isAdultMode}
              imageQuality={75}
              imageSizes="(max-width: 768px) 100vw, 768px"
              seriesType={seriesType}
              onActiveIndexChange={setActiveIndex}
              onPreviewEndRef={(node) => {
                previewEndRef.current = node;
              }}
              onEndRef={(node) => {
                endRef.current = node;
              }}
            />
          </div>
        </div>
      </section>

      {!unlocked ? (
        <section className="px-4 py-2 md:px-6">
          <div className="mx-auto max-w-5xl">
            <div
              className={cn(
                "relative overflow-hidden rounded-[34px] border p-6 shadow-[0_28px_90px_rgba(0,0,0,0.32)] md:p-7",
                palette.surface,
                palette.border,
              )}
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_320px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill className="border-amber-500/25 bg-amber-500/10 text-amber-200">
                      Preview ends here
                    </Pill>
                    <Pill className="border-white/10 bg-white/5 text-gray-300">
                      {formatPriceLabel(currentPricePts)}
                    </Pill>
                  </div>
                  <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                    Unlock the rest of this {installmentLabel.toLowerCase()}.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                    The preview stops at the hand-off point. Open the rest now, keep your place
                    synced, and roll straight into the next beat without leaving the reader.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Metric
                      label="Unlock price"
                      value={formatPriceLabel(currentPricePts)}
                      hint={`${safeVisibleUnits} preview unit${safeVisibleUnits === 1 ? "" : "s"} already open`}
                    />
                    <Metric
                      label="Wallet total"
                      value={`${walletBalance} pts`}
                      hint={isSignedIn ? `${paidPts} paid · ${bonusPts} bonus` : "Sign in to check balance"}
                    />
                    <Metric
                      label="Shortfall"
                      value={shortfallPts > 0 ? `${shortfallPts} pts` : "Ready now"}
                      hint={shortfallPts > 0 ? "Top up to continue instantly" : "Enough points to open now"}
                    />
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {!isSignedIn ? (
                      <button
                        type="button"
                        onClick={() =>
                          openLogin("login", `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`)
                        }
                        className={cn(
                          "inline-flex min-h-[52px] items-center justify-center rounded-2xl px-6 py-3 text-sm font-black text-white transition-transform active:scale-[0.98]",
                          palette.primaryBg,
                        )}
                      >
                        Sign in to unlock
                      </button>
                    ) : shortfallPts > 0 ? (
                      <button
                        type="button"
                        onClick={() => router.push("/store")}
                        className={cn(
                          "inline-flex min-h-[52px] items-center justify-center rounded-2xl px-6 py-3 text-sm font-black text-white transition-transform active:scale-[0.98]",
                          palette.primaryBg,
                        )}
                      >
                        Get more points
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUnlockCurrent}
                        disabled={unlockBusy}
                        className={cn(
                          "inline-flex min-h-[52px] items-center justify-center rounded-2xl px-6 py-3 text-sm font-black text-white transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-70",
                          palette.primaryBg,
                        )}
                      >
                        {unlockBusy ? "Unlocking..." : `Unlock with ${currentPricePts} pts`}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => router.push(backToSeriesHref)}
                      className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/5"
                    >
                      Back to series
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                    Unlock adds
                  </p>
                  <div className="mt-4 space-y-3">
                    <Metric label="Continue instantly" value="No route break" hint="Stay in the same reading flow after access flips live." />
                    <Metric label="Queue context" value={`${Math.max(episodes.length - (currentIndex + 1), 0)} more ahead`} hint={`You are reading ${currentInstallmentLabel.toLowerCase()} of ${Math.max(episodes.length, 1)}.`} />
                    <Metric label="Reading state" value="Synced progress" hint="Signed-in readers keep placement and unlock state together." />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-4 pb-4 pt-8 md:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,1.35fr)_1fr]">
            <div className={cn("flex h-full flex-col rounded-[30px] border p-5 shadow-[0_22px_70px_rgba(0,0,0,0.28)]", palette.surface, palette.border)}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Previous move</p>
              <h3 className="mt-3 text-lg font-black text-white">
                {prevEpisode ? formatInstallmentLabel(seriesType, prevEpisode?.number || 1) : "Return to the series"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                {prevEpisode
                  ? resolveEpisodeDisplayTitle(
                      prevEpisode?.title,
                      formatInstallmentLabel(seriesType, prevEpisode?.number || 1),
                      seriesType,
                    )
                  : "No prior installment here, so the series page becomes the safe landing point."}
              </p>
              <button
                type="button"
                onClick={
                  prevEpisode
                    ? () => handleNavigateEpisode(prevEpisode, "previous", "endcap-card")
                    : () => router.push(backToSeriesHref)
                }
                className="mt-auto inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                {prevEpisode ? "Open previous" : "Back to series"}
              </button>
            </div>

            <div className={cn("flex h-full flex-col rounded-[32px] border p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.32)]", palette.surface, palette.border)}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Reader console</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-white">
                {unlocked ? "Installment complete." : "Preview checkpoint."}
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                {unlocked
                  ? `You reached the end of this ${installmentLabel.toLowerCase()}. Keep the pace going, react to the ending beat, or jump into discussion.`
                  : `The free sample ends here. You can still react, share, and line up the next step before you unlock the rest.`}
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setLiked((value) => !value)}
                  className={cn(
                    "flex min-h-[108px] w-full max-w-[168px] flex-col items-center justify-center gap-2 rounded-[26px] border px-4 py-4 transition-all active:scale-[0.98]",
                    liked
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-white/10 bg-white/5 text-gray-300 hover:border-red-500/25 hover:bg-red-500/10 hover:text-white",
                  )}
                >
                  <Heart className={cn("h-7 w-7", liked ? "fill-current" : "")} />
                  <span className="text-xs font-black uppercase tracking-[0.18em]">Like</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex min-h-[108px] w-full max-w-[168px] flex-col items-center justify-center gap-2 rounded-[26px] border border-white/10 bg-white/5 px-4 py-4 text-gray-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.98]"
                >
                  <Share2 className="h-7 w-7" />
                  <span className="text-xs font-black uppercase tracking-[0.18em]">Share</span>
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleOpenComments}
                  className={cn(
                    "inline-flex min-h-[52px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-black text-white transition-transform active:scale-[0.98]",
                    palette.primaryBg,
                  )}
                >
                  Open comments
                </button>
                <button
                  type="button"
                  onClick={() => router.push(backToSeriesHref)}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Series queue
                </button>
              </div>
            </div>

            <div className={cn("flex h-full flex-col rounded-[30px] border p-5 shadow-[0_22px_70px_rgba(0,0,0,0.28)]", palette.surface, palette.border)}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Next move</p>
              <h3 className="mt-3 text-lg font-black text-white">
                {nextEpisode ? formatInstallmentLabel(seriesType, nextEpisode?.number || currentNumber + 1) : "Series overview"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                {nextEpisode
                  ? `${resolveEpisodeDisplayTitle(
                      nextEpisode?.title,
                      formatInstallmentLabel(seriesType, nextEpisode?.number || currentNumber + 1),
                      seriesType,
                    )} is queued next. ${
                      Number(nextEpisode?.pricePts || 0) > 0 ? `${formatPriceLabel(nextEpisode?.pricePts)} if still locked.` : "It starts free."
                    }`
                  : "No next installment is listed yet, so the best next stop is the series overview."}
              </p>
              <button
                type="button"
                onClick={
                  nextEpisode
                    ? () => handleNavigateEpisode(nextEpisode, "next", "endcap-card")
                    : () => router.push(backToSeriesHref)
                }
                className={cn(
                  "mt-auto inline-flex min-h-[50px] items-center justify-center rounded-2xl px-4 py-3 text-sm font-black text-white transition-transform active:scale-[0.98]",
                  nextEpisode ? palette.primaryBg : "border border-white/10 bg-white/5",
                )}
              >
                {nextEpisode ? "Open next" : "Back to series"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section ref={commentsRef} className="px-4 pb-20 pt-6 md:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <FigmaCommentsSection seriesTitle={seriesData.series.title} />
        </div>
      </section>

      <div
        aria-label="Chapter navigation"
        data-visible={showNav ? "true" : "false"}
        className={cn(
          "fixed bottom-0 left-0 z-50 w-full border-t border-white/5 bg-[#0b0f16]/88 backdrop-blur-xl transition-transform duration-300",
          showNav ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-white/10">
          <div
            className={cn("h-full transition-[width] duration-300", palette.primaryBg)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mx-auto flex min-h-[82px] w-full max-w-[1320px] items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 sm:block">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                Reader progress
              </p>
              <p className="truncate text-sm font-bold text-white">
                {progressPercent === 100
                  ? `Finished this ${installmentLabel.toLowerCase()}`
                  : `${progressPercent}% through this ${installmentLabel.toLowerCase()}`}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <span className="inline-flex min-h-[40px] items-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.16em] text-gray-300">
              {`${currentIndex >= 0 ? currentIndex + 1 : 1}/${Math.max(episodes.length, 1)} queue`}
            </span>
            <button
              type="button"
              onClick={() => router.push(backToSeriesHref)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 text-sm font-bold text-white transition-colors hover:bg-white/15"
            >
              <List className="h-4 w-4" />
              {installmentPlural}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/store")}
              aria-label="View your wallet"
              className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white sm:flex"
            >
              <Wallet className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen((value) => !value);
                setOverflowOpen(false);
              }}
              aria-label="Reader Settings"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white",
                settingsOpen && "border-white/20 bg-white/10 text-white",
              )}
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-24 right-4 z-[60] rounded-full border border-white/10 bg-[#0d121a]/95 px-4 py-2 text-xs font-bold text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:right-6">
          {toast}
        </div>
      ) : null}
    </main>
  );
}

export default function FigmaReaderPage({ seriesId, episodeId, fallbackData = null }) {
  return (
    <FigmaSiteProvider>
      <ReaderContent
        seriesId={seriesId}
        episodeId={episodeId}
        fallbackData={fallbackData}
      />
    </FigmaSiteProvider>
  );
}
