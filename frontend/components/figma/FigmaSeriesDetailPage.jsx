"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Eye,
  Heart,
  Lock,
  PlayCircle,
  Share2,
  Star,
} from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import {
  canAccessInContentMode,
  getContentModeQueryParam,
  isAdultContent,
  matchesContentMode,
} from "../../lib/contentFilters";
import { resolveSeriesCreatorIdentity } from "../../lib/creatorIdentity";
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";
import { getEpisodeAccessState } from "../../lib/episodeAccessState";
import { openAuthPrompt } from "../../lib/openAuthPrompt";
import { siteConfig } from "../../lib/siteConfig";
import {
  getInstallmentLabel,
  getSeriesHeroMetadataParts,
} from "../../lib/seriesFormatLabels";
import { useAuthStore } from "../../store/useAuthStore";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useWalletStore } from "../../store/useWalletStore";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import FigmaChrome from "./FigmaChrome";
import UnlockChapterModal from "../series/UnlockChapterModal";
import {
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  StorefrontSectionHeading,
} from "../common/StorefrontPagePrimitives";
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

function compactNumberLabel(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  if (numeric >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(numeric >= 10_000_000 ? 0 : 1)}M`;
  }

  if (numeric >= 1_000) {
    return `${(numeric / 1_000).toFixed(numeric >= 100_000 ? 0 : 1)}K`;
  }

  return `${Math.round(numeric)}`;
}

function buildSeriesStatusCopy(series) {
  const normalizedStatus = String(series?.status || "")
    .trim()
    .toLowerCase();

  if (normalizedStatus === "completed" || normalizedStatus === "end") {
    return "Completed";
  }

  const updatedAt = new Date(series?.updatedAt || 0).getTime() || 0;
  const weeklyWindowMs = 10 * 24 * 60 * 60 * 1000;
  if (updatedAt && Date.now() - updatedAt <= weeklyWindowMs) {
    return "Ongoing";
  }

  return "Ongoing";
}

function resolveEpisodeReadsValue(episode) {
  const candidates = [
    episode?.readCount,
    episode?.reads,
    episode?.viewCount,
    episode?.views,
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate || 0);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return 0;
}

function buildEpisodePlatformLabel(episode, index, seriesType) {
  const normalizedStatus = String(episode?.status || "")
    .trim()
    .toLowerCase();
  const installmentName = getInstallmentLabel(seriesType || "comic");

  if (normalizedStatus === "completed" || normalizedStatus === "free") {
    return `Full ${installmentName.toLowerCase()} ready`;
  }

  if (index === 0) {
    return `Latest ${installmentName.toLowerCase()}`;
  }

  return `${installmentName} ready`;
}

function getSeriesFormatLabel(item) {
  if (item?.kind === FIGMA_CONTENT_TYPES.INTERACTIVE) {
    return "Interactive";
  }
  if (item?.kind === FIGMA_CONTENT_TYPES.NOVELS) {
    return "Novel";
  }
  return "Comic";
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
    <main className={cn("min-h-screen", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto flex min-h-[78vh] max-w-[1040px] items-center px-4 py-16">
          <div className="w-full overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(20,16,28,0.98)_0%,rgba(10,12,19,0.96)_52%,rgba(16,12,22,0.98)_100%)] shadow-[0_32px_84px_rgba(0,0,0,0.34)]">
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
              <div>
                <p className="inline-flex rounded-full border border-[rgba(255,151,189,0.24)] bg-[rgba(255,79,154,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffd6e5]">
                  Catalog gate
                </p>
                <h2 className="mt-5 font-display text-[2.45rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-[3.1rem]">
                  {title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68">
                  {description}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={onCta}
                    className={cn(
                      "inline-flex min-h-[52px] items-center justify-center rounded-full px-6 py-3 text-sm font-black text-white shadow-[0_18px_40px_rgba(255,79,154,0.22)] transition-transform active:scale-[0.98]",
                      palette.primaryBg,
                    )}
                  >
                    {ctaLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.035)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[rgba(255,255,255,0.075)]"
                  >
                    Go Back
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.035)] px-4 py-4 shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                    Access
                  </p>
                  <p className="mt-3 text-base font-semibold text-white">
                    Private by default
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/60">
                    This title only opens when the current content mode matches the catalog.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.035)] px-4 py-4 shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                    Return
                  </p>
                  <p className="mt-3 text-base font-semibold text-white">
                    Series browser
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/60">
                    Leave the gate and head back without changing routes or data state.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FigmaChrome>
    </main>
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
  void initialSearchParams;
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

    if (!payload?.series || !canAccessInContentMode(payload.series, contentMode)) {
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

        if (!canAccessInContentMode(response.data.series, contentMode)) {
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
          ...response.data,
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

    const mappedChapters = [...episodes]
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
      .map((episode, index) => ({
        id: String(episode?.id || "").trim(),
        title:
          String(episode?.title || "").trim() ||
          getInstallmentLabel(payload?.series?.type || payload?.series) +
            ` ${episode?.number || 1}`,
        metaLabel: buildEpisodePlatformLabel(
          episode,
          index,
          payload?.series?.type || payload?.series,
        ),
        readsValue: resolveEpisodeReadsValue(episode),
        number: Number(episode?.number || 0) || 1,
        rawEpisode: episode,
      }));

    const distinctReadValues = new Set(
      mappedChapters
        .map((chapter) => Number(chapter.readsValue || 0))
        .filter((value) => value > 0),
    );
    const shouldHideReads =
      distinctReadValues.size === 0 ||
      (distinctReadValues.size === 1 && mappedChapters.length > 1);

    return mappedChapters.map((chapter) => ({
      ...chapter,
      readsText:
        shouldHideReads || Number(chapter.readsValue || 0) <= 0
          ? ""
          : compactNumberLabel(chapter.readsValue),
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
  const creatorIdentity = resolveSeriesCreatorIdentity(payload?.series || null);
  const creatorHref = creatorIdentity?.href || "";
  const creatorLabel = creatorIdentity?.displayName || detailItem?.author || "";
  const heroMetadata = getSeriesHeroMetadataParts(
    payload?.series || detailItem?.raw || null,
    creatorLabel,
    payload?.series?.episodeCount || chapterItems.length || "",
  );
  const coverImageUrl = resolveDisplayImageUrl(detailItem?.coverUrl, {
    kind: "cover",
    adult: detailItem?.adult || detailItem?.isAdult,
  });
  const publicStatusLabel = useMemo(
    () =>
      buildSeriesStatusCopy(payload?.series || detailItem?.raw || null),
    [detailItem?.raw, payload?.series],
  );
  const formatLabel = getSeriesFormatLabel(detailItem);
  const primaryGenreLabel =
    detailItem?.genres?.[0] || detailItem?.tags?.[0] || "Drama";
  const quickStats = [
    {
      label: chapterPrefix,
      value:
        chapterItems.length > 0
          ? `${chapterItems.length}`
          : "Opening soon",
    },
    {
      label: "Status",
      value: publicStatusLabel,
    },
    {
      label: "Format",
      value: formatLabel,
    },
    {
      label: "Genre",
      value: primaryGenreLabel,
    },
  ];
  const relatedItems = useMemo(() => {
    const candidates = [
      payload?.relatedSeries,
      payload?.related,
      payload?.recommendations,
      payload?.series?.relatedSeries,
      payload?.series?.related,
    ]
      .flat()
      .filter(Boolean);

    return buildFigmaCatalog(candidates)
      .items.filter(
        (item) =>
          item.id !== detailItem?.id && matchesContentMode(item, contentMode),
      )
      .slice(0, 3);
  }, [contentMode, detailItem?.id, payload]);

  if (loading && !detailItem) {
    return (
      <main className={cn("min-h-screen", palette.rootBg)}>
        <FigmaChrome>
          <div className="mx-auto flex min-h-[72vh] max-w-[960px] items-center justify-center px-4 py-24">
            <div
              className={cn(
                "relative w-full overflow-hidden rounded-[34px] border p-6 text-center shadow-[0_32px_90px_rgba(0,0,0,0.34)] md:p-10",
                palette.surface,
                palette.border,
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.16),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(103,232,249,0.1),transparent_26%)]" />
              <div className="relative mx-auto mb-6 grid max-w-md grid-cols-[92px_minmax(0,1fr)] gap-4 text-left">
                <div className="h-32 animate-pulse rounded-[22px] border border-white/10 bg-white/10" />
                <div className="space-y-3 pt-2">
                  <div className="h-3 w-28 animate-pulse rounded-full bg-white/12" />
                  <div className="h-8 w-full animate-pulse rounded-full bg-white/14" />
                  <div className="h-3 w-4/5 animate-pulse rounded-full bg-white/10" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
                </div>
              </div>
              <h1 className="relative mb-3 text-3xl font-black text-white">
                Preparing this story
              </h1>
              <p className="mx-auto max-w-lg text-gray-400">
                Refreshing the correct catalog for this mode.
              </p>
            </div>
          </div>
        </FigmaChrome>
      </main>
    );
  }

  if (error === "ADULT_GATED") {
    return (
      <ModeBlockedState
        palette={palette}
        title="Mature Title"
        description="This story is in the mature catalog. Turn on adult mode after signing in to open it."
        ctaLabel="Turn On Adult Mode"
        onCta={handleAdultToggle}
        onBack={() => router.back()}
      />
    );
  }

  if (error === "MODE_MISMATCH" && isAdultMode) {
    return (
      <ModeBlockedState
        palette={palette}
        title="Switch to Normal Mode"
        description="This story is in the normal catalog. Switch back to normal mode to keep reading."
        ctaLabel="Back to Normal Mode"
        onCta={handleAdultToggle}
        onBack={() => router.back()}
      />
    );
  }

  if (!detailItem) {
    return (
      <main className={cn("min-h-screen", palette.rootBg)}>
        <FigmaChrome>
          <div className="mx-auto flex min-h-[72vh] max-w-[960px] items-center justify-center px-4 py-24">
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
          </div>
        </FigmaChrome>
      </main>
    );
  }

  if (
    detailItem &&
    !canAccessInContentMode(detailItem, contentMode) &&
    isAdultContent(detailItem)
  ) {
    return (
      <ModeBlockedState
        palette={palette}
        title="Mature Title"
        description="This story is in the mature catalog. Turn on adult mode after signing in to open it."
        ctaLabel="Turn On Adult Mode"
        onCta={handleAdultToggle}
        onBack={() => router.back()}
      />
    );
  }

  if (
    detailItem &&
    !canAccessInContentMode(detailItem, contentMode) &&
    !isAdultContent(detailItem)
  ) {
    return (
      <ModeBlockedState
        palette={palette}
        title="Switch to Normal Mode"
        description="This story is in the normal catalog. Switch back to normal mode to keep reading."
        ctaLabel="Back to Normal Mode"
        onCta={handleAdultToggle}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <main className={cn("min-h-screen", palette.rootBg)}>
      <FigmaChrome>
        <section className="relative w-full overflow-hidden bg-black">
          <div
            aria-hidden="true"
            role="presentation"
            className="absolute inset-0 overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-24 blur-2xl"
              style={{
                backgroundImage: `url("${coverImageUrl}")`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
                transform: "scale(1.06)",
                transformOrigin: "center",
              }}
            />
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-t from-5% to-transparent",
                palette.heroOverlay,
              )}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,79,154,0.2),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(103,232,249,0.12),transparent_24%),linear-gradient(180deg,rgba(5,6,10,0.18)_0%,rgba(5,6,10,0.86)_72%,#05060a_100%)]" />
          </div>

          <div className="relative mx-auto max-w-[1240px] px-4 pb-8 pt-10 md:px-8 md:pb-12 md:pt-16">
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-end lg:gap-10">
              <img
                src={coverImageUrl}
                alt={coverAltText}
                className="aspect-[3/4] w-40 max-w-full shrink-0 rounded-[26px] object-cover shadow-[0_30px_90px_rgba(0,0,0,0.48)] ring-2 ring-white/10 sm:w-52 lg:w-full"
              />

              <div className="min-w-0 rounded-[30px] border border-white/10 bg-black/28 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
                <div className="mb-4 flex flex-wrap gap-2">
                  {detailItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        storefrontBadgeClass,
                        "px-3 py-1.5 text-[10px] md:text-xs",
                        palette.primarySoft,
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h1 className="mb-3 max-w-[12ch] bg-gradient-to-r from-white via-white to-gray-300 bg-clip-text text-[2.3rem] font-black leading-[0.9] tracking-tight text-transparent drop-shadow-sm sm:text-[3rem] md:text-[4.6rem]">
                  {detailItem.title}
                </h1>
                <div className="mb-4 text-sm font-medium text-gray-300 md:text-lg">
                  {creatorHref ? (
                    <Link
                      href={creatorHref}
                      data-testid="series-creator-link"
                      className="transition-colors hover:text-white"
                    >
                      {creatorLabel}
                    </Link>
                  ) : (
                    <p>{creatorLabel}</p>
                  )}
                </div>
                <p className="mb-5 max-w-[44rem] text-sm leading-7 text-gray-200/78 md:text-base">
                  {detailItem.description}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold text-gray-400 md:gap-5 md:text-sm">
                  <div
                    data-testid="series-hero-metadata"
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 md:text-sm"
                  >
                    {heroMetadata.creatorText ? (
                      <span>{heroMetadata.creatorText}</span>
                    ) : null}
                    {heroMetadata.separator ? (
                      <span aria-hidden="true" className="text-gray-500">
                        {heroMetadata.separator}
                      </span>
                    ) : null}
                    {heroMetadata.latestText ? (
                      <span>{heroMetadata.latestText}</span>
                    ) : null}
                  </div>
                  <span className={cn(storefrontBadgeClass, "gap-1.5 text-yellow-300")}>
                    <Star className="h-4 w-4 fill-current" />
                    {detailItem.rating} Rating
                  </span>
                  <span className={cn(storefrontBadgeClass, "gap-1.5")}>
                    <Eye className="h-4 w-4" />
                    {detailItem.viewsText} Views
                  </span>
                  <span className={cn(storefrontBadgeClass, "gap-1.5")}>
                    <Heart className="h-4 w-4" />
                    {detailItem.likesText} Likes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
          <section aria-label="Quick Stats" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.045)] px-4 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
                  {stat.label}
                </p>
                <p className="mt-3 truncate text-base font-black text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </section>

          <section aria-label="Primary actions" className="mt-5 rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.065)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm leading-6 text-white/62">
                {chapterItems.length > 0
                  ? `${chapterItems.length} ${chapterPrefix.toLowerCase()} ready in this run.`
                  : `${chapterPrefix} will open on this shelf.`}
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href={detailItem.readHref}
                  data-testid="series-primary-action"
                  className={cn(
                    storefrontPrimaryButtonClass,
                    "min-h-[48px] w-full justify-center sm:w-auto sm:whitespace-nowrap md:px-8",
                  )}
                >
                  <PlayCircle className="h-5 w-5" />
                  {readLabel}
                </Link>
                <button
                  type="button"
                  onClick={handleLibraryToggle}
                  aria-label={isFollowing ? "Remove from saved" : "Save series"}
                  className={cn(
                    storefrontSecondaryButtonClass,
                    "min-h-[48px] justify-center rounded-full px-5",
                  )}
                >
                  <BookmarkPlus className="h-5 w-5" />
                  <span>{isFollowing ? "Saved" : "Save Series"}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Share ${detailItem.title}`}
                  className={cn(
                    storefrontSecondaryButtonClass,
                    "h-12 w-12 justify-center rounded-full p-0",
                  )}
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div
              className={cn(
                storefrontInfoCardClass,
                "rounded-[28px] p-5 md:p-6",
              )}
            >
              <StorefrontSectionHeading
                eyebrow="About"
                title="Synopsis"
                className="space-y-0"
              />
              <p className="mt-4 text-sm leading-7 text-gray-300 md:text-base">
                {detailItem.description}
              </p>
            </div>

            <div
              className={cn(
                storefrontInfoCardClass,
                "rounded-[28px] p-4 md:p-6",
              )}
            >
              <StorefrontSectionHeading
                eyebrow="Read"
                title={`${chapterPrefix} (${chapterItems.length})`}
                description={
                  chapterItems.length > 0
                    ? "Open a ready installment or unlock the next part."
                    : `${chapterPrefix} will appear here when this story opens.`
                }
                className="mb-5 space-y-0 border-b border-white/10 pb-4"
              />

              <div className="space-y-3">
                {chapterItems.length === 0 ? (
                  <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.035)_100%)] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)] md:p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.14),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(103,232,249,0.1),transparent_24%)]" />
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/46">
                          {chapterPrefix} shelf
                        </p>
                        <h3 className="mt-2 text-xl font-black text-white">
                          Release window pending
                        </h3>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                          {chapterPrefix} will appear here when this story opens.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLibraryToggle}
                        className={cn(
                          storefrontSecondaryButtonClass,
                          "min-h-[46px] rounded-full px-5 text-sm font-bold",
                        )}
                      >
                        <BookmarkPlus className="h-4 w-4" />
                        Save Series
                      </button>
                    </div>
                  </div>
                ) : null}
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
                            {chapter.metaLabel}
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
                          storefrontSecondaryButtonClass,
                          "min-h-[44px] rounded-full px-4 py-2.5 text-sm font-bold",
                        )}
                      >
                        <Lock className="h-4 w-4" />
                        Unlock with Points
                      </button>
                    </div>
                  ) : (
                    <div
                      key={chapter.id || `${detailItem.id}-${index}`}
                      id={`episode-${chapter.id}`}
                    >
                      <Link
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
                            {chapter.metaLabel}
                          </p>
                        </div>
                      </div>
                      {chapter.readsText ? (
                        <div className="text-left text-xs font-semibold text-gray-400 transition-colors group-hover:text-white sm:text-right md:text-sm">
                          <div>{chapter.readsText}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">
                            Reads
                          </div>
                        </div>
                      ) : null}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {relatedItems.length > 0 ? (
            <section className="mt-8">
              <StorefrontSectionHeading
                eyebrow="Keep Going"
                title="Related Stories"
                description="More filtered titles from the same shelf."
              />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {relatedItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.detailHref}
                    className="group overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.045)] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition-all hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <div
                      aria-hidden="true"
                      role="presentation"
                      className="aspect-[16/9] rounded-[20px] bg-cover bg-center opacity-82 transition-transform duration-500 group-hover:scale-[1.02]"
                      style={{ backgroundImage: `url("${item.coverUrl}")` }}
                    />
                    <div className="p-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">
                        {getSeriesFormatLabel(item)}
                      </p>
                      <h3 className="mt-2 line-clamp-2 text-base font-black text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm text-white/58">
                        {item.tags?.[0] || "Story"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
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
        checkoutEnabled={siteConfig.monetization.checkoutEnabled === true}
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
    </main>
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
