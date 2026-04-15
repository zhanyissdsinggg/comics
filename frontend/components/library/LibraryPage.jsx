"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import SiteHeader from "../layout/SiteHeader";
import Rail from "../home/Rail";
import Skeleton from "../common/Skeleton";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import StorefrontPathwaysGrid from "../common/StorefrontPathwaysGrid";
import { trackEvent } from "../../lib/trackEvent";
import { useProgressStore } from "../../store/useProgressStore";
import { apiGet } from "../../lib/apiClient";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { useRewardsStore } from "../../store/useRewardsStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBookmarkStore } from "../../store/useBookmarkStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useAuthStore } from "../../store/useAuthStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { parallelRequests2 } from "../../lib/parallelRequests";
import { getLibraryReturnCandidates } from "../../lib/homeMerchandising";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { normalizeReadingPercent } from "../../lib/readingPercent";

function PanelLoadingSkeleton({ rows = 3 }) {
  return (
    <SurfacePanel className="space-y-3" appearance="light" accent="blue">
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

export default function LibraryPage({ initialSignedIn = false }) {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const { isAdultMode } = useAdultGateStore();
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
  const viewerSignedIn = hydrated ? isSignedIn : initialSignedIn;
  const showStale = useStaleNotice(seriesResponse);
  const showHomepageSlotsStale = useStaleNotice(homepageSlotsResponse);
  const { shouldRetry } = useRetryPolicy();
  const openAuthPrompt = useCallback(() => {
    window.dispatchEvent(new CustomEvent("auth:open"));
  }, []);
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
    loadProgress();
    loadHistory();
    if (viewerSignedIn) {
      loadRewards();
      loadMissions();
      loadFollowed();
    }
  }, [
    viewerSignedIn,
    loadFollowed,
    loadMissions,
    loadRewards,
    loadProgress,
    loadHistory,
  ]);

  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
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
  }, [isAdultMode, shouldRetry]);

  const handleCheckIn = async () => {
    setCheckinWorking(true);
    const response = await checkIn();
    if (response.ok) {
      const rewardPts = response.data?.rewardPts ?? rewards?.todayReward ?? 0;
      setToastMessage(`+${rewardPts} bonus points`);
    } else if (response.error === "ALREADY_CHECKED_IN") {
      setToastMessage("Already checked in today.");
    } else {
      setToastMessage("Check-in failed.");
    }
    setCheckinWorking(false);
  };

  const handleMakeUp = async () => {
    setCheckinWorking(true);
    const response = await makeUp();
    if (response.ok) {
      setToastMessage("Make-up successful");
    } else if (response.status === 402) {
      setMakeupModal({
        type: "SHORTFALL",
        title: "Not enough points",
        description: "You do not have enough points to make up today.",
        shortfallPts: response.shortfallPts || 0,
      });
    } else if (response.error === "MAKEUP_USED") {
      setToastMessage("Make-up already used today.");
    } else {
      setToastMessage("Make-up failed.");
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
      setToastMessage(`+${reward || 0} bonus points`);
    } else if (response.error === "MISSION_ALREADY_CLAIMED") {
      setToastMessage("Mission already claimed.");
    } else if (response.error === "MISSION_NOT_COMPLETE") {
      setToastMessage("Mission not complete yet.");
    } else {
      setToastMessage("Claim failed.");
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
          detailItems.push("Saved in Library");
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
        coverTone: series.coverTone,
        coverUrl: series.coverUrl,
        badge: series.badge,
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
      return "Picked for your shelf.";
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
  const hasLibrarySignals =
    continueRailItems.length > 0 ||
    historyRail.length > 0 ||
    visibleLibraryItems.length > 0;
  const resumeSpotlight = continueRailItems[0] || historyRail[0] || null;
  const resumeSpotlightReadHref =
    resumeSpotlight?.seriesId && resumeSpotlight?.episodeId
      ? buildLibraryReadHref(
          resumeSpotlight.seriesId,
          resumeSpotlight.episodeId,
          "LIBRARY_RESUME_SPOTLIGHT",
          "resume_spotlight",
        )
      : "";
  const resumeSpotlightSeriesHref = resumeSpotlight?.seriesId
    ? buildLibrarySeriesHref(
        resumeSpotlight.seriesId,
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
  const resumeSpotlightProgressWidth = Math.max(
    0,
    Math.min(
      Number(resumeSpotlight?.progressPercent || 0) <= 1
        ? Number(resumeSpotlight?.progressPercent || 0) * 100
        : Number(resumeSpotlight?.progressPercent || 0),
      100,
    ),
  );
  const libraryStats = useMemo(
    () =>
      viewerSignedIn
        ? [
            {
              label: "In Progress",
              value: continueRailItems.length.toLocaleString(),
              hint:
                continueRailItems.length > 0
                  ? formatReadingPercentLabel(
                      continueRailItems[0]?.progressPercent,
                    ) ||
                    continueRailItems[0]?.statusLabel ||
                    "Ready to resume"
                  : "Your next chapter",
            },
            {
              label: "Recent",
              value: historyRail.length.toLocaleString(),
              hint: historyRail[0]?.statusLabel || "Opened recently",
            },
            {
              label: "Saved Series",
              value: visibleLibraryItems.length.toLocaleString(),
              hint:
                bookmarkCountTotal > 0
                  ? `${formatBookmarkCountLabel(bookmarkCountTotal)} saved`
                  : "Saved titles",
            },
            {
              label: "Bookmarks",
              value: bookmarkCountTotal.toLocaleString(),
              hint:
                bookmarkCountTotal > 0 ? "Saved moments" : "No bookmarks yet",
            },
          ]
        : [
            {
              label: "On This Device",
              value:
                continueRailItems.length > 0
                  ? continueRailItems.length.toLocaleString()
                  : "Ready",
              hint:
                continueRailItems.length > 0
                  ? "Continue on this device"
                  : "Start a title and it shows up here",
            },
            {
              label: "Sign In",
              value: "Sync",
              hint: "Keep progress and saves together",
            },
          ],
    [
      bookmarkCountTotal,
      continueRailItems,
      continueRailItems.length,
      historyRail,
      historyRail.length,
      viewerSignedIn,
      visibleLibraryItems,
      visibleLibraryItems.length,
    ],
  );
  const readingSnapshotCards = useMemo(() => {
    if (!viewerSignedIn) {
      return [];
    }

    return [
      {
        id: "in-progress",
        label: "In Progress",
        value: continueRailItems.length.toLocaleString(),
        description:
          continueRailItems.length > 0
            ? joinMetaParts([
                formatReadingPercentLabel(
                  continueRailItems[0]?.progressPercent,
                ),
                continueRailItems[0]?.statusLabel,
              ]) || "Ready to resume"
            : "Your next read",
        onClick: () =>
          continueRailItems.length > 0
            ? scrollToSection("continue-reading")
            : router.push("/rankings?type=ttf&window=all"),
      },
      {
        id: "recent",
        label: "Recent",
        value: historyRail.length.toLocaleString(),
        description:
          historyRail.length > 0
            ? historyRail[0]?.statusLabel ||
              historyRail[0]?.subtitle ||
              "Opened recently"
            : "Recent reads",
        onClick: () =>
          historyRail.length > 0
            ? scrollToSection("recent-activity")
            : router.push("/search"),
      },
      {
        id: "saved-series",
        label: "Saved Series",
        value: visibleLibraryItems.length.toLocaleString(),
        description:
          visibleLibraryItems.length > 0
            ? bookmarkCountTotal > 0
              ? `${formatBookmarkCountLabel(bookmarkCountTotal)} across your shelf`
              : visibleLibraryItems[0]?.statusLabel || "Saved to your shelf"
            : "Saved titles",
        onClick: () =>
          visibleLibraryItems.length > 0
            ? scrollToSection("saved-series")
            : router.push("/rankings?type=popular&window=week"),
      },
    ];
  }, [
    bookmarkCountTotal,
    continueRailItems,
    continueRailItems.length,
    historyRail,
    historyRail.length,
    router,
    scrollToSection,
    viewerSignedIn,
    visibleLibraryItems,
    visibleLibraryItems.length,
  ]);
  const signedOutActionCards = useMemo(() => {
    const commonAccentClass =
      "border-[color:var(--gush-border)] bg-white text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]";
    const primaryAccentClass =
      "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-white";

    return [
      {
        id: "start-free",
        eyebrow: "First picks",
        title: "Start with a title.",
        description: "",
        cta: "Browse first picks",
        onClick: () => router.push("/rankings?type=ttf&window=all"),
        accentClass: primaryAccentClass,
      },
      {
        id: "sync",
        eyebrow: "Sign In",
        title: "Keep your shelf.",
        description: "Progress and recent reads.",
        cta: "Sign In",
        onClick: () => openAuthPrompt(),
        accentClass: commonAccentClass,
      },
    ];
  }, [openAuthPrompt, router]);
  const primaryButtonClass =
    "rounded-full bg-[color:var(--gush-ink-strong)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition-colors hover:bg-black/82";
  const secondaryButtonClass =
    "rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]";
  const signedInHeroDescription = viewerSignedIn
    ? hasLibrarySignals
      ? resumeSpotlightReadHref
        ? "Pick up where you left off."
        : "Recent opens and saves stay together here."
      : "Your next read and saves land here."
    : "Sign in to keep your shelf and progress together.";
  const libraryDeskTitle = viewerSignedIn
    ? resumeSpotlightReadHref
      ? "Your next chapter."
      : hasLibrarySignals
        ? "Shelf, saves, and recent reads."
        : "Start your shelf."
    : "Start a shelf.";
  const libraryDeskCopy = viewerSignedIn
    ? visibleLibraryItems.length > 0
      ? "Resume fast, open saved series, or browse next."
      : "Start with a few titles and this becomes your shelf."
    : "Open a few titles, then sign in when you want your shelf to follow you.";
  const readingSnapshotCardsPanel =
    viewerSignedIn && readingSnapshotCards.length > 0 ? (
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        {readingSnapshotCards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={card.onClick}
            className="group rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 text-left transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {card.label}
            </p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  {card.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {card.description}
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-4 flex-shrink-0 text-slate-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="gush-page-shell gush-home-shell overflow-hidden">
      <div className="gush-page-ambient h-[clamp(20rem,40vw,30rem)]" />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            eyebrow="Library"
            title={
              viewerSignedIn || hasCuratedLibraryEntry
                ? "Your shelf."
                : "Your shelf starts here."
            }
            description={signedInHeroDescription}
            secondary=""
            stats={libraryStats}
            appearance="light"
            accent="blue"
            actions={
              <>
                {resumeSpotlightReadHref ? (
                  <button
                    type="button"
                    onClick={() => router.push(resumeSpotlightReadHref)}
                    className={primaryButtonClass}
                  >
                    Continue Reading
                  </button>
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
                    onClick={() => router.push("/rankings?type=ttf&window=all")}
                    className={primaryButtonClass}
                  >
                    First picks
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!viewerSignedIn) {
                      openAuthPrompt();
                      return;
                    }
                    if (visibleLibraryItems.length > 0) {
                      scrollToSection("saved-series");
                      return;
                    }
                    setShowCollectionManager((value) => !value);
                  }}
                  className={secondaryButtonClass}
                >
                  {viewerSignedIn
                    ? visibleLibraryItems.length > 0
                      ? "Saved Series"
                      : showCollectionManager
                        ? "Hide Collections"
                        : "Collections"
                    : "Sign In"}
                </button>
              </>
            }
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Shelf
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  {libraryDeskTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {libraryDeskCopy}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {resumeSpotlightReadHref ? (
                <button
                  type="button"
                  onClick={() => router.push(resumeSpotlightReadHref)}
                  className={primaryButtonClass}
                >
                  Resume now
                </button>
              ) : viewerSignedIn && visibleLibraryItems.length > 0 ? (
                <button
                  type="button"
                  onClick={() => scrollToSection("saved-series")}
                  className={primaryButtonClass}
                >
                  Open saved series
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    viewerSignedIn
                      ? router.push("/search")
                      : router.push("/rankings?type=ttf&window=all")
                  }
                  className={primaryButtonClass}
                >
                  {viewerSignedIn ? "Browse titles" : "First picks"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!viewerSignedIn) {
                    openAuthPrompt();
                    return;
                  }
                  if (showCollectionManager || !visibleLibraryItems.length) {
                    setShowCollectionManager((value) => !value);
                    return;
                  }
                  router.push("/search");
                }}
                className={secondaryButtonClass}
              >
                {viewerSignedIn
                  ? showCollectionManager || !visibleLibraryItems.length
                    ? showCollectionManager
                      ? "Hide collections"
                      : "Collections"
                    : "Browse more"
                  : "Sign in"}
              </button>
            </div>
          </SurfacePanel>
        </section>

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {showLibraryStale ? (
          <div className="rounded-2xl border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-700">
            Showing saved data while reconnecting.
          </div>
        ) : null}

        {initialLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-44 w-full rounded-[28px]" />
            <Skeleton className="h-48 w-full rounded-[28px]" />
            <Skeleton className="h-64 w-full rounded-[28px]" />
          </div>
        ) : (
          <>
            {viewerSignedIn ? (
              hasLibrarySignals ? (
                <SurfacePanel
                  className="space-y-5"
                  appearance="light"
                  accent="blue"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] xl:items-stretch">
                    <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        {resumeSpotlightReadHref
                          ? "Continue Reading"
                          : "Your Shelf"}
                      </p>
                      <h2 className="mt-3 font-display text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.25rem]">
                        {resumeSpotlight?.title || "Your shelf."}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
                        {resumeSpotlightMeta || "Recent reads."}
                      </p>

                      {resumeSpotlightProgressWidth > 0 ? (
                        <div className="mt-5 space-y-2.5">
                          <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                            <span>
                              {resumeSpotlight?.subtitle || "Progress"}
                            </span>
                            <span>{resumeSpotlightProgressLabel}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[color:var(--gush-page-bg-muted)]">
                            <div
                              className="h-full rounded-full bg-[color:var(--gush-accent)]"
                              style={{
                                width: `${Math.round(resumeSpotlightProgressWidth)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-6 flex flex-wrap gap-2">
                        {resumeSpotlightReadHref ? (
                          <button
                            type="button"
                            onClick={() => router.push(resumeSpotlightReadHref)}
                            className={primaryButtonClass}
                          >
                            Resume now
                          </button>
                        ) : visibleLibraryItems.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => scrollToSection("saved-series")}
                            className={primaryButtonClass}
                          >
                            Saved Series
                          </button>
                        ) : !resumeSpotlightReadHref ? (
                          <button
                            type="button"
                            onClick={() =>
                              router.push("/rankings?type=ttf&window=all")
                            }
                            className={primaryButtonClass}
                          >
                            First picks
                          </button>
                        ) : null}

                        {resumeSpotlightSeriesHref ? (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(resumeSpotlightSeriesHref)
                            }
                            className={secondaryButtonClass}
                          >
                            Open series
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => router.push("/search")}
                            className={secondaryButtonClass}
                          >
                            Search
                          </button>
                        )}
                      </div>
                    </div>

                    {readingSnapshotCardsPanel}
                  </div>
                </SurfacePanel>
              ) : (
                <SurfacePanel
                  className="space-y-5"
                  appearance="light"
                  accent="blue"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] xl:items-stretch">
                    <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Your Shelf
                      </p>
                      <h2 className="mt-3 font-display text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.25rem]">
                        Your shelf.
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
                        Your next read and saves land here.
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            router.push("/rankings?type=ttf&window=all")
                          }
                          className={primaryButtonClass}
                        >
                          First picks
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push("/search")}
                          className={secondaryButtonClass}
                        >
                          Search
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setShowCollectionManager((value) => !value)
                          }
                          className={secondaryButtonClass}
                        >
                          {showCollectionManager
                            ? "Hide Collections"
                            : "Collections"}
                        </button>
                      </div>
                    </div>

                    {readingSnapshotCardsPanel}
                  </div>
                </SurfacePanel>
              )
            ) : (
              <SurfacePanel
                className="space-y-5"
                appearance="light"
                accent="blue"
              >
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Library
                  </p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Keep your shelf together.
                  </h2>
                </div>
                <StorefrontPathwaysGrid
                  cards={signedOutActionCards}
                  columnsClassName="md:grid-cols-2"
                  appearance="light"
                />
              </SurfacePanel>
            )}

            <div className="grid gap-6">
              {continueRailItems.length > 0 ? (
                <div id="continue-reading">
                  <Rail
                    eyebrow={viewerSignedIn ? "Continue" : "On This Device"}
                    title={
                      viewerSignedIn
                        ? "Continue Reading"
                        : "Continue on this device"
                    }
                    railName="continue"
                    items={continueRailItems}
                    appearance="light"
                    showActionLabel={false}
                    coverFallbackVariant="minimal-card"
                    onItemClick={(item) => {
                      if (item.seriesId && item.episodeId) {
                        router.push(
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
                        router.push(
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
                    eyebrow="Recent"
                    title="Recent"
                    railName="history"
                    items={historyRail}
                    appearance="light"
                    showActionLabel={false}
                    coverFallbackVariant="minimal-card"
                    onItemClick={(item) => {
                      if (item.seriesId && item.episodeId) {
                        router.push(
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
                        router.push(
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
                    eyebrow="Saved"
                    title="Saved Series"
                    railName="following"
                    items={visibleLibraryItems}
                    appearance="light"
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
                <SurfacePanel appearance="light" accent="blue">
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
                  eyebrow={viewerSignedIn ? "Next" : "Recommended"}
                  title="Recommended"
                  railName="recommended"
                  items={recommendedItems}
                  reason={recommendedRailReason}
                  appearance="light"
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
      </main>
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
                        setToastMessage("Make-up successful");
                        setMakeupModal(null);
                        return;
                      }
                    }
                    setMakeupModal({
                      type: "ERROR",
                      title: "Couldn't top up",
                      description:
                        "We couldn't top up the starter pack and restore today's streak.",
                    });
                  },
                  variant: "primary",
                },
              ]
            : null
        }
        onClose={() => setMakeupModal(null)}
      />
    </div>
  );
}
