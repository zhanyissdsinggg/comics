"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Eye,
  Heart,
  List,
  Lock,
  PlayCircle,
  Share2,
  Star,
} from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import {
  getContentModeQueryParam,
  isAdultContent,
  matchesContentMode,
} from "../../lib/contentFilters";
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";
import { getEpisodeAccessState } from "../../lib/episodeAccessState";
import { openAuthPrompt } from "../../lib/openAuthPrompt";
import { readPaymentAttributionFromSearchParams } from "../../lib/paymentAttribution";
import { buildReaderPath } from "../../lib/readerRoutes";
import { getInstallmentLabel } from "../../lib/seriesFormatLabels";
import { useAuthStore } from "../../store/useAuthStore";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useWalletStore } from "../../store/useWalletStore";
import SeriesArrivalPanel from "../series/SeriesArrivalPanel";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import FigmaChrome from "./FigmaChrome";
import FigmaCommentsSection from "./FigmaCommentsSection";
import UnlockChapterModal from "../series/UnlockChapterModal";
import {
  FIGMA_CONTENT_TYPES,
  buildFigmaCatalog,
  buildFigmaSeriesItem,
  cn,
} from "./figma-utils";

function buildCoverAltText(label, seriesType = "") {
  const normalizedLabel = String(label || "").replace(/\s+/g, " ").trim();
  const normalizedType = String(seriesType || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (normalizedLabel) {
    if (normalizedType === "comic" || normalizedType === "novel") {
      return `${normalizedType.charAt(0).toUpperCase()}${normalizedType.slice(1)} cover image for ${normalizedLabel}`;
    }
    return `Cover image for ${normalizedLabel}`;
  }

  return "Series cover image";
}

function ModeBlockedState({
  palette,
  title,
  description,
  ctaLabel,
  onCta,
  onBack,
}) {
  return (
    <div className={cn("min-h-screen", palette.rootBg)}>
      <FigmaChrome>
        <main className="flex min-h-[78vh] flex-col items-center justify-center px-4 py-20 text-center">
          <Lock className="mb-6 h-16 w-16 text-red-500 opacity-80" />
          <h1 className="mb-4 text-3xl font-black text-white">{title}</h1>
          <p className="mb-8 max-w-md text-gray-400">{description}</p>
          <button
            type="button"
            onClick={onCta}
            className={cn(
              "rounded-xl px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all active:scale-95",
              palette.primaryBg,
            )}
          >
            {ctaLabel}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 font-bold text-gray-500 transition-colors hover:text-white"
          >
            Go Back
          </button>
        </main>
      </FigmaChrome>
    </div>
  );
}

function SeriesDetailContent({
  seriesId,
  initialSeries,
  initialEpisodes,
  initialState = "ready",
  initialSearchParams = null,
}) {
  const router = useRouter();
  const { palette, contentMode, isAdultMode, handleAdultToggle } =
    useFigmaSite();
  const { isSignedIn } = useAuthStore();
  const { followedSeriesIds, follow, unfollow, loadFollowed } = useFollowStore();
  const { bySeriesId, loadEntitlement } = useEntitlementStore();
  const {
    paidPts,
    bonusPts,
    subscription,
    subscriptionUsage,
    loadWallet,
  } = useWalletStore();
  const [payload, setPayload] = useState(() =>
    initialSeries
      ? {
          series: initialSeries,
          episodes: Array.isArray(initialEpisodes) ? initialEpisodes : [],
        }
      : null,
  );
  const [loading, setLoading] = useState(
    !initialSeries && initialState === "ready",
  );
  const [error, setError] = useState(() => {
    if (initialState === "adult-gated") {
      return "ADULT_GATED";
    }
    if (initialState === "mode-mismatch") {
      return "MODE_MISMATCH";
    }
    if (initialState === "not-found") {
      return "NOT_FOUND";
    }
    if (initialState === "unavailable") {
      return "UNAVAILABLE";
    }
    return null;
  });
  const requestRef = useRef(0);
  const isFollowing = followedSeriesIds.includes(seriesId);
  const [unlockModalState, setUnlockModalState] = useState(null);
  const discoveryAttribution = useMemo(
    () => readPaymentAttributionFromSearchParams(initialSearchParams),
    [initialSearchParams],
  );
  const entitlement = bySeriesId[seriesId] || {
    seriesId,
    unlockedEpisodeIds: [],
  };
  const walletBalance = Number(paidPts || 0) + Number(bonusPts || 0);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    void loadFollowed();
    void loadWallet();
    void loadEntitlement(seriesId);
  }, [isSignedIn, loadEntitlement, loadFollowed, loadWallet, seriesId]);

  useEffect(() => {
    let active = true;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const adultFlag = getContentModeQueryParam(contentMode);

    if (!payload?.series || !matchesContentMode(payload.series, contentMode)) {
      setLoading(true);
    }

    apiGet(`/api/series/${encodeURIComponent(seriesId)}?adult=${adultFlag}`, {
      cacheMs: 0,
    })
      .then((response) => {
        if (!active || requestRef.current !== requestId) {
          return;
        }

        if (!response.ok || !response.data?.series) {
          setPayload(null);
          if (response.status === 403 || response.error === "ADULT_GATED") {
            setError("ADULT_GATED");
          } else if (
            response.status === 404 ||
            response.error === "NOT_FOUND"
          ) {
            setError("NOT_FOUND");
          } else {
            setError("UNAVAILABLE");
          }
          setLoading(false);
          return;
        }

        if (!matchesContentMode(response.data.series, contentMode)) {
          setPayload(null);
          setError(
            isAdultContent(response.data.series)
              ? "ADULT_GATED"
              : "MODE_MISMATCH",
          );
          setLoading(false);
          return;
        }

        setPayload({
          series: response.data.series,
          episodes: Array.isArray(response.data?.episodes)
            ? response.data.episodes
            : [],
        });
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        if (!active || requestRef.current !== requestId) {
          return;
        }
        setPayload(null);
        setError("UNAVAILABLE");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentMode, isAdultMode, seriesId]);

  const detailItem = useMemo(() => {
    const mapped = buildFigmaSeriesItem(payload?.series, {
      interactive: false,
      defaultEpisodeId: String(
        payload?.episodes?.[0]?.id || payload?.series?.latestEpisodeId || "",
      ).trim(),
    });
    return mapped;
  }, [payload?.episodes, payload?.series]);

  const chapterItems = useMemo(() => {
    const episodes = Array.isArray(payload?.episodes) ? payload.episodes : [];
    if (episodes.length === 0) {
      return [];
    }

    return [...episodes]
      .sort((left, right) => {
        const rightNumber = Number(right?.number || 0);
        const leftNumber = Number(left?.number || 0);
        if (rightNumber !== leftNumber) {
          return rightNumber - leftNumber;
        }

        const rightTime = new Date(right?.releasedAt || 0).getTime() || 0;
        const leftTime = new Date(left?.releasedAt || 0).getTime() || 0;
        return rightTime - leftTime;
      })
      .map((episode) => ({
        id: String(episode?.id || "").trim(),
        title:
          String(episode?.title || "").trim() ||
          getInstallmentLabel(payload?.series?.type || payload?.series) +
            ` ${episode?.number || 1}`,
        date: episode?.releasedAt
          ? new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
            }).format(new Date(episode.releasedAt))
          : "Today",
        views: "100K",
        number: Number(episode?.number || 0) || 1,
        rawEpisode: episode,
      }));
  }, [payload?.episodes, payload?.series]);

  const isInteractive = detailItem?.kind === FIGMA_CONTENT_TYPES.INTERACTIVE;
  const isNovel = detailItem?.kind === FIGMA_CONTENT_TYPES.NOVELS;
  const chapterPrefix = isInteractive
    ? "Routes"
    : isNovel
      ? "Episodes"
      : "Chapters";
  const readLabel = isInteractive
    ? "Start Playing"
    : detailItem?.readLabel || "Start reading";
  const handleRequireAuth = (source) => {
    if (isSignedIn) {
      return false;
    }
    void source;
    openAuthPrompt();
    return true;
  };
  const handleLibraryToggle = async () => {
    if (handleRequireAuth("follow")) {
      return;
    }
    if (isFollowing) {
      await unfollow(seriesId);
      return;
    }
    await follow(seriesId);
  };
  const coverAltText = buildCoverAltText(
    detailItem?.title,
    payload?.series?.type,
  );
  const coverImageUrl = resolveDisplayImageUrl(detailItem?.coverUrl, {
    kind: "cover",
    adult: detailItem?.adult || detailItem?.isAdult,
  });

  if (loading && !detailItem) {
    return (
      <div className={cn("min-h-screen", palette.rootBg)}>
        <FigmaChrome>
          <main className="mx-auto flex min-h-[72vh] max-w-[960px] items-center justify-center px-4 py-24">
            <div
              className={cn(
                "w-full rounded-3xl border p-10 text-center shadow-2xl",
                palette.surface,
                palette.border,
              )}
            >
              <h1 className="mb-3 text-3xl font-black text-white">
                Loading story
              </h1>
              <p className="mx-auto max-w-lg text-gray-400">
                Refreshing the correct catalog for this mode.
              </p>
            </div>
          </main>
        </FigmaChrome>
      </div>
    );
  }

  if (error === "ADULT_GATED") {
    return (
      <ModeBlockedState
        palette={palette}
        title="Age Restricted Content"
        description="This title is marked 18+ and needs mature mode enabled before we show it."
        ctaLabel="Verify Age Now"
        onCta={handleAdultToggle}
        onBack={() => router.back()}
      />
    );
  }

  if (error === "MODE_MISMATCH" && isAdultMode) {
    return (
      <ModeBlockedState
        palette={palette}
        title="Normal Mode Required"
        description="This title belongs to the normal catalog. Switch back to normal mode to continue."
        ctaLabel="Normal"
        onCta={handleAdultToggle}
        onBack={() => router.back()}
      />
    );
  }

  if (!detailItem) {
    return (
      <div className={cn("min-h-screen", palette.rootBg)}>
        <FigmaChrome>
          <main className="mx-auto flex min-h-[72vh] max-w-[960px] items-center justify-center px-4 py-24">
            <div
              className={cn(
                "w-full rounded-3xl border p-10 text-center shadow-2xl",
                palette.surface,
                palette.border,
              )}
            >
              <h1 className="mb-3 text-3xl font-black text-white">
                {error === "UNAVAILABLE"
                  ? "Story unavailable"
                  : "Story not found"}
              </h1>
              <p className="mx-auto max-w-lg text-gray-400">
                {error === "UNAVAILABLE"
                  ? "This title could not be loaded right now."
                  : "This title is missing or not ready for public view yet."}
              </p>
            </div>
          </main>
        </FigmaChrome>
      </div>
    );
  }

  if (
    detailItem &&
    !matchesContentMode(detailItem, contentMode) &&
    isAdultContent(detailItem)
  ) {
    return (
      <ModeBlockedState
        palette={palette}
        title="Age Restricted Content"
        description="This title is marked 18+ and needs mature mode enabled before we show it."
        ctaLabel="Verify Age Now"
        onCta={handleAdultToggle}
        onBack={() => router.back()}
      />
    );
  }

  if (
    detailItem &&
    !matchesContentMode(detailItem, contentMode) &&
    !isAdultContent(detailItem)
  ) {
    return (
      <ModeBlockedState
        palette={palette}
        title="Normal Mode Required"
        description="This title belongs to the normal catalog. Switch back to normal mode to continue."
        ctaLabel="Normal"
        onCta={handleAdultToggle}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <div className={cn("min-h-screen", palette.rootBg)}>
      <FigmaChrome>
        <div className="relative h-[300px] w-full bg-black min-[420px]:h-[320px] sm:h-[390px] md:h-[520px]">
            <div className="absolute inset-0">
              <div
                aria-hidden="true"
                className="h-full w-full scale-110 object-cover opacity-20 blur-xl"
                style={{
                  backgroundImage: `url("${coverImageUrl}")`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                }}
              />
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-t from-5% to-transparent",
                palette.heroOverlay,
              )}
            />
          </div>

          <div className="relative mx-auto flex h-full max-w-[1200px] flex-col justify-end px-4 pb-5 md:px-8 md:pb-10">
            <div className="flex w-full flex-col items-start gap-3.5 md:flex-row md:items-start md:gap-8">
              <img
                src={coverImageUrl}
                alt={coverAltText}
                className="w-28 shrink-0 self-end translate-y-3 rounded-xl object-cover shadow-2xl ring-2 ring-white/10 min-[420px]:w-32 min-[420px]:translate-y-5 md:w-64 md:self-auto md:translate-y-24"
              />

              <div className="w-full flex-1 rounded-[24px] border border-white/10 bg-black/24 px-4 py-3.5 backdrop-blur-md md:rounded-[26px] md:border-0 md:bg-transparent md:px-0 md:py-0">
                <div className="mb-2 flex flex-wrap gap-2 md:mb-3">
                  {detailItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm md:px-3 md:text-xs",
                        palette.primarySoft,
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h1 className="mb-1 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-[1.75rem] font-black leading-none tracking-tight text-transparent drop-shadow-sm md:mb-2 md:text-5xl">
                  {detailItem.title}
                </h1>
                <p className="mb-3 text-sm font-medium text-gray-300 md:mb-4 md:text-lg">
                  {detailItem.author}
                </p>

                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold text-gray-400 md:mb-6 md:gap-6 md:text-sm">
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    {detailItem.rating} Rating
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {detailItem.viewsText} Views
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {detailItem.likesText} Likes
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center md:gap-4">
                  <Link
                    href={detailItem.readHref}
                    className={cn(
                      "flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95 sm:min-h-[48px] sm:w-auto sm:justify-start sm:whitespace-nowrap md:min-h-[52px] md:px-8 md:py-3.5 md:text-base",
                      palette.primaryBg,
                    )}
                  >
                    <PlayCircle className="h-5 w-5" />
                    {readLabel}
                  </Link>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleLibraryToggle}
                      aria-label={
                        isFollowing ? "Remove from library" : "Add to Library"
                      }
                      className={cn(
                        "flex min-h-[46px] items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg transition-all hover:bg-white/10 active:scale-95 md:min-h-[48px] md:px-5",
                        palette.surface,
                        palette.border,
                      )}
                    >
                      <BookmarkPlus className="h-5 w-5" />
                      <span>{isFollowing ? "Saved" : "Add to Library"}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Share ${detailItem.title}`}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg transition-all hover:bg-white/10 active:scale-95 md:h-12 md:w-12",
                        palette.surface,
                        palette.border,
                      )}
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-10 md:flex-row md:gap-12 md:px-8 md:py-20">
          <div className="order-2 w-full shrink-0 pt-2 md:order-1 md:w-72 md:pt-0">
            <div
              className={cn(
                "rounded-[24px] border p-4 shadow-xl md:rounded-[28px] md:p-6",
                palette.surface,
                palette.border,
              )}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 md:text-xs">
                Story Brief
              </p>
              <h3 className="mt-3 text-lg font-black text-white md:text-xl">
                Synopsis
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-400 md:leading-relaxed">
                {detailItem.description}
              </p>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                    Format
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">
                    {isInteractive
                      ? "Interactive story"
                      : isNovel
                        ? "Novel serial"
                        : "Comic series"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                    Shelf State
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">
                    {detailItem.status || "Ongoing"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 flex-1 md:order-2">
            <SeriesArrivalPanel
              series={payload?.series || detailItem?.raw || null}
              attribution={discoveryAttribution}
              className="mt-0"
            />
            <div
              className={cn(
                "rounded-[26px] border p-4 shadow-xl md:rounded-[30px] md:p-6",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mb-5 flex flex-col items-start gap-2.5 border-b border-gray-800 pb-3 sm:flex-row sm:items-center sm:justify-between md:mb-6 md:pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 md:text-xs">
                    Reading Queue
                  </p>
                  <h2 className="mt-2 flex items-center gap-2 text-lg font-bold tracking-tight text-white md:text-xl">
                    <List className={cn("h-5 w-5", palette.primaryText)} />
                    {chapterPrefix} ({chapterItems.length})
                  </h2>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 transition-colors hover:text-white"
                >
                  Sort: Newest
                </button>
              </div>

              <div className="space-y-3">
                {chapterItems.map((chapter, index) => {
                  const accessState = chapter.rawEpisode
                    ? getEpisodeAccessState({
                        episode: chapter.rawEpisode,
                        unlocked: entitlement.unlockedEpisodeIds.includes(
                          chapter.rawEpisode.id,
                        ),
                        subscription,
                        subscriptionUsage,
                        coupons: [],
                        nowMs: Date.now(),
                        fallbackPrice: chapter.rawEpisode.pricePts,
                      })
                    : null;
                  const isLocked =
                    accessState?.actionKind === "unlock" ||
                    accessState?.actionKind === "locked";

                  return isLocked ? (
                    <div
                      key={chapter.id || `${detailItem.id}-${index}`}
                      id={`episode-${chapter.id}`}
                      className={cn(
                        "group flex flex-col items-start gap-3 rounded-2xl border border-white/5 bg-black/15 p-3 transition-all hover:border-gray-700 hover:bg-white/[0.03] active:scale-[0.98] sm:flex-row sm:items-center sm:justify-between md:p-4",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3 md:gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-black text-gray-300 md:h-9 md:w-9">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black ring-1 ring-white/10 transition-all group-hover:ring-white/30 md:h-12 md:w-12">
                          <div
                            aria-hidden="true"
                            className="h-full w-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110"
                            style={{
                              backgroundImage: `url("${coverImageUrl}")`,
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              backgroundSize: "cover",
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="line-clamp-2 text-sm font-bold text-white transition-colors group-hover:text-gray-200 md:text-base">
                            {chapter.title}
                          </h4>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">
                            {chapter.date}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (handleRequireAuth("unlock")) {
                            return;
                          }
                          setUnlockModalState({
                            episodeId: chapter.rawEpisode.id,
                            installmentNumber: chapter.rawEpisode.number,
                            pricePts: accessState?.effectivePrice || 0,
                            view: "confirm",
                          });
                        }}
                        className={cn(
                          "inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-white/10 active:scale-95",
                          palette.surface,
                          palette.border,
                        )}
                      >
                        Unlock with Points
                      </button>
                    </div>
                  ) : (
                    <Link
                    key={chapter.id || `${detailItem.id}-${index}`}
                    id={`episode-${chapter.id}`}
                    href={`/read/${encodeURIComponent(detailItem.id)}/${encodeURIComponent(chapter.id)}`}
                    className={cn(
                      "group flex flex-col items-start gap-3 rounded-2xl border border-white/5 bg-black/15 p-3 transition-all hover:border-gray-700 hover:bg-white/[0.03] active:scale-[0.98] sm:flex-row sm:items-center sm:justify-between md:p-4",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3 md:gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-black text-gray-300 md:h-9 md:w-9">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black ring-1 ring-white/10 transition-all group-hover:ring-white/30 md:h-12 md:w-12">
                          <div
                            aria-hidden="true"
                            className="h-full w-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110"
                            style={{
                              backgroundImage: `url("${coverImageUrl}")`,
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              backgroundSize: "cover",
                            }}
                          />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PlayCircle
                            className={cn(
                              "h-4 w-4 opacity-70 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 md:h-5 md:w-5",
                              palette.primaryText,
                            )}
                          />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-2 text-sm font-bold text-white transition-colors group-hover:text-gray-200 md:text-base">
                          {chapter.title}
                        </h4>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">
                          {chapter.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-left text-xs font-semibold text-gray-400 transition-colors group-hover:text-white sm:text-right md:text-sm">
                      <div>{chapter.views}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">
                        Reads
                      </div>
                    </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <FigmaCommentsSection seriesTitle={detailItem.title} />
          </div>
        </div>
      </FigmaChrome>
      <UnlockChapterModal
        open={Boolean(unlockModalState)}
        installmentNumber={unlockModalState?.installmentNumber}
        seriesType={payload?.series?.type || detailItem?.raw?.type || "comic"}
        pricePts={unlockModalState?.pricePts || 0}
        walletBalance={walletBalance}
        shortfallPts={Math.max(
          0,
          Number(unlockModalState?.pricePts || 0) - walletBalance,
        )}
        isSignedIn={isSignedIn}
        view={unlockModalState?.view || "confirm"}
        busyAction=""
        onViewChange={(nextView) =>
          setUnlockModalState((current) =>
            current
              ? {
                  ...current,
                  view: nextView,
                }
              : current,
          )
        }
        onConfirmUnlock={() => {}}
        onBuyPack={() => {}}
        onOpenStore={() => router.push("/store")}
        onClose={() => setUnlockModalState(null)}
      />
    </div>
  );
}

export default function FigmaSeriesDetailPage({
  seriesId,
  series,
  episodes = [],
  initialContentType = FIGMA_CONTENT_TYPES.COMICS,
  initialState = "ready",
  initialSearchParams = null,
}) {
  const catalog = buildFigmaCatalog(series ? [series] : []);
  const detailKind =
    catalog.items[0]?.kind === FIGMA_CONTENT_TYPES.NOVELS
      ? FIGMA_CONTENT_TYPES.NOVELS
      : initialContentType;

  return (
    <FigmaSiteProvider initialContentType={detailKind}>
      <SeriesDetailContent
        seriesId={seriesId}
        initialSeries={series}
        initialEpisodes={episodes}
        initialState={initialState}
        initialSearchParams={initialSearchParams}
      />
    </FigmaSiteProvider>
  );
}
