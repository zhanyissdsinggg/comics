"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import ReaderShell from "../reader/ReaderShell";
import ReaderTopBar from "../reader/ReaderTopBar";
import ReaderBottomBar from "../reader/ReaderBottomBar";
import ReaderSettingsSheet from "../reader/ReaderSettingsSheet";
import ComicReaderContent from "../reader/ComicReaderContent";
import NovelReaderContent from "../reader/NovelReaderContent";
import ReaderEndPanel from "../reader/ReaderEndPanel";
import ReaderSkeleton from "../reader/ReaderSkeleton";
import ReaderErrorState from "../reader/ReaderErrorState";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import { storefrontSoftCardClass } from "../common/StorefrontPagePrimitives";
import {
  canAccessInContentMode,
  getContentModeQueryParam,
  matchesContentMode,
} from "../../lib/contentFilters";
import { buildDiscoveryContext } from "../../lib/discoveryContext";
import {
  buildPathWithAttribution,
  loadPersistedPaymentAttribution,
  mergePaymentAttribution,
  persistPaymentAttribution,
  readPaymentAttributionFromSearchParams,
} from "../../lib/paymentAttribution";
import {
  resolveReaderNarrativeParagraphs,
  resolveReaderOpeningParagraphs,
} from "../../lib/readerNarrativeCopy";
import { siteConfig } from "../../lib/siteConfig";
import { cn, isAdultContent } from "./figma-utils";

function createIdempotencyKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `reader_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatMetaDate(value, seriesType = "comic") {
  void value;
  const installmentName = getInstallmentLabel(seriesType || "comic")
    .toLowerCase();
  return `Full ${installmentName} ready`;
}

function getReaderInstallmentNoun({
  seriesType = "comic",
  isNovel = false,
  rawEpisodeTitle = "",
  fallbackEpisodeTitle = "",
} = {}) {
  const terminologySignal = [
    seriesType,
    rawEpisodeTitle,
    fallbackEpisodeTitle,
  ]
    .join(" ")
    .toLowerCase();

  if (
    /\bchapter\b/.test(terminologySignal) ||
    /\bch\./.test(terminologySignal)
  ) {
    return "chapter";
  }

  if (
    /\bepisode\b/.test(terminologySignal) ||
    /\bep\./.test(terminologySignal) ||
    terminologySignal.includes("novel") ||
    terminologySignal.includes("fiction") ||
    terminologySignal.includes("text episode") ||
    terminologySignal.includes("text-episode")
  ) {
    return "episode";
  }

  if (isNovel) {
    return "episode";
  }

  return "chapter";
}

function formatPriceLabel(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? `${numeric} pts` : "Free";
}

function resolveEpisodeDisplayTitle(title, fallbackLabel, seriesType) {
  const normalizedTitle = String(title || "").trim();
  if (
    !normalizedTitle ||
    isDefaultInstallmentTitle(normalizedTitle, seriesType)
  ) {
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
    "badge",
    "badges",
    "tags",
    "genres",
    "mode",
  ].some((field) => Object.prototype.hasOwnProperty.call(item, field));

  return hasModeSignal ? item : { ...item, adult: fallbackAdult };
}

function detectComicReaderContent(episode, seriesType, pages, paragraphs) {
  const normalizedType = String(episode?.type || seriesType || "")
    .trim()
    .toLowerCase();
  const hasImagePages = Array.isArray(pages) && pages.length > 0;
  const hasParagraphs = Array.isArray(paragraphs) && paragraphs.length > 0;
  const comicSignals = new Set([
    "comic",
    "manga",
    "webcomic",
    "image",
    "image_episode",
    "image-episode",
  ]);

  if (comicSignals.has(normalizedType)) {
    return true;
  }

  if (
    normalizedType.includes("comic") ||
    normalizedType.includes("manga") ||
    normalizedType.includes("webcomic")
  ) {
    return true;
  }

  if (hasImagePages && !hasParagraphs) {
    return true;
  }

  return false;
}

function extractNarrativeParagraphs(episode, paragraphs) {
  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
    return paragraphs.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const contentBlocks = Array.isArray(episode?.contentBlocks)
    ? episode.contentBlocks
    : Array.isArray(episode?.blocks)
      ? episode.blocks
      : [];

  return contentBlocks
    .map((block) => {
      if (!block) {
        return "";
      }

      if (typeof block === "string") {
        return block.trim();
      }

      return String(
        block?.text ||
          block?.content ||
          block?.body ||
          block?.value ||
          block?.paragraph ||
          "",
      ).trim();
    })
    .filter(Boolean);
}

function detectNovelReaderContent(episode, seriesType, paragraphs) {
  const normalizedType = String(episode?.type || seriesType || "")
    .trim()
    .toLowerCase();
  const hasParagraphs = Array.isArray(paragraphs) && paragraphs.length > 0;
  const novelSignals = new Set([
    "novel",
    "fiction",
    "text",
    "text_episode",
    "text-episode",
  ]);

  if (novelSignals.has(normalizedType)) {
    return true;
  }

  if (
    normalizedType.includes("comic") ||
    normalizedType.includes("manga") ||
    normalizedType.includes("webcomic")
  ) {
    return false;
  }

  if (
    normalizedType.includes("novel") ||
    normalizedType.includes("fiction") ||
    normalizedType.includes("text episode") ||
    normalizedType.includes("text-episode")
  ) {
    return true;
  }

  return hasParagraphs;
}

function resolveModeBlockFromError(response) {
  if (!response || response.ok) {
    return "";
  }

  if (response.reason === "NORMAL_MODE_REQUIRED") {
    return "normal";
  }

  if (
    response.error === "ADULT_GATED" ||
    response.reason === "NEED_AGE_CONFIRM"
  ) {
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
    <div className={`${storefrontSoftCardClass} p-4`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-base font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function ReaderMetaPill({ children, className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function ReaderStatCard({ label, value, hint, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl",
        className,
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/48">
        {label}
      </p>
      <p className="mt-3 text-base font-black tracking-[-0.03em] text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs leading-5 text-white/60">{hint}</p>
      ) : null}
    </div>
  );
}

function ReaderContent({
  seriesId,
  episodeId,
  fallbackData = null,
  initialReaderPayload = null,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewEndRef = useRef(null);
  const endRef = useRef(null);
  const commentsRef = useRef(null);
  const historyLoggedRef = useRef(false);
  const gateReportedRef = useRef("");
  const episodeStartRef = useRef("");
  const episodeCompleteRef = useRef("");
  const adultReaderEnterRef = useRef("");
  const progressMilestonesRef = useRef([]);
  const {
    palette,
    contentMode,
    handleAdultToggle,
    confirmAdultMode,
    openLogin,
  } = useFigmaSite();
  const { bookmarksBySeries, addBookmark, removeBookmark } = useBookmarkStore();
  const { loadEntitlement, unlockEpisode, bySeriesId } = useEntitlementStore();
  const { isSignedIn } = useAuthStore();
  const { isAdultMode } = useAdultGateStore();
  const { addHistory } = useHistoryStore();
  const { loadWallet, paidPts, bonusPts } = useWalletStore();
  const {
    nightMode,
    toggleNightMode,
    layoutMode,
    setLayoutMode,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    brightness,
    setBrightness,
  } = useReaderSettingsStore();
  const initialSeriesData = useMemo(() => {
    if (!initialReaderPayload?.series?.series) {
      return null;
    }
    return {
      series: initialReaderPayload.series.series,
      episodes: Array.isArray(initialReaderPayload.series.episodes)
        ? initialReaderPayload.series.episodes
        : [],
    };
  }, [initialReaderPayload]);
  const initialEpisodeData = useMemo(() => {
    if (!initialReaderPayload?.episode) {
      return null;
    }

    const fallbackAdult = isAdultContent(initialSeriesData?.series);
    return withFallbackAdultFlag(initialReaderPayload.episode, fallbackAdult);
  }, [initialReaderPayload, initialSeriesData?.series]);
  const initialModeBlock = useMemo(() => {
    if (initialReaderPayload?.state === "adult-gated") {
      return "adult";
    }
    if (initialReaderPayload?.state === "mode-mismatch") {
      const sourceIsAdult = isAdultContent(initialSeriesData?.series);
      return sourceIsAdult ? "adult" : "normal";
    }
    return "";
  }, [initialReaderPayload?.state, initialSeriesData?.series]);
  const [seriesData, setSeriesData] = useState(initialSeriesData);
  const [episodeData, setEpisodeData] = useState(initialEpisodeData);
  const [loading, setLoading] = useState(
    () => !initialEpisodeData && !initialModeBlock,
  );
  const [error, setError] = useState("");
  const [modeBlock, setModeBlock] = useState(initialModeBlock);
  const [showNav, setShowNav] = useState(true);
  const [liked, setLiked] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [hasReachedPreviewEnd, setHasReachedPreviewEnd] = useState(false);
  const [hasReachedChapterEnd, setHasReachedChapterEnd] = useState(false);
  const [activeAttribution, setActiveAttribution] = useState(null);
  const entitlement = bySeriesId[seriesId] || { unlockedEpisodeIds: [] };
  const routeAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(searchParams),
    [searchParams],
  );
  const checkoutEnabled = siteConfig.monetization.checkoutEnabled === true;

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

      const hasSeededReaderPayload =
        String(initialSeriesData?.series?.id || "") ===
          String(seriesId || "") &&
        String(initialEpisodeData?.id || "") === String(episodeId || "") &&
        canAccessInContentMode(initialSeriesData?.series, contentMode) &&
        canAccessInContentMode(initialEpisodeData, contentMode);

      if (hasSeededReaderPayload) {
        historyLoggedRef.current = false;
        setSeriesData(initialSeriesData);
        setEpisodeData(initialEpisodeData);
        setLoading(false);
        return;
      }

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

      if (nextIsAdultSeries && (!isAdultMode || contentMode !== "adult")) {
        setEpisodeData(null);
        setModeBlock("adult");
        setLoading(false);
        return;
      }

      if (!canAccessInContentMode(nextSeriesData?.series, contentMode)) {
        setEpisodeData(null);
        setModeBlock(nextIsAdultSeries ? "adult" : "normal");
        setLoading(false);
        return;
      }

      const episodeResponse = await apiGet(
        `/api/episode?seriesId=${encodeURIComponent(seriesId)}&episodeId=${encodeURIComponent(episodeId)}&adult=${adultFlag}&mode=${encodeURIComponent(contentMode)}`,
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

      if (!canAccessInContentMode(nextEpisode, contentMode)) {
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
  }, [
    contentMode,
    episodeId,
    initialEpisodeData,
    initialSeriesData,
    isAdultMode,
    seriesId,
  ]);

  useEffect(() => {
    if (
      !isSignedIn ||
      !seriesId ||
      modeBlock ||
      !seriesData?.series ||
      !canAccessInContentMode(seriesData.series, contentMode)
    ) {
      return;
    }

    void loadEntitlement(seriesId);
  }, [
    contentMode,
    isSignedIn,
    loadEntitlement,
    modeBlock,
    seriesData?.series,
    seriesId,
  ]);

  useEffect(() => {
    if (
      !isSignedIn ||
      !episodeData?.id ||
      modeBlock ||
      Number(episodeData?.pricePts || 0) <= 0
    ) {
      return undefined;
    }

    return scheduleIdleTask(() => {
      void loadWallet();
    });
  }, [
    episodeData?.id,
    episodeData?.pricePts,
    isSignedIn,
    loadWallet,
    modeBlock,
  ]);

  useEffect(() => {
    if (
      !isSignedIn ||
      historyLoggedRef.current ||
      !seriesData?.series ||
      !episodeData?.id
    ) {
      return;
    }

    historyLoggedRef.current = true;
    void addHistory({
      seriesId,
      episodeId,
      title: seriesData.series.title,
      percent: 0.08,
    });
  }, [
    addHistory,
    episodeData?.id,
    episodeId,
    isSignedIn,
    seriesData?.series,
    seriesId,
  ]);

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
      matchesContentMode(
        withFallbackAdultFlag(item, seriesIsAdult),
        contentMode,
      ),
    );
  }, [contentMode, seriesData, seriesIsAdult]);
  const currentEpisode = useMemo(
    () =>
      episodes.find(
        (item) => String(item?.id || "") === String(episodeId || ""),
      ) || null,
    [episodeId, episodes],
  );
  const currentIndex = useMemo(
    () =>
      episodes.findIndex(
        (item) => String(item?.id || "") === String(episodeId || ""),
      ),
    [episodeId, episodes],
  );
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;
  const seriesType = seriesData?.series?.type || episodeData?.type || "comic";
  const currentNumber = currentEpisode?.number || episodeData?.number || 1;
  const currentInstallmentLabel = formatInstallmentLabel(
    seriesType,
    currentNumber,
  );
  const rawEpisodeTitle = String(
    currentEpisode?.title ||
      episodeData?.title ||
      fallbackData?.episodeTitle ||
      "",
  ).trim();
  const currentEpisodeTitle =
    rawEpisodeTitle && !isDefaultInstallmentTitle(rawEpisodeTitle, seriesType)
      ? rawEpisodeTitle
      : currentInstallmentLabel;
  const currentPricePts = Number(
    currentEpisode?.access?.pricePts ??
      currentEpisode?.pricePts ??
      episodeData?.pricePts ??
      0,
  );
  const unlocked =
    currentPricePts <= 0 ||
    entitlement.unlockedEpisodeIds.includes(String(episodeId));
  const seriesBookmarks = useMemo(
    () =>
      Array.isArray(bookmarksBySeries?.[seriesId])
        ? bookmarksBySeries[seriesId]
        : [],
    [bookmarksBySeries, seriesId],
  );
  const currentBookmark = useMemo(
    () =>
      seriesBookmarks.find(
        (item) => String(item?.episodeId || "") === String(episodeId || ""),
      ) || null,
    [episodeId, seriesBookmarks],
  );
  const pages = Array.isArray(episodeData?.pages) ? episodeData.pages : [];
  const rawParagraphs = extractNarrativeParagraphs(
    episodeData,
    episodeData?.paragraphs,
  );
  const paragraphs = resolveReaderNarrativeParagraphs({
    seriesId,
    episodeNumber: currentNumber,
    paragraphs: rawParagraphs,
  });
  const openingParagraphs = resolveReaderOpeningParagraphs({
    seriesId,
    episodeNumber: currentNumber,
  });
  const isNovel = detectNovelReaderContent(episodeData, seriesType, paragraphs);
  const isComic =
    detectComicReaderContent(episodeData, seriesType, pages, paragraphs) &&
    !isNovel;
  const previewCount =
    !unlocked && isComic ? (episodeData?.previewFreePages ?? 3) : null;
  const previewParagraphs =
    !unlocked && !isComic ? (episodeData?.previewParagraphs ?? 3) : null;
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
        Math.min(
          1,
          (Math.min(activeIndex, safeVisibleUnits - 1) + 1) / safeVisibleUnits,
        ),
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
              ((Math.min(activeIndex, safeVisibleUnits - 1) + 1) /
                safeVisibleUnits) *
                100,
            ),
          ),
        )
    : 0;
  const installmentNoun = getReaderInstallmentNoun({
    seriesType,
    isNovel,
    rawEpisodeTitle,
    fallbackEpisodeTitle: fallbackData?.episodeTitle,
  });
  const installmentTitle =
    installmentNoun.charAt(0).toUpperCase() + installmentNoun.slice(1);
  const isEpisodeComplete = Boolean(unlocked && hasReachedChapterEnd);
  const creatorName =
    resolveSeriesCreatorName(seriesData?.series) ||
    String(seriesData?.series?.author || "").trim() ||
    "Editorial Crew";
  const walletBalance = Number(paidPts || 0) + Number(bonusPts || 0);
  const shortfallPts = Math.max(0, currentPricePts - walletBalance);
  const backToSeriesHref =
    fallbackData?.backToSeriesHref || `/series/${encodeURIComponent(seriesId)}`;
  const readerPath = `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`;
  const layoutModeForView = isComic ? layoutMode : "vertical";
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : backToSeriesHref;
  const fallbackSeriesTitle =
    String(fallbackData?.seriesTitle || "Reader").trim() || "Reader";
  const fallbackEpisodeTitle =
    String(fallbackData?.episodeTitle || "Preparing chapter").trim() ||
    "Preparing chapter";
  const novelTheme = nightMode ? "dark" : theme || "light";
  const novelShellClass =
    "overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(255,79,154,0.12),transparent_26%),radial-gradient(circle_at_82%_16%,rgba(103,232,249,0.1),transparent_24%),linear-gradient(180deg,#05060a_0%,#0a0d16_46%,#05060a_100%)] text-white";
  const novelMutedClass = "text-white/58";
  const novelBorderClass = "border-white/10";
  const novelTopBarClass =
    "border-white/10 bg-[rgba(7,9,15,0.88)] text-white shadow-[0_-18px_50px_rgba(0,0,0,0.3)]";
  const novelHeroClass =
    "rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(17,20,30,0.96)_0%,rgba(8,10,16,0.98)_50%,rgba(20,12,26,0.94)_100%)] px-5 py-6 shadow-[0_28px_80px_rgba(0,0,0,0.34)] md:px-7 md:py-7";
  const novelReaderFrameClass =
    "rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,17,26,0.98)_0%,rgba(8,10,16,0.98)_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.28)]";
  const readerMutedClass = isComic ? "text-white/58" : novelMutedClass;
  const readerPanelClass = isComic
    ? "border-white/10 bg-[rgba(255,255,255,0.035)]"
    : novelReaderFrameClass;
  const fallbackSeriesType =
    String(
      initialReaderPayload?.series?.series?.type ||
        initialReaderPayload?.episode?.type ||
        "",
    )
      .trim()
      .toLowerCase() || "comic";
  const loadingIsNovel =
    fallbackSeriesType.includes("novel") ||
    fallbackSeriesType.includes("fiction") ||
    fallbackSeriesType.includes("text");
  const loadingIsComic = !loadingIsNovel;
  const loadingRootClass = loadingIsComic ? palette.rootBg : novelShellClass;
  const loadingMutedClass = loadingIsComic ? "text-white/55" : novelMutedClass;
  const loadingBorderClass = loadingIsComic
    ? "border-white/10 bg-[rgba(255,255,255,0.035)]"
    : `${novelBorderClass} bg-[rgba(255,255,255,0.035)]`;
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
  const discoveryContext = useMemo(
    () =>
      buildDiscoveryContext(seriesData?.series, activeAttribution, {
        allowReaderEntry: true,
      }),
    [activeAttribution, seriesData?.series],
  );
  const readerStatCards = useMemo(
    () => [
      {
        label: "Progress",
        value: `${progressPercent}%`,
        hint: unlocked
          ? `Live reading progress in this ${installmentNoun}.`
          : "Preview progress before unlock.",
      },
      {
        label: "Access",
        value: unlocked ? "Unlocked" : formatPriceLabel(currentPricePts),
        hint: unlocked
          ? `Full ${installmentNoun} is open right now.`
          : `${safeVisibleUnits} free ${isComic ? "page" : "section"}${safeVisibleUnits === 1 ? "" : "s"} before the gate.`,
      },
      {
        label: "Creator",
        value: creatorName,
        hint: seriesData?.series?.title || "Story credit",
      },
      {
        label: "Up Next",
        value: nextEpisode
          ? formatInstallmentLabel(seriesType, nextEpisode?.number || currentNumber + 1)
          : "Series page",
        hint: nextEpisode
          ? "Keep momentum without leaving the reader."
          : "You are at the end of the available run.",
      },
    ],
    [
      creatorName,
      currentNumber,
      currentPricePts,
      isComic,
      installmentNoun,
      nextEpisode,
      progressPercent,
      safeVisibleUnits,
      seriesData?.series?.title,
      seriesType,
      unlocked,
    ],
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    document.body.classList.add("reader-page");
    return () => {
      document.body.classList.remove("reader-page");
    };
  }, []);

  useEffect(() => {
    if (!routeAttribution) {
      setActiveAttribution(null);
      return;
    }

    const persistedAttribution = loadPersistedPaymentAttribution();
    const nextAttribution = mergePaymentAttribution(
      persistedAttribution,
      routeAttribution,
    );
    setActiveAttribution(nextAttribution);
    if (nextAttribution) {
      persistPaymentAttribution(nextAttribution);
    }
  }, [routeAttribution]);

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
  }, [
    confirmAdultMode,
    isSignedIn,
    openLogin,
    readerAnalyticsPayload,
    readerPath,
  ]);

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
      if (!canAccessInContentMode(safeTarget, contentMode)) {
        setToast(
          contentMode === "adult"
            ? "Switch to normal mode to open this chapter."
            : "Turn on adult mode to open this chapter.",
        );
        return;
      }

      trackEvent(
        direction === "previous"
          ? "previous_chapter_click"
          : "next_chapter_click",
        {
          ...readerAnalyticsPayload,
          source,
          targetEpisodeId: targetEpisode.id,
        },
      );
      const nextReaderHref = activeAttribution
        ? buildPathWithAttribution(
            `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(targetEpisode.id)}`,
            activeAttribution,
          )
        : `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(targetEpisode.id)}`;

      router.push(nextReaderHref);
    },
    [
      activeAttribution,
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
      return;
    }

    const percent = isEpisodeComplete ? 1 : readingPercent;
    const bookmark = addBookmark(seriesId, {
      episodeId,
      percent,
      pageIndex: activeIndex,
      label: `${currentInstallmentLabel} - ${Math.round(percent * 100)}%`,
    });

    if (!bookmark?.id) {
      return;
    }

    trackEvent("bookmark_add", {
      ...readerAnalyticsPayload,
      bookmarkId: bookmark.id,
      percent: Math.round(percent * 100),
      pageIndex: activeIndex,
    });
    setToast("Bookmark saved");
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
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: seriesData?.series?.title,
          text: currentEpisodeTitle,
          url: shareUrl,
        });
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setToast("Link copied");
    } catch {
      setToast("Share cancelled");
    }
  }, [currentEpisodeTitle, seriesData?.series?.title, shareUrl]);

  const handleUnlockCurrent = useCallback(async () => {
    if (!isSignedIn) {
      openLogin(
        "login",
        `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`,
      );
      return;
    }

    if (shortfallPts > 0) {
      if (!checkoutEnabled) {
        router.push("/store");
        return;
      }
      router.push("/store");
      return;
    }

    trackEvent("paywall_unlock_click", {
      ...readerAnalyticsPayload,
      pricePts: currentPricePts,
    });
    setUnlockBusy(true);
    const response = await unlockEpisode(
      seriesId,
      episodeId,
      createIdempotencyKey(),
    );
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
    setToast(
      response.status === 402 ? "Need more points" : "Couldn't unlock chapter",
    );
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
    checkoutEnabled,
    unlockEpisode,
  ]);

  const handleOpenComments = useCallback(() => {
    scrollToNode(commentsRef.current);
  }, []);

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
  }, [
    loading,
    pages.length,
    paragraphs.length,
    previewCount,
    previewParagraphs,
  ]);

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

    if (
      seriesIsAdult &&
      contentMode === "adult" &&
      adultReaderEnterRef.current !== episodeKey
    ) {
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
      <ReaderSkeleton
        isComic={loadingIsComic}
        rootClassName={loadingRootClass}
        mutedClassName={loadingMutedClass}
        borderClassName={loadingBorderClass}
        heroClassName={novelHeroClass}
        fallbackSeriesTitle={fallbackSeriesTitle}
        fallbackEpisodeTitle={fallbackEpisodeTitle}
        backToSeriesHref={backToSeriesHref}
        onBack={() => router.push(backToSeriesHref)}
      />
    );
  }

  if (modeBlock === "adult") {
    return (
      <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,79,154,0.16),transparent_24%),radial-gradient(circle_at_78%_12%,rgba(103,232,249,0.08),transparent_22%),linear-gradient(180deg,#06080d_0%,#0a0d16_44%,#06080d_100%)] px-4 py-14 text-white">
        <div className="mx-auto max-w-[920px]">
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(20,16,28,0.98)_0%,rgba(10,11,18,0.96)_48%,rgba(16,10,20,0.98)_100%)] shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
              <div>
                <ReaderMetaPill className="border-[rgba(255,151,189,0.28)] bg-[rgba(255,79,154,0.14)] text-[#ffd6e5]">
                  Mature reader gate
                </ReaderMetaPill>
                <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-[3.35rem]">
                  Mature Chapter
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68">
                  This chapter lives in the adult-only catalog. Turn on adult mode to keep the same reading flow and open the full reader.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleEnterAdultReader}
                    className={cn(
                      "inline-flex min-h-[52px] items-center justify-center rounded-full px-6 py-3 text-sm font-black text-white shadow-[0_18px_40px_rgba(255,79,154,0.22)] transition-transform active:scale-[0.98]",
                      palette.primaryBg,
                    )}
                  >
                    Turn On Adult Mode
                  </button>
                  <button
                    type="button"
                    onClick={handleAdultGateExit}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.035)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[rgba(255,255,255,0.075)]"
                  >
                    View Series
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <ReaderStatCard
                  label="Mode"
                  value="18+ only"
                  hint="Adult mode is required before the chapter can load."
                  className="border-white/10 bg-[rgba(255,255,255,0.035)]"
                />
                <ReaderStatCard
                  label="Return"
                  value="Series page"
                  hint="You can leave this gate and browse the title page instead."
                  className="border-white/10 bg-[rgba(255,255,255,0.035)]"
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (modeBlock === "normal") {
    return (
      <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,79,154,0.1),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(103,232,249,0.12),transparent_22%),linear-gradient(180deg,#06080d_0%,#0a0d16_44%,#06080d_100%)] px-4 py-14 text-white">
        <div className="mx-auto max-w-[920px]">
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(14,17,28,0.98)_0%,rgba(10,11,18,0.96)_50%,rgba(11,15,24,0.98)_100%)] shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
              <div>
                <ReaderMetaPill className="border-white/10 bg-[rgba(255,255,255,0.035)] text-white/76">
                  Reader mode gate
                </ReaderMetaPill>
                <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-[3.35rem]">
                  Switch to Normal Mode
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68">
                  This chapter belongs to the standard catalog. Switch back to normal mode to keep reading from the same place without changing routes.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleAdultToggle}
                    className={cn(
                      "inline-flex min-h-[52px] items-center justify-center rounded-full px-6 py-3 text-sm font-black text-white shadow-[0_18px_40px_rgba(103,232,249,0.18)] transition-transform active:scale-[0.98]",
                      palette.primaryBg,
                    )}
                  >
                    Back to Normal Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(backToSeriesHref)}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.035)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[rgba(255,255,255,0.075)]"
                  >
                    View Series
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <ReaderStatCard
                  label="Mode"
                  value="Normal only"
                  hint="Adult mode is currently hiding this standard-catalog chapter."
                  className="border-white/10 bg-[rgba(255,255,255,0.035)]"
                />
                <ReaderStatCard
                  label="Return"
                  value="Series page"
                  hint="You can leave the reader gate and go back to the title page."
                  className="border-white/10 bg-[rgba(255,255,255,0.035)]"
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (error || !seriesData?.series || !episodeData) {
    return (
      <ReaderErrorState
        isComic={loadingIsComic}
        rootClassName={loadingRootClass}
        heroClassName={
          loadingIsComic ? cn(palette.surface, palette.border) : novelHeroClass
        }
        mutedClassName={loadingMutedClass}
        primaryButtonClassName={cn(
          "rounded-2xl px-6 py-3 font-black text-white transition-transform active:scale-[0.98]",
          palette.primaryBg,
        )}
        secondaryButtonClassName={cn(
          "rounded-2xl border px-6 py-3 font-bold transition-colors",
          loadingIsComic
            ? "border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
            : `${novelBorderClass} bg-white/5 text-white hover:bg-white/10`,
        )}
        onRetry={() => router.refresh()}
        onBack={() => router.push(backToSeriesHref)}
      />
    );
  }

  return (
    <ReaderShell
      isComic={isComic}
      className={isComic ? palette.rootBg : novelShellClass}
    >
      {!isComic ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={cn(
              "absolute left-[-12%] top-24 h-72 w-72 rounded-full blur-3xl",
              palette.heroGlow,
            )}
          />
          <div className="absolute right-[-8%] top-[30rem] h-80 w-80 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>
      ) : null}

      <div
        className={cn(
          "fixed top-0 z-50 w-full transition-transform duration-300",
          showNav ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <ReaderTopBar
          variant="minimal"
          isComic={isComic}
          title={seriesData.series.title}
          contextLabel={
            discoveryContext
              ? `${discoveryContext.returnTitle} | ${discoveryContext.laneValue}`
              : ""
          }
          contextActionLabel={discoveryContext?.returnLabel || ""}
          subtitle={currentInstallmentLabel}
          episodeLabel={currentEpisodeTitle}
          progress={readingPercent}
          onBack={() =>
            router.push(discoveryContext?.sourcePath || backToSeriesHref)
          }
          onAddBookmark={handleBookmarkToggle}
          onOpenSettings={() => setSettingsOpen((value) => !value)}
          bookmarkActive={Boolean(currentBookmark)}
        />
      </div>

      <ReaderSettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        nightMode={nightMode}
        onToggleNight={handleToggleNight}
        layoutMode={layoutModeForView}
        onToggleLayout={handleToggleLayout}
        disableLayoutToggle={!isComic}
        theme={novelTheme}
        onThemeChange={setTheme}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        lineHeight={lineHeight}
        onLineHeightChange={setLineHeight}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        showLayoutControls={isComic}
        showTextControls={!isComic}
        onSaveProgress={handleBookmarkToggle}
      />

      <section className="relative px-4 pb-2 pt-24 md:px-6 md:pt-28">
        <div
          className={cn(
            "mx-auto w-full",
            isComic ? "max-w-[1080px]" : "max-w-[940px]",
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden border shadow-[0_26px_80px_rgba(0,0,0,0.28)]",
              isComic
                ? "rounded-[30px] border-white/10 bg-[linear-gradient(145deg,rgba(17,20,30,0.98)_0%,rgba(8,10,16,0.98)_48%,rgba(18,13,24,0.98)_100%)] px-5 py-5 md:px-6 md:py-6"
                : "rounded-[30px] border-white/10 bg-[linear-gradient(145deg,rgba(17,20,30,0.96)_0%,rgba(8,10,16,0.98)_50%,rgba(20,12,26,0.94)_100%)] px-5 py-5 md:px-6 md:py-6",
            )}
          >
            {isComic ? (
              <>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.16),transparent_26%),radial-gradient(circle_at_84%_18%,rgba(103,232,249,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_28%,rgba(0,0,0,0.22)_100%)]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.18))]" />
              </>
            ) : null}
            <div className="relative">
              <div className="grid gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReaderMetaPill
                      className={cn(
                        isComic
                          ? cn("border-white/10", palette.primarySoft)
                          : `${novelBorderClass} bg-transparent ${readerMutedClass}`,
                      )}
                    >
                      {isComic ? "Reader" : "Novel"}
                    </ReaderMetaPill>
                    <ReaderMetaPill
                      className={cn(
                        isComic
                          ? "border-white/10 bg-[rgba(255,255,255,0.035)] text-white/72"
                          : `${novelBorderClass} bg-transparent`,
                        readerMutedClass,
                      )}
                    >
                      {isComic ? "Comic" : currentInstallmentLabel}
                    </ReaderMetaPill>
                    <Pill
                      className={
                        isComic
                          ? "border-white/10 bg-[rgba(255,255,255,0.035)] text-gray-300"
                          : `${novelBorderClass} bg-transparent ${readerMutedClass}`
                      }
                    >
                      {unlocked ? "Unlocked" : formatPriceLabel(currentPricePts)}
                    </Pill>
                  </div>

                  <h2
                    className={cn(
                      "mt-4 font-display font-semibold leading-[0.95] tracking-[-0.05em]",
                      isComic
                        ? "text-[clamp(1.8rem,3vw,3.15rem)] text-white"
                        : "text-[clamp(1.85rem,3vw,2.7rem)] text-current",
                    )}
                  >
                    {currentEpisodeTitle}
                  </h2>
                  <p
                    className={cn(
                      "mt-3 max-w-3xl font-semibold",
                      isComic
                        ? "text-base text-gray-100 md:text-lg"
                        : "text-base text-current/80 md:text-lg",
                    )}
                  >
                    {seriesData.series.title}
                  </p>
                  <p
                    className={cn(
                      "mt-3 max-w-3xl text-sm",
                      isComic ? "leading-6" : "leading-7",
                      readerMutedClass,
                    )}
                  >
                    {creatorName}{" / "}
                    {formatMetaDate(
                      currentEpisode?.releasedAt ||
                        episodeData?.releasedAt ||
                        seriesData.series.updatedAt,
                      seriesType,
                    )}{" / "}
                    {unlocked
                      ? `Full ${installmentNoun} unlocked.`
                      : `${safeVisibleUnits} free ${isComic ? "page" : "section"}${safeVisibleUnits === 1 ? "" : "s"} open now.`}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {readerStatCards.map((card) => (
                      <ReaderStatCard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                        hint={card.hint}
                        className="border-white/10 bg-[rgba(255,255,255,0.035)]"
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {isComic ? (
        <ComicReaderContent
          pages={pages}
          paragraphs={paragraphs}
          openingParagraphs={openingParagraphs}
          seriesId={seriesData.series.id}
          seriesTitle={seriesData.series.title}
          episodeTitle={currentEpisodeTitle}
          previewCount={previewCount}
          previewParagraphs={previewParagraphs}
          layoutMode={layoutModeForView}
          isNightMode={nightMode || isAdultMode}
          imageQuality={75}
          imageSizes="(max-width: 768px) 100vw, 768px"
          seriesType={seriesType}
          brightness={brightness}
          showOpeningParagraphs={unlocked}
          onActiveIndexChange={setActiveIndex}
          onPreviewEndRef={(node) => {
            previewEndRef.current = node;
          }}
          onEndRef={(node) => {
            endRef.current = node;
          }}
          onToggleChrome={() => setShowNav((value) => !value)}
        />
      ) : (
        <NovelReaderContent
          pages={pages}
          paragraphs={paragraphs}
          seriesId={seriesData.series.id}
          seriesTitle={seriesData.series.title}
          episodeTitle={currentEpisodeTitle}
          previewCount={previewCount}
          previewParagraphs={previewParagraphs}
          layoutMode={layoutModeForView}
          isNightMode={nightMode || isAdultMode}
          imageQuality={75}
          imageSizes="(max-width: 768px) 100vw, 768px"
          seriesType={seriesType}
          textTheme={novelTheme}
          fontSize={Math.max(18, Number(fontSize || 18))}
          lineHeight={Math.max(1.75, Number(lineHeight || 1.78))}
          brightness={brightness}
          shellClassName={readerPanelClass}
          onActiveIndexChange={setActiveIndex}
          onPreviewEndRef={(node) => {
            previewEndRef.current = node;
          }}
          onEndRef={(node) => {
            endRef.current = node;
          }}
          onToggleChrome={() => setShowNav((value) => !value)}
        />
      )}

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
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.14),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(103,232,249,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_26%,rgba(0,0,0,0.16)_100%)]" />
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_320px]">
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill className="border-amber-500/25 bg-amber-500/10 text-amber-200">
                      Free preview ends here
                    </Pill>
                    <Pill className="border-white/10 bg-white/5 text-gray-300">
                      {formatPriceLabel(currentPricePts)}
                    </Pill>
                  </div>
                  <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
                    Unlock the rest of this {installmentNoun}.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
                    Keep the flow going without leaving the reader. Unlock now and stay inside the same {installmentNoun} experience.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Metric
                      label="Unlock price"
                      value={formatPriceLabel(currentPricePts)}
                      hint={`${safeVisibleUnits} preview ${isComic ? "page" : "section"}${safeVisibleUnits === 1 ? "" : "s"} already open`}
                    />
                    <Metric
                      label="Wallet total"
                      value={`${walletBalance} pts`}
                      hint={
                        isSignedIn
                          ? `${paidPts} paid / ${bonusPts} bonus`
                          : "Sign in to view your balance"
                      }
                    />
                    <Metric
                      label="Shortfall"
                      value={
                        shortfallPts > 0 ? `${shortfallPts} pts` : "Ready now"
                      }
                      hint={
                        shortfallPts > 0
                          ? "Add points to keep reading"
                          : "Enough points to unlock now"
                      }
                    />
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {!isSignedIn ? (
                      <button
                        type="button"
                        onClick={() =>
                          openLogin(
                            "login",
                            `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`,
                          )
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
                        Add Points
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
                        {unlockBusy
                          ? "Unlocking..."
                          : `Unlock with ${currentPricePts} pts`}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => router.push(backToSeriesHref)}
                      className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/5"
                    >
                      View Series
                    </button>
                  </div>
                </div>

                <div className="relative rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] p-5 backdrop-blur-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                    Unlock Includes
                  </p>
                  <div className="mt-4 space-y-3">
                    <Metric
                      label="Keep reading"
                      value="No break"
                      hint="Stay in the same reading flow after access flips live."
                    />
                    <Metric
                      label="Up next"
                      value={`${Math.max(episodes.length - (currentIndex + 1), 0)} more chapters`}
                      hint={`You are reading ${currentInstallmentLabel.toLowerCase()} of ${Math.max(episodes.length, 1)}.`}
                    />
                    <Metric
                      label="Reading state"
                      value="Synced progress"
                      hint="Signed-in readers keep placement and unlock state together."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <ReaderEndPanel
        isComic={isComic}
        shellClassName={cn(
          "rounded-[30px] border p-5 md:p-6",
          isComic ? cn(palette.surface, palette.border) : novelHeroClass,
        )}
        mutedClassName={readerMutedClass}
        borderClassName={
          isComic
            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
            : `${novelBorderClass} bg-white/5 text-white hover:bg-white/10`
        }
        completionLabel={`${installmentTitle} Complete`}
        primaryButtonClassName={cn(
          "inline-flex min-h-[56px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-black text-white transition-transform active:scale-[0.98]",
          unlocked && !nextEpisode && !isComic
            ? `${novelBorderClass} bg-white/5 text-white`
            : unlocked && !nextEpisode
              ? "border border-white/10 bg-white/5"
              : palette.primaryBg,
        )}
        secondaryButtonClassName={cn(
          "inline-flex min-h-[52px] items-center justify-center rounded-2xl border px-5 py-3 text-sm font-bold transition-colors",
          isComic
            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
            : `${novelBorderClass} bg-white/5 text-white hover:bg-white/10`,
        )}
        heading={
          unlocked
            ? `You finished ${currentInstallmentLabel}`
            : "Continue the story"
        }
        description={
          unlocked
            ? `${currentInstallmentLabel} is complete. Keep reading, revisit the previous ${installmentNoun}, or open reader reactions below.`
            : `The free preview stops here. Unlock the rest of this ${installmentNoun} to keep reading.`
        }
        nextEpisodeTitle={
          nextEpisode
            ? resolveEpisodeDisplayTitle(
                nextEpisode?.title,
                formatInstallmentLabel(
                  seriesType,
                  nextEpisode?.number || currentNumber + 1,
                ),
                seriesType,
              )
            : ""
        }
        nextEpisodeHint={
          Number(nextEpisode?.pricePts || 0) > 0
            ? `${formatPriceLabel(nextEpisode?.pricePts)} if this next ${installmentNoun} is still locked.`
            : `The next ${installmentNoun} is ready.`
        }
        nextActionLabel={`Next ${installmentNoun}`}
        nextReadyLabel={`Next ${installmentNoun} is ready.`}
        hasNextEpisode={Boolean(nextEpisode)}
        isUnlocked={unlocked}
        isSignedIn={isSignedIn}
        shortfallPts={shortfallPts}
        currentPricePts={currentPricePts}
        currentBookmark={currentBookmark}
        liked={liked}
        onPrimaryAction={
          nextEpisode
            ? () =>
                handleNavigateEpisode(nextEpisode, "next", "end-panel-primary")
            : () => router.push(backToSeriesHref)
        }
        onOpenComments={handleOpenComments}
        onPrev={
          prevEpisode
            ? () =>
                handleNavigateEpisode(
                  prevEpisode,
                  "previous",
                  "end-panel-secondary",
                )
            : () => router.push(backToSeriesHref)
        }
        onBack={() => router.push(backToSeriesHref)}
        onBookmark={handleBookmarkToggle}
        onLike={() => setLiked((value) => !value)}
        onShare={handleShare}
        onOpenLogin={() =>
          openLogin(
            "login",
            `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`,
          )
        }
        onOpenStore={() => router.push("/store")}
        onUnlock={handleUnlockCurrent}
        unlockBusy={unlockBusy}
      />

      <section
        ref={commentsRef}
        data-testid="reader-reactions"
        className="px-4 pb-20 pt-6 md:px-6"
      >
        <div
          className={cn(
            "mx-auto w-full",
            isComic ? "max-w-5xl" : "max-w-[760px]",
          )}
        >
          <div
            className={cn(
              storefrontSoftCardClass,
              "rounded-[28px] border-white/10 bg-[rgba(255,255,255,0.035)] px-5 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.22em]",
                readerMutedClass,
              )}
            >
              Reader reactions
            </p>
            <h3
              className={cn(
                "mt-2 font-display text-2xl font-semibold tracking-[-0.04em]",
                isComic ? "text-white" : "text-current",
              )}
            >
              Reactions will appear here
            </h3>
            <p
              className={cn(
                "mt-2 text-sm leading-6",
                isComic ? "text-white/62" : "text-current/62",
              )}
            >
              Reactions will appear here as readers join the thread.
            </p>
          </div>
        </div>
      </section>

      <ReaderBottomBar
        visible={showNav}
        isComic={isComic}
        shellClassName={
          isComic
            ? "border-t border-white/5 bg-[#0b0f16]/88"
            : cn("border-t", novelTopBarClass)
        }
        progressClassName={palette.primaryBg}
        navButtonClassName={cn(
          "inline-flex min-h-[44px] min-w-[108px] items-center justify-center rounded-full border px-4 text-sm font-bold transition-colors",
          isComic
            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
            : `${novelBorderClass} bg-white/5 text-white hover:bg-white/10`,
        )}
        centerButtonClassName={cn(
          "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors",
          isComic
            ? "border-white/10 bg-white/10 text-white hover:bg-white/15"
            : `${novelBorderClass} bg-white/10 text-white hover:bg-white/15`,
        )}
        iconButtonClassName={cn(
          isComic
            ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
            : `${novelBorderClass} bg-white/5 text-white/82 hover:bg-white/10 hover:text-white`,
        )}
        activeButtonClassName={
          isComic
            ? "border-white/20 bg-white/10 text-white"
            : "border-white/20 bg-white/12 text-white"
        }
        primaryButtonClassName={cn(
          "inline-flex min-h-[44px] min-w-[108px] items-center justify-center rounded-full px-4 text-sm font-black transition-transform active:scale-[0.98]",
          nextEpisode ? palette.primaryBg : "border border-white/10 bg-white/5",
          !nextEpisode &&
            !isComic &&
            `${novelBorderClass} bg-white/5 text-white`,
        )}
        progressPercent={progressPercent}
        hasPrev={Boolean(prevEpisode)}
        hasNext={Boolean(nextEpisode)}
        onPrev={
          prevEpisode
            ? () => handleNavigateEpisode(prevEpisode, "previous", "bottom-bar")
            : () => router.push(backToSeriesHref)
        }
        onNext={
          nextEpisode
            ? () => handleNavigateEpisode(nextEpisode, "next", "bottom-bar")
            : () => router.push(backToSeriesHref)
        }
        onOpenSeries={() => router.push(backToSeriesHref)}
        onOpenSettings={() => setSettingsOpen((value) => !value)}
        settingsOpen={settingsOpen}
      />

      {toast ? (
        <div className="fixed bottom-24 right-4 z-[60] rounded-full border border-white/10 bg-[#0d121a]/95 px-4 py-2 text-xs font-bold text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:right-6">
          {toast}
        </div>
      ) : null}
    </ReaderShell>
  );
}

export default function FigmaReaderPage({
  seriesId,
  episodeId,
  fallbackData = null,
  initialReaderPayload = null,
}) {
  return (
    <FigmaSiteProvider>
      <ReaderContent
        seriesId={seriesId}
        episodeId={episodeId}
        fallbackData={fallbackData}
        initialReaderPayload={initialReaderPayload}
      />
    </FigmaSiteProvider>
  );
}
