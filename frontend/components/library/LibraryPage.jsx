"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Rail from "../home/Rail";
import Skeleton from "../common/Skeleton";
import SurfacePanel from "../common/SurfacePanel";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import {
  storefrontChipClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import { trackEvent } from "../../lib/trackEvent";
import { useProgressStore } from "../../store/useProgressStore";
import { apiGet } from "../../lib/apiClient";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { useRewardsStore } from "../../store/useRewardsStore";
import { useBookmarkStore } from "../../store/useBookmarkStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { parallelRequests2 } from "../../lib/parallelRequests";
import { getLibraryReturnCandidates } from "../../lib/homeMerchandising";
import { resolveDisplayImageUrl } from "../../lib/fallbackImage";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { normalizeReadingPercent } from "../../lib/readingPercent";
import { openAuthPrompt } from "../../lib/openAuthPrompt";
import { StorefrontPage } from "../storefront/StorefrontScaffold";

function PanelLoadingSkeleton({ rows = 3 }) {
  return (
    <SurfacePanel
      className="space-y-3"
      appearance="dark"
      accent="blue"
      tone="muted"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={`panel-loading-${rows}-${index}`}
          className="h-12 w-full rounded-2xl"
        />
      ))}
    </SurfacePanel>
  );
}

const CollectionManager = dynamic(() => import("./CollectionManager"), {
  loading: () => <PanelLoadingSkeleton rows={4} />,
});
const CheckInPanel = dynamic(() => import("./CheckInPanel"), {
  loading: () => <PanelLoadingSkeleton rows={3} />,
});
const MissionsPanel = dynamic(() => import("./MissionsPanel"), {
  loading: () => <PanelLoadingSkeleton rows={5} />,
});
const RewardToast = dynamic(() => import("./RewardToast"), {
  ssr: false,
});
const ActionModal = dynamic(() => import("../series/ActionModal"), {
  ssr: false,
});

function parseEpisodeNumber(value) {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();
  const explicitEpisodeMatch =
    raw.match(/e(\d+)(?!.*\d)/i) || raw.match(/episode[-_\s]?(\d+)(?!.*\d)/i);

  if (explicitEpisodeMatch) {
    return String(Number(explicitEpisodeMatch[1]));
  }

  const matches = [...raw.matchAll(/(\d+)/g)];
  if (matches.length === 0) {
    return "";
  }

  return String(Number(matches[matches.length - 1][1]));
}

function formatEpisodeSubtitle(prefix, episodeId) {
  const number = parseEpisodeNumber(episodeId);
  return `${prefix} Ep ${number || "?"}`;
}

function formatLibraryStoryFormat(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "novel") {
    return "Novel";
  }
  if (normalized === "interactive") {
    return "Interactive";
  }
  return "Comic";
}

function getLibraryStoryHook(series) {
  return (
    series?.shortDescription ||
    series?.description ||
    series?.synopsis ||
    series?.status ||
    "Ready to open tonight."
  );
}

function toTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatReadingPercentLabel(value) {
  const normalized = normalizeReadingPercent(value);
  if (normalized <= 0) {
    return "";
  }

  return `${Math.round(normalized * 100)}% read`;
}

function formatRelativeLibraryTime(value) {
  const timestamp = toTimestamp(value);
  if (!timestamp) {
    return "";
  }

  const deltaMs = Date.now() - timestamp;
  const dayMs = 24 * 60 * 60 * 1000;
  const dayDelta = Math.floor(deltaMs / dayMs);

  if (dayDelta <= 0) {
    return "Opened today";
  }
  if (dayDelta === 1) {
    return "Opened yesterday";
  }
  if (dayDelta < 7) {
    return `Opened ${dayDelta} days ago`;
  }

  return `Opened ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp))}`;
}

function formatBookmarkCountLabel(value) {
  const count = Number(value) || 0;
  if (count <= 0) {
    return "";
  }

  return `${count} bookmark${count === 1 ? "" : "s"}`;
}

function joinMetaParts(parts) {
  return parts.filter(Boolean).join(" / ");
}

function getReadingState({
  progressPercent,
  hasProgress = false,
  hasRecent = false,
  isSaved = false,
}) {
  const normalized = normalizeReadingPercent(progressPercent);

  if ((hasProgress || hasRecent) && normalized >= 0.98) {
    return { label: "Read", badge: "Read" };
  }

  if (hasProgress || hasRecent) {
    return { label: "Reading", badge: "Reading" };
  }

  if (isSaved) {
    return { label: "Unread", badge: "Unread" };
  }

  return { label: "Unread", badge: "" };
}

function LibraryOverviewCard({ label, title, body }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_40px_rgba(8,6,20,0.22)]">
      <p className="text-xs font-semibold normal-case tracking-[0.01em] text-white/56">
        {label}
      </p>
      <p className="mt-2 font-display text-[1.2rem] font-semibold tracking-[-0.04em] text-white">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/64">{body}</p>
    </div>
  );
}

export default function LibraryPage({
  initialSignedIn = false,
  initialAdultMode = false,
}) {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const { hydrated: adultHydrated, contentMode } = useAdultGateStore();
  const { bySeriesId, loadProgress } = useProgressStore();
  const { bookmarksBySeries } = useBookmarkStore();
  const { followedSeriesIds, loadFollowed } = useFollowStore();
  const {
    rewards,
    missions,
    loadRewards,
    checkIn,
    makeUp,
    loadMissions,
    claimMission,
  } = useRewardsStore();
  const { topup } = useWalletStore();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const [toastMessage, setToastMessage] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [checkinWorking, setCheckinWorking] = useState(false);
  const [makeupModal, setMakeupModal] = useState(null);
  const [seriesList, setSeriesList] = useState([]);
  const [seriesResponse, setSeriesResponse] = useState(null);
  const [homepageSlots, setHomepageSlots] = useState([]);
  const [homepageSlotsResponse, setHomepageSlotsResponse] = useState(null);
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [initialLoading, setInitialLoading] = useState(initialSignedIn);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const viewerSignedIn = hydrated && isSignedIn;
  const adultFlag =
    adultHydrated && contentMode === "adult"
      ? "1"
      : initialAdultMode
        ? "1"
        : "0";
  const showStale = useStaleNotice(seriesResponse);
  const showHomepageSlotsStale = useStaleNotice(homepageSlotsResponse);
  const { shouldRetry } = useRetryPolicy();
  const openAuthPrompt = useCallback(() => {
    window.dispatchEvent(new CustomEvent("auth:open"));
  }, []);
  const navigateToHref = useCallback(
    (href, options = {}) => {
      if (!href) {
        return;
      }

      const commitNavigation = () => {
        if (options.documentNavigation && typeof window !== "undefined") {
          window.location.assign(href);
          return;
        }

        router.push(href);
      };

      if (typeof window !== "undefined") {
        window.setTimeout(commitNavigation, 0);
        return;
      }

      if (options.documentNavigation && typeof window !== "undefined") {
        window.location.assign(href);
      } else {
        router.push(href);
      }
    },
    [router],
  );
  const scrollToSection = useCallback((id) => {
    if (typeof document === "undefined") {
      return;
    }
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const seriesById = useMemo(
    () => new Map(seriesList.map((series) => [series.id, series])),
    [seriesList],
  );
  const followedSet = useMemo(
    () => new Set(followedSeriesIds),
    [followedSeriesIds],
  );
  const progressEntries = useMemo(
    () =>
      Object.entries(bySeriesId).sort(
        ([, left], [, right]) =>
          toTimestamp(right?.updatedAt) - toTimestamp(left?.updatedAt),
      ),
    [bySeriesId],
  );

  const continueRailItems = useMemo(
    () =>
      progressEntries
        .map(([seriesId, progress]) => {
          const series = seriesById.get(seriesId);
          if (!series || !progress?.lastEpisodeId) {
            return null;
          }
          const progressPercent = normalizeReadingPercent(progress?.percent);
          const readingState = getReadingState({
            progressPercent,
            hasProgress: true,
          });
          return {
            id: `continue-${seriesId}-${progress.lastEpisodeId}`,
            seriesId,
            episodeId: progress.lastEpisodeId,
            title: series.title,
            subtitle: formatEpisodeSubtitle("Continue", progress.lastEpisodeId),
            coverTone: series.coverTone,
            coverUrl: series.coverUrl,
            genres: Array.isArray(series?.genres) ? series.genres : [],
            seriesType: series?.type || "",
            progressPercent,
            statusLabel: formatRelativeLibraryTime(progress.updatedAt),
            badge: readingState.badge,
            isAdult: Boolean(series.adult),
            updatedAt: toTimestamp(progress.updatedAt),
          };
        })
        .filter(Boolean),
    [progressEntries, seriesById],
  );

  const buildLibrarySeriesHref = useCallback(
    (seriesId, entryPoint = "LIBRARY_SHELF", campaignId = "library_shelf") =>
      buildPathWithAttribution(`/series/${seriesId}`, {
        entryPoint,
        campaignId,
        sourcePath: "/library",
        sourceSeriesId: seriesId,
        returnTo: `/series/${seriesId}`,
      }),
    [],
  );

  const buildLibraryReadHref = useCallback(
    (
      seriesId,
      episodeId,
      entryPoint = "LIBRARY_RESUME",
      campaignId = "library_resume",
    ) =>
      buildPathWithAttribution(`/read/${seriesId}/${episodeId}`, {
        entryPoint,
        campaignId,
        sourcePath: "/library",
        sourceSeriesId: seriesId,
        sourceEpisodeId: episodeId,
        returnTo: `/read/${seriesId}/${episodeId}`,
      }),
    [],
  );

  const historyRail = useMemo(
    () =>
      historyItems
        .map((entry) => {
          const series = seriesById.get(entry.seriesId);
          if (!series || !entry?.episodeId) {
            return null;
          }
          const currentProgress = bySeriesId[entry.seriesId];
          const progressPercent = normalizeReadingPercent(
            currentProgress?.percent,
          );
          const readingState = getReadingState({
            progressPercent,
            hasProgress: Boolean(currentProgress?.lastEpisodeId),
            hasRecent: true,
          });
          return {
            id: `history-${entry.id || `${entry.seriesId}-${entry.episodeId}`}`,
            seriesId: entry.seriesId,
            episodeId: entry.episodeId,
            title: series.title,
            subtitle: formatRelativeLibraryTime(entry.createdAt),
            coverTone: series.coverTone,
            coverUrl: series.coverUrl,
            genres: Array.isArray(series?.genres) ? series.genres : [],
            seriesType: series?.type || "",
            progressPercent,
            statusLabel: formatEpisodeSubtitle("Last read", entry.episodeId),
            badge: readingState.badge,
            isAdult: Boolean(series.adult),
            updatedAt: toTimestamp(entry.createdAt),
          };
        })
        .filter(Boolean),
    [bySeriesId, historyItems, seriesById],
  );
  const historySeriesIds = useMemo(
    () => new Set(historyItems.map((entry) => entry?.seriesId).filter(Boolean)),
    [historyItems],
  );

  useEffect(() => {
    trackEvent("view_library", {});
  }, []);

  useEffect(() => {
    setCommerceNotice(
      getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/library")),
    );
  }, []);

  useEffect(() => {
    if (viewerSignedIn) {
      loadProgress();
      loadHistory();
      loadRewards();
      loadMissions();
      loadFollowed();
    }
  }, [
    viewerSignedIn,
    loadHistory,
    loadFollowed,
    loadMissions,
    loadProgress,
    loadRewards,
  ]);

  useEffect(() => {
    parallelRequests2(
      () => apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }),
      () =>
        apiGet(`/api/recommendations/homepage?adult=${adultFlag}`, {
          cacheMs: 60000,
        }),
    ).then(([seriesCatalogResponse, storefrontSlotsResponse]) => {
      setSeriesResponse(seriesCatalogResponse);
      if (seriesCatalogResponse.ok) {
        setSeriesList(seriesCatalogResponse.data?.series || []);
        if (seriesCatalogResponse.stale) {
          apiGet(`/api/series?adult=${adultFlag}`, {
            cacheMs: 30000,
            bust: true,
            dedupeMs: 0,
          }).then((freshResponse) => {
            setSeriesResponse(freshResponse);
            if (freshResponse.ok) {
              setSeriesList(freshResponse.data?.series || []);
            }
          });
        }
      } else if (
        seriesCatalogResponse.status === 0 ||
        seriesCatalogResponse.status >= 500
      ) {
        if (shouldRetry(`library_series_${adultFlag}`)) {
          setTimeout(() => {
            apiGet(`/api/series?adult=${adultFlag}`, {
              cacheMs: 30000,
              bust: true,
            }).then((retryResponse) => {
              setSeriesResponse(retryResponse);
              if (retryResponse.ok) {
                setSeriesList(retryResponse.data?.series || []);
              }
            });
          }, 600);
        }
      }

      setHomepageSlotsResponse(storefrontSlotsResponse);
      if (storefrontSlotsResponse.ok) {
        setHomepageSlots(storefrontSlotsResponse.data?.slots || []);
        if (storefrontSlotsResponse.stale) {
          apiGet(`/api/recommendations/homepage?adult=${adultFlag}`, {
            cacheMs: 60000,
            bust: true,
            dedupeMs: 0,
          }).then((freshResponse) => {
            setHomepageSlotsResponse(freshResponse);
            if (freshResponse.ok) {
              setHomepageSlots(freshResponse.data?.slots || []);
            }
          });
        }
      } else {
        setHomepageSlots([]);
      }

      setInitialLoading(false);
    });
  }, [adultFlag, shouldRetry]);

  const handleCheckIn = async () => {
    setCheckinWorking(true);
    const response = await checkIn();
    if (response.ok) {
      const rewardPts = response.data?.rewardPts ?? rewards?.todayReward ?? 0;
      setToastMessage(`+${rewardPts} points`);
    } else if (response.error === "ALREADY_CHECKED_IN") {
      setToastMessage("Already checked in today.");
    } else {
      setToastMessage("Check-in didn't go through.");
    }
    setCheckinWorking(false);
  };

  const handleMakeUp = async () => {
    setCheckinWorking(true);
    const response = await makeUp();
    if (response.ok) {
      setToastMessage("Streak fixed.");
    } else if (response.status === 402) {
      setMakeupModal({
        type: "SHORTFALL",
        title: "Not enough points",
        description: "You do not have enough points to make up today.",
        shortfallPts: response.shortfallPts || 0,
      });
    } else if (response.error === "MAKEUP_USED") {
      setToastMessage("Streak fix already used today.");
    } else {
      setToastMessage("Couldn't fix the streak.");
    }
    setCheckinWorking(false);
  };

  const handleClaim = async (missionId) => {
    setWorkingId(missionId);
    const response = await claimMission(missionId);
    if (response.ok) {
      const reward = [...missions.daily, ...missions.weekly].find(
        (mission) => mission.id === missionId,
      )?.reward;
      setToastMessage(`+${reward || 0} points`);
    } else if (response.error === "MISSION_ALREADY_CLAIMED") {
      setToastMessage("Already claimed.");
    } else if (response.error === "MISSION_NOT_COMPLETE") {
      setToastMessage("Finish it first.");
    } else {
      setToastMessage("Couldn't claim that.");
    }
    setWorkingId(null);
  };

  const visibleLibraryItems = useMemo(() => {
    const candidateSeriesIds = new Set();

    Object.entries(bookmarksBySeries || {}).forEach(([seriesId, entries]) => {
      if (Array.isArray(entries) && entries.length > 0) {
        candidateSeriesIds.add(seriesId);
      }
    });

    followedSeriesIds.forEach((seriesId) => candidateSeriesIds.add(seriesId));
    progressEntries.forEach(([seriesId]) => candidateSeriesIds.add(seriesId));

    return Array.from(candidateSeriesIds)
      .map((seriesId) => {
        const series = seriesById.get(seriesId);
        if (!series) {
          return null;
        }

        const bookmarks = Array.isArray(bookmarksBySeries?.[seriesId])
          ? bookmarksBySeries[seriesId]
          : [];
        const progress = bySeriesId[seriesId];
        const isFollowed = followedSet.has(seriesId);
        const latestBookmark = bookmarks[0];
        const bookmarkCount = bookmarks.length;
        const progressPercent = normalizeReadingPercent(progress?.percent);
        const readingState = getReadingState({
          progressPercent,
          hasProgress: Boolean(progress?.lastEpisodeId),
          hasRecent: historySeriesIds.has(seriesId),
          isSaved: isFollowed || bookmarkCount > 0,
        });

        let subtitle = readingState.label;
        if (progress?.lastEpisodeId) {
          subtitle = readingState.label;
        }

        const latestShelfTouch = Math.max(
          toTimestamp(progress?.updatedAt),
          toTimestamp(latestBookmark?.createdAt),
        );
        const detailItems = [];
        if (readingState.label) {
          detailItems.push(readingState.label);
        }
        if (progress?.lastEpisodeId) {
          detailItems.push(
            formatEpisodeSubtitle(
              progressPercent >= 0.98 ? "Read" : "Resume",
              progress.lastEpisodeId,
            ),
          );
        } else if (historySeriesIds.has(seriesId)) {
          detailItems.push("Opened recently");
        } else if (latestBookmark?.label) {
          detailItems.push(latestBookmark.label);
        }
        if (!progress?.lastEpisodeId && bookmarkCount > 0) {
          detailItems.push(formatBookmarkCountLabel(bookmarkCount));
        }
        if (
          !progress?.lastEpisodeId &&
          !historySeriesIds.has(seriesId) &&
          !latestBookmark?.label &&
          series.status
        ) {
          detailItems.push(series.status);
        }
        if (isFollowed) {
          detailItems.push("Saved");
        }
        if (latestShelfTouch) {
          detailItems.push(formatRelativeLibraryTime(latestShelfTouch));
        }

        return {
          id: `library-${seriesId}`,
          seriesId,
          title: series.title,
          subtitle,
          coverTone: series.coverTone,
          coverUrl: series.coverUrl,
          genres: Array.isArray(series?.genres) ? series.genres : [],
          seriesType: series?.type || "",
          progressPercent,
          statusLabel: joinMetaParts(detailItems),
          badge: readingState.badge,
          isAdult: Boolean(series.adult),
          updatedAt: latestShelfTouch,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (right.updatedAt !== left.updatedAt) {
          return right.updatedAt - left.updatedAt;
        }
        return left.title.localeCompare(right.title);
      });
  }, [
    bookmarksBySeries,
    bySeriesId,
    followedSeriesIds,
    followedSet,
    historySeriesIds,
    progressEntries,
    seriesById,
  ]);

  const bookmarkCountTotal = useMemo(
    () =>
      Object.values(bookmarksBySeries || {}).reduce(
        (total, entries) =>
          total + (Array.isArray(entries) ? entries.length : 0),
        0,
      ),
    [bookmarksBySeries],
  );

  const recommendedItems = useMemo(
    () =>
      getLibraryReturnCandidates(seriesList, {
        homepageSlots,
        excludeSeriesIds: visibleLibraryItems.map((item) => item.seriesId),
        limit: 8,
      }).map(({ series, sourceSlot, sourceLabel, entryPoint, campaignId }) => ({
        id: series.id,
        seriesId: series.id,
        title: series.title,
        eyebrow: sourceLabel || "",
        subtitle:
          sourceLabel ||
          series.genres?.slice(0, 2).join(" | ") ||
          series.badge ||
          series.status,
        formatLabel: formatLibraryStoryFormat(series.type),
        genreLabel:
          series.genres?.slice(0, 2).join(" / ") ||
          series.badge ||
          "Story pick",
        hook: getLibraryStoryHook(series),
        coverTone: series.coverTone,
        coverUrl: series.coverUrl,
        badge: series.badge,
        seriesType: series.type || "",
        isAdult: Boolean(series.adult),
        sourceSlot,
        entryPoint,
        campaignId,
      })),
    [homepageSlots, seriesList, visibleLibraryItems],
  );
  const recommendedRailReason = useMemo(() => {
    if (!viewerSignedIn) {
      return "";
    }
    if (recommendedItems.some((item) => item.sourceSlot === "library-return")) {
      return "Staff pick to resume";
    }
    if (recommendedItems.some((item) => Boolean(item.sourceSlot))) {
      return "Fresh from the front page.";
    }
    return "";
  }, [recommendedItems, viewerSignedIn]);
  const hasCuratedLibraryEntry = useMemo(
    () => recommendedItems.some((item) => Boolean(item.sourceSlot)),
    [recommendedItems],
  );
  const showLibraryStale = showStale || showHomepageSlotsStale;
  const resumeSpotlight = viewerSignedIn
    ? continueRailItems[0] || historyRail[0] || null
    : null;
  const resumeSpotlightReadHref =
    resumeSpotlight?.seriesId && resumeSpotlight?.episodeId
      ? buildLibraryReadHref(
          resumeSpotlight.seriesId,
          resumeSpotlight.episodeId,
          "LIBRARY_RESUME_SPOTLIGHT",
          "resume_spotlight",
        )
      : "";
  const resumeSpotlightProgressLabel = formatReadingPercentLabel(
    resumeSpotlight?.progressPercent,
  );
  const resumeSpotlightMeta = joinMetaParts([
    resumeSpotlight?.subtitle,
    resumeSpotlightProgressLabel,
    resumeSpotlight?.statusLabel,
  ]);
  const signedOutRecommendedStarts = useMemo(
    () => {
      if (recommendedItems.length > 0) {
        return recommendedItems.slice(0, 6);
      }

      return seriesList.slice(0, 6).map((series) => ({
        id: series.id,
        seriesId: series.id,
        title: series.title,
        eyebrow: series.type === "novel" ? "Novel pick" : "Comic pick",
        subtitle:
          series.genres?.slice(0, 2).join(" | ") ||
          series.badge ||
          series.status ||
          "Ready to open tonight.",
        formatLabel: formatLibraryStoryFormat(series.type),
        genreLabel:
          series.genres?.slice(0, 2).join(" / ") ||
          series.badge ||
          "Story pick",
        hook: getLibraryStoryHook(series),
        coverUrl: series.coverUrl,
        badge: series.badge,
        seriesType: series.type || "",
        isAdult: Boolean(series.adult),
        entryPoint: "LIBRARY_SIGNED_OUT_FALLBACK",
        campaignId: "library_signed_out_fallback",
      }));
    },
    [recommendedItems, seriesList],
  );
  const hasSignedOutStoryCards = signedOutRecommendedStarts.length > 0;
  const signedOutFallbackCopy = "Choose a channel while your shelf gets started.";
  const signedOutRecommendationTitle = hasSignedOutStoryCards
    ? signedOutFallbackCopy
    : "Comics, novels, and rankings are ready to browse.";
  const primaryButtonClass = storefrontPrimaryButtonClass;
  const secondaryButtonClass = storefrontSecondaryButtonClass;
  const signedInHeroDescription = "Your shelf follows the stories you open.";
  const libraryDeskTitle = "My Shelf";
  const overviewCards = viewerSignedIn
    ? [
        {
          label: "Keep reading",
          title: resumeSpotlight?.title || "Pick up a story",
          body:
            resumeSpotlightMeta ||
            "When you open more stories, your active read will show up here.",
        },
        {
          label: "Saved for later",
          title:
            visibleLibraryItems.length > 0 ? "Saved and stacked" : "Ready to build",
          body:
            visibleLibraryItems.length > 0
              ? `${visibleLibraryItems.length} saved titles are ready for tonight.`
              : "Save a few titles and this shelf turns into your personal queue.",
        },
        {
          label: "Recently opened",
          title:
            bookmarkCountTotal > 0
              ? `${bookmarkCountTotal} markers ready`
              : "Scene pins ready",
          body:
            bookmarkCountTotal > 0
              ? "Jump back to exact scenes and panels from your saved markers."
              : "Bookmarks appear here once you start pinning moments to return to.",
        },
      ]
    : [
        {
          label: "Keep reading",
          title: "Open a story",
          body: "Open a story and this shelf will remember your place.",
        },
        {
          label: "Saved for later",
          title: "Pick a channel",
          body: "Comics, novels, and rankings are ready when you are.",
        },
        {
          label: "Recently opened",
          title: "Fresh updates",
          body: "Open a story and your recent reads will start building here.",
        },
      ];

  return (
    <StorefrontPage accentClass="from-[rgba(103,232,249,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(255,79,154,0.12)]">
      <div className="flex flex-col gap-8">
        <section className="space-y-5">
          <SurfacePanel
            appearance="dark"
            accent="cyan"
            tone="highlight"
            className="overflow-hidden p-0"
          >
              <div className="relative px-5 py-5 sm:px-6 sm:py-6">
                <div className="max-w-4xl">
                <h1 className="mt-4 max-w-4xl font-display text-[2.35rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-[2.9rem] xl:text-[4rem]">
                  {libraryDeskTitle}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-[1.72] text-white/70 sm:text-[15px] sm:leading-[1.78]">
                  {signedInHeroDescription}
                </p>
                <div className="mt-6 flex flex-wrap gap-3 [&>a]:min-h-11 [&>a]:px-4 sm:[&>a]:px-5 [&>button]:min-h-11 [&>button]:px-4 sm:[&>button]:px-5">
                  {resumeSpotlightReadHref ? (
                    <a
                      href={resumeSpotlightReadHref}
                      role="button"
                      className={primaryButtonClass}
                    >
                      Continue Reading
                    </a>
                  ) : viewerSignedIn && visibleLibraryItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => scrollToSection("saved-series")}
                      className={primaryButtonClass}
                    >
                      Saved Series
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuthPrompt("/library")}
                      data-testid="library-entry-cta"
                      className={primaryButtonClass}
                    >
                      Sign in
                    </button>
                  )}
                  {viewerSignedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (visibleLibraryItems.length > 0) {
                          scrollToSection("saved-series");
                          return;
                        }
                        setShowCollectionManager((value) => !value);
                      }}
                      className={secondaryButtonClass}
                    >
                      {visibleLibraryItems.length > 0
                        ? "Open Library"
                        : showCollectionManager
                          ? "Hide collections"
                          : "Collections"}
                    </button>
                  ) : (
                    <Link href="/comics" className={secondaryButtonClass}>
                      Browse free chapters
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel
            appearance="dark"
            accent="cyan"
            tone="muted"
            className="space-y-5"
          >
            <div className="grid gap-3 md:grid-cols-3">
              {overviewCards.map((card) => (
                <LibraryOverviewCard key={card.label} {...card} />
              ))}
            </div>
          </SurfacePanel>
        </section>

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {initialLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-44 w-full rounded-[28px]" />
            <Skeleton className="h-48 w-full rounded-[28px]" />
            <Skeleton className="h-64 w-full rounded-[28px]" />
          </div>
        ) : (
          <>
            {!viewerSignedIn ? (
              <SurfacePanel
                className="space-y-4"
                appearance="dark"
                accent="blue"
                tone="muted"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black tracking-[-0.03em] text-white">
                    Start a new read
                  </h2>
                  <p className="text-sm leading-6 text-white/66">
                    {signedOutRecommendationTitle}
                  </p>
                </div>
                {hasSignedOutStoryCards ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {signedOutRecommendedStarts.map((item) => (
                      <button
                        key={`signed-out-library-${item.id}`}
                        type="button"
                        onClick={() =>
                          router.push(
                            buildLibrarySeriesHref(
                              item.seriesId,
                              item.entryPoint || "LIBRARY_SIGNED_OUT_RECO",
                              item.campaignId || "library_signed_out_reco",
                            ),
                          )
                        }
                        className={`${storefrontInfoCardClass} group grid min-h-32 grid-cols-[76px_minmax(0,1fr)] gap-3 p-3 text-left text-white transition-all duration-200 ease-out hover:-translate-y-1 hover:border-white/16 hover:bg-white/[0.075]`}
                      >
                        <span className="relative block aspect-[3/4] overflow-hidden rounded-[18px] border border-white/10 bg-white/5">
                          <img
                            src={resolveDisplayImageUrl(item.coverUrl, {
                              kind: "cover",
                              adult: item.isAdult,
                            })}
                            alt={`${item.title} library pick cover`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.52)_100%)]" />
                          <span className="absolute bottom-2 left-2 rounded-full border border-white/12 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/80 backdrop-blur">
                            {item.formatLabel || "Comic"}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-black uppercase tracking-[0.2em] text-white/60">
                            {item.genreLabel || item.eyebrow || "Reader pick"}
                          </span>
                          <span className="mt-2 line-clamp-2 block text-base font-black uppercase tracking-[-0.03em] text-white">
                            {item.title}
                          </span>
                          <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-6 text-white/70">
                            {item.hook ||
                              item.subtitle ||
                              "Open the series page and start reading."}
                          </span>
                          <span className={`${storefrontChipClass} mt-3 inline-flex min-h-11 items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-white/75`}>
                            Start reading
                            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={`${storefrontInfoCardClass} p-4`}>
                    <p className="text-sm font-semibold leading-6 text-white/72">
                      {signedOutFallbackCopy}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href="/comics" className={secondaryButtonClass}>
                        Comics
                      </Link>
                      <Link href="/novels" className={secondaryButtonClass}>
                        Novels
                      </Link>
                      <Link href="/rankings" className={secondaryButtonClass}>
                        Rankings
                      </Link>
                    </div>
                  </div>
                )}
              </SurfacePanel>
            ) : null}

            <div className="grid gap-6">
              {continueRailItems.length > 0 ? (
                <div id="continue-reading">
                  <Rail
                    eyebrow="Continue Reading"
                    title="Continue Reading"
                    railName="continue"
                    items={continueRailItems}
                    appearance="dark"
                    showActionLabel={false}
                    coverFallbackVariant="minimal-card"
                    onItemClick={(item) => {
                      if (item.seriesId && item.episodeId) {
                        navigateToHref(
                          buildLibraryReadHref(
                            item.seriesId,
                            item.episodeId,
                            "LIBRARY_CONTINUE_RAIL",
                            "continue_rail",
                          ),
                        );
                        return;
                      }
                      if (item.seriesId) {
                        navigateToHref(
                          buildLibrarySeriesHref(
                            item.seriesId,
                            "LIBRARY_CONTINUE_RAIL",
                            "continue_rail",
                          ),
                        );
                      }
                    }}
                  />
                </div>
              ) : null}

              {viewerSignedIn && historyRail.length > 0 ? (
                <div id="recent-activity">
                  <Rail
                    eyebrow="Recent Reads"
                    title="Recent Reads"
                    railName="history"
                    items={historyRail}
                    appearance="dark"
                    showActionLabel={false}
                    coverFallbackVariant="minimal-card"
                    onItemClick={(item) => {
                      if (item.seriesId && item.episodeId) {
                        navigateToHref(
                          buildLibraryReadHref(
                            item.seriesId,
                            item.episodeId,
                            "LIBRARY_HISTORY_RAIL",
                            "history_rail",
                          ),
                        );
                        return;
                      }
                      if (item.seriesId) {
                        navigateToHref(
                          buildLibrarySeriesHref(
                            item.seriesId,
                            "LIBRARY_HISTORY_RAIL",
                            "history_rail",
                          ),
                        );
                      }
                    }}
                  />
                </div>
              ) : null}

              {viewerSignedIn && visibleLibraryItems.length > 0 ? (
                <div id="saved-series">
                  <Rail
                    eyebrow="Saved Series"
                    title="Saved Series"
                    railName="following"
                    items={visibleLibraryItems}
                    appearance="dark"
                    showActionLabel={false}
                    coverFallbackVariant="minimal-card"
                    onItemClick={(item) => {
                      if (item.seriesId) {
                        router.push(
                          buildLibrarySeriesHref(
                            item.seriesId,
                            "LIBRARY_SHELF_RAIL",
                            "library_shelf",
                          ),
                        );
                      }
                    }}
                  />
                </div>
              ) : null}

              {showCollectionManager ? (
                <SurfacePanel appearance="dark" accent="blue" tone="muted">
                  <CollectionManager
                    onClose={() => setShowCollectionManager(false)}
                  />
                </SurfacePanel>
              ) : null}

              {viewerSignedIn ? (
                <div className="grid gap-6 xl:grid-cols-2">
                  <CheckInPanel
                    rewards={rewards}
                    onCheckIn={handleCheckIn}
                    onMakeUp={handleMakeUp}
                    working={checkinWorking}
                  />
                  <MissionsPanel
                    missions={missions}
                    onClaim={handleClaim}
                    workingId={workingId}
                  />
                </div>
              ) : null}

              {recommendedItems.length > 0 ? (
                <Rail
                  eyebrow="Recommended"
                  title="Recommended"
                  railName="recommended"
                  items={recommendedItems}
                  reason={recommendedRailReason}
                  appearance="dark"
                  showActionLabel={false}
                  coverFallbackVariant="minimal-card"
                  interactionMode="button"
                  onItemClick={(item) =>
                    router.push(
                      buildLibrarySeriesHref(
                        item.id,
                        item.entryPoint || "LIBRARY_RECOMMENDED_RAIL",
                        item.campaignId || "recommended_rail",
                      ),
                    )
                  }
                />
              ) : null}
            </div>
          </>
        )}
      </div>
      <RewardToast message={toastMessage} onClose={() => setToastMessage("")} />
      <ActionModal
        open={Boolean(makeupModal)}
        type={makeupModal?.type}
        title={makeupModal?.title}
        description={makeupModal?.description}
        shortfallPts={makeupModal?.shortfallPts}
        actions={
          makeupModal
            ? [
                {
                  label: "Point packs",
                  onClick: () => {
                    router.push(
                      buildPathWithAttribution(
                        "/store",
                        {
                          entryPoint: "LIBRARY_MAKEUP",
                          offerId: "points_pack_starter",
                          sourcePath: "/library",
                          returnTo: "/library",
                        },
                        { focus: "auto" },
                      ),
                    );
                    setMakeupModal(null);
                  },
                  variant: "secondary",
                },
                {
                  label: "Top up starter pack",
                  onClick: async () => {
                    const topupResponse = await topup("starter", {
                      attribution: {
                        entryPoint: "LIBRARY_MAKEUP",
                        offerId: "points_pack_starter",
                        sourcePath: "/library",
                        returnTo: "/library",
                      },
                    });
                    if (topupResponse.ok) {
                      const retry = await makeUp();
                      if (retry.ok) {
                        setToastMessage("Streak fixed.");
                        setMakeupModal(null);
                        return;
                      }
                    }
                    setMakeupModal({
                      type: "ERROR",
                      title: "Couldn't top up",
                      description: "Couldn't restore today's streak.",
                    });
                  },
                  variant: "primary",
                },
              ]
            : null
        }
        onClose={() => setMakeupModal(null)}
      />
    </StorefrontPage>
  );
}
