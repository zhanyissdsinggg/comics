"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

function PanelLoadingSkeleton({ rows = 3 }) {
  return (
    <SurfacePanel className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={`panel-loading-${rows}-${index}`} className="h-12 w-full rounded-2xl" />
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

export default function LibraryPage() {
  const router = useRouter();
  const { isSignedIn } = useAuthStore();
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const showStale = useStaleNotice(seriesResponse);
  const showHomepageSlotsStale = useStaleNotice(homepageSlotsResponse);
  const { shouldRetry } = useRetryPolicy();
  const openAuthPrompt = () => window.dispatchEvent(new CustomEvent("auth:open"));
  const seriesById = useMemo(
    () => new Map(seriesList.map((series) => [series.id, series])),
    [seriesList],
  );
  const followedSet = useMemo(() => new Set(followedSeriesIds), [followedSeriesIds]);
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
          return {
            id: `continue-${seriesId}-${progress.lastEpisodeId}`,
            seriesId,
            episodeId: progress.lastEpisodeId,
            title: series.title,
            subtitle: formatEpisodeSubtitle("Continue", progress.lastEpisodeId),
            coverTone: series.coverTone,
            coverUrl: series.coverUrl,
            isAdult: Boolean(series.adult),
            updatedAt: toTimestamp(progress.updatedAt),
          };
        })
        .filter(Boolean),
    [progressEntries, seriesById],
  );

  const buildLibrarySeriesHref = (seriesId, entryPoint = "LIBRARY_SHELF", campaignId = "library_shelf") =>
    buildPathWithAttribution(`/series/${seriesId}`, {
      entryPoint,
      campaignId,
      sourcePath: "/library",
      sourceSeriesId: seriesId,
      returnTo: `/series/${seriesId}`,
    });

  const buildLibraryReadHref = (
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
    });

  const historyRail = useMemo(
    () =>
      historyItems
        .map((entry) => {
          const series = seriesById.get(entry.seriesId);
          if (!series || !entry?.episodeId) {
            return null;
          }
          return {
            id: `history-${entry.id || `${entry.seriesId}-${entry.episodeId}`}`,
            seriesId: entry.seriesId,
            episodeId: entry.episodeId,
            title: series.title,
            subtitle: formatEpisodeSubtitle("Last read", entry.episodeId),
            coverTone: series.coverTone,
            coverUrl: series.coverUrl,
            isAdult: Boolean(series.adult),
            updatedAt: toTimestamp(entry.createdAt),
          };
        })
        .filter(Boolean),
    [historyItems, seriesById],
  );

  useEffect(() => {
    trackEvent("view_library", {});
  }, []);

  useEffect(() => {
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/library")));
  }, []);

  useEffect(() => {
    loadProgress();
    loadHistory();
    if (isSignedIn) {
      loadRewards();
      loadMissions();
      loadFollowed();
    }
  }, [isSignedIn, loadFollowed, loadMissions, loadRewards, loadProgress, loadHistory]);

  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    parallelRequests2(
      () => apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }),
      () => apiGet(`/api/recommendations/homepage?adult=${adultFlag}`, { cacheMs: 60000 }),
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
      } else if (seriesCatalogResponse.status === 0 || seriesCatalogResponse.status >= 500) {
        if (shouldRetry(`library_series_${adultFlag}`)) {
          setTimeout(() => {
            apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000, bust: true }).then(
              (retryResponse) => {
                setSeriesResponse(retryResponse);
                if (retryResponse.ok) {
                  setSeriesList(retryResponse.data?.series || []);
                }
              },
            );
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

        let subtitle = series.status || "Series";
        if (progress?.lastEpisodeId) {
          subtitle = formatEpisodeSubtitle("Resume", progress.lastEpisodeId);
        } else if (bookmarkCount > 0) {
          subtitle = `${bookmarkCount} bookmark${bookmarkCount > 1 ? "s" : ""}`;
        } else if (isFollowed) {
          subtitle = "Following";
        }

        return {
          id: `library-${seriesId}`,
          seriesId,
          title: series.title,
          subtitle,
          coverTone: series.coverTone,
          coverUrl: series.coverUrl,
          badge: isFollowed ? series.badge || "Saved" : series.badge,
          isAdult: Boolean(series.adult),
          updatedAt: Math.max(
            toTimestamp(progress?.updatedAt),
            toTimestamp(latestBookmark?.createdAt),
          ),
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (right.updatedAt !== left.updatedAt) {
          return right.updatedAt - left.updatedAt;
        }
        return left.title.localeCompare(right.title);
      });
  }, [bookmarksBySeries, bySeriesId, followedSeriesIds, followedSet, progressEntries, seriesById]);

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
        subtitle: series.genres?.slice(0, 2).join(" | ") || series.badge || series.status,
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
    if (recommendedItems.some((item) => item.sourceSlot === "library-return")) {
      return "Editors are highlighting these as strong next reads for library users.";
    }
    if (recommendedItems.some((item) => Boolean(item.sourceSlot))) {
      return "These picks come from the site's featured spots before the default recommendations take over.";
    }
    return "Popular series you have not saved yet.";
  }, [recommendedItems]);
  const showLibraryStale = showStale || showHomepageSlotsStale;
  const hasLibrarySignals =
    continueRailItems.length > 0 || historyRail.length > 0 || visibleLibraryItems.length > 0;
  const libraryStats = useMemo(
    () => [
      {
        label: "Continue",
        value: continueRailItems.length.toLocaleString(),
        hint: "Jump back to the last opened chapter",
      },
      {
        label: "History",
        value: historyRail.length.toLocaleString(),
        hint: "Recently opened series and episodes",
      },
      {
        label: "Saved",
        value: visibleLibraryItems.length.toLocaleString(),
        hint: "Pinned titles in the current mode",
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+" : "Standard",
        hint: isSignedIn ? "Account sync available" : "Sign in to unlock rewards",
      },
    ],
    [continueRailItems.length, historyRail.length, isAdultMode, isSignedIn, visibleLibraryItems.length],
  );
  const resumeSpotlight = continueRailItems[0] || historyRail[0] || null;
  const completedShelfCount = visibleLibraryItems.filter((item) => {
    const status = String(seriesById.get(item.seriesId)?.status || "");
    return status.toLowerCase() === "completed";
  }).length;
  const returnConsoleCards = [
    {
      id: "resume-thread",
      eyebrow: "Resume",
      title: resumeSpotlight ? resumeSpotlight.title : "Nothing in progress yet",
      description: resumeSpotlight
        ? `${resumeSpotlight.subtitle}. Jump back into the latest unlocked chapter with one tap.`
        : "Start a series and your quickest way back will appear here automatically.",
      ctaLabel: resumeSpotlight ? "Resume now" : "Open weekly chart",
      onClick: () => {
        if (resumeSpotlight?.seriesId && resumeSpotlight?.episodeId) {
          router.push(
            buildLibraryReadHref(
              resumeSpotlight.seriesId,
              resumeSpotlight.episodeId,
              "LIBRARY_RESUME_SPOTLIGHT",
              "resume_spotlight",
            ),
          );
          return;
        }
        if (resumeSpotlight?.seriesId) {
          router.push(
            buildLibrarySeriesHref(
              resumeSpotlight.seriesId,
              "LIBRARY_RESUME_SPOTLIGHT",
              "resume_spotlight",
            ),
          );
          return;
        }
        router.push("/rankings?type=popular&window=week");
      },
      accentClass:
        "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
    },
    {
      id: "unfinished-stack",
      eyebrow: "In progress",
      title: `${continueRailItems.length} series in progress`,
      description:
        continueRailItems.length > 0
          ? "These series already have a saved reading spot, so you can jump right back into the story."
          : "As soon as you stop mid-series, your unfinished reads will start showing up here.",
      ctaLabel: continueRailItems.length > 0 ? "Continue reading" : "Search all series",
      onClick: () => {
        const firstContinue = continueRailItems[0];
        if (firstContinue?.seriesId && firstContinue?.episodeId) {
          router.push(
            buildLibraryReadHref(
              firstContinue.seriesId,
              firstContinue.episodeId,
              "LIBRARY_CONTINUE_STACK",
              "continue_stack",
            ),
          );
          return;
        }
        router.push("/search");
      },
      accentClass:
        "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
    },
    {
      id: "binge-ready",
      eyebrow: "Completed",
      title: `${completedShelfCount} completed series`,
      description:
        completedShelfCount > 0
          ? "Finished runs are perfect when you want to keep reading without waiting for the next update."
          : "Completed series will show up here once you save a few binge-ready reads.",
      ctaLabel: "Browse completed",
      onClick: () => router.push("/search?status=Completed&sort=popular"),
      accentClass:
        "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
    },
    {
      id: "shelf-sync",
      eyebrow: "Sync",
      title: isSignedIn ? "Saved to this account" : "Local to this device",
      description: isSignedIn
        ? "Saved series, rewards, missions, and reading history stay tied to this account."
        : "Sign in so your saved series, rewards, and reading progress travel across devices.",
      ctaLabel: isSignedIn ? (showCollectionManager ? "Collections open" : "Manage collections") : "Sign in",
      onClick: () => {
        if (!isSignedIn) {
          openAuthPrompt();
          return;
        }
        setShowCollectionManager(true);
      },
      accentClass:
        "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
    },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Library"
          title="Everything you've saved, followed, or started."
          description="Resume chapters, scan recent visits, and keep your saved series from feeling scattered."
          secondary={
            isSignedIn
              ? "Rewards, missions, and reading history stay tied to the current account, so getting back into a story takes less hunting."
              : "Sign in to unlock check-in rewards, mission payouts, and a library that follows you across sessions."
          }
          stats={libraryStats}
          actions={
            <button
              type="button"
              onClick={() => setShowCollectionManager((value) => !value)}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-neutral-100 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/10"
            >
              {showCollectionManager ? "Close collections" : "Manage collections"}
            </button>
          }
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {showLibraryStale ? (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            Showing cached data. Reconnect to refresh your latest shelves.
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
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="grid gap-6">
                {isSignedIn ? (
                  <>
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
                  </>
                ) : (
                  <SurfacePanel className="space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                        Account sync
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                        Turn this into a real cross-device library.
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-neutral-400">
                        Sign in to unlock daily rewards, mission payouts, and reading progress that survives device changes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAuthPrompt}
                      className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/15"
                    >
                      Sign in
                    </button>
                  </SurfacePanel>
                )}
              </div>

              <SurfacePanel className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                    Reading mode
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                    Keep this shelf matched to the catalog you're browsing.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-neutral-400">
                    Your library follows the current catalog mode, so what appears here always matches what you can browse right now.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-400">
                      Catalog
                    </p>
                    <p className="mt-3 font-display text-2xl font-semibold text-white">
                      {isAdultMode ? "18+ enabled" : "Standard mode"}
                    </p>
                    <p className="mt-2 text-sm text-neutral-400">
                      Only titles allowed in the current mode appear below.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-400">
                      Sync status
                    </p>
                    <p className="mt-3 font-display text-2xl font-semibold text-white">
                      {isSignedIn ? "Connected" : "Local only"}
                    </p>
                    <p className="mt-2 text-sm text-neutral-400">
                      {isSignedIn
                        ? "Progress, rewards, and mission activity are tied to your account."
                        : "Progress is available locally, but rewards and deeper sync need sign-in."}
                    </p>
                  </div>
                </div>
              </SurfacePanel>
            </div>

            {showCollectionManager ? (
              <SurfacePanel>
                <CollectionManager onClose={() => setShowCollectionManager(false)} />
              </SurfacePanel>
            ) : null}

            <SurfacePanel className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                    Pick up where you left off
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                    Your next read should be obvious.
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                    A good library should show what to resume, what to binge, and what still needs account sync.
                  </p>
                </div>
                <p className="text-sm text-neutral-500">
                  {hasLibrarySignals ? "Ready to resume" : "Start saving series"}
                </p>
              </div>

              <StorefrontPathwaysGrid cards={returnConsoleCards} />
            </SurfacePanel>

            {!hasLibrarySignals ? (
              <SurfacePanel className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                    Get started
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                    Start a series or save a favorite.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-neutral-400">
                    Read a chapter, follow a series, or open this week's chart so your library has something to bring
                    you back to.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/search")}
                    className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  >
                    Search all series
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/rankings?type=popular&window=week")}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    See weekly chart
                  </button>
                  {!isSignedIn ? (
                    <button
                      type="button"
                      onClick={openAuthPrompt}
                      className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/15"
                    >
                      Sign in for sync
                    </button>
                  ) : null}
                </div>
              </SurfacePanel>
            ) : null}

            <div className="grid gap-6">
              {continueRailItems.length > 0 ? (
                <SurfacePanel>
                  <Rail
                    title="Continue Reading"
                    items={continueRailItems}
                    reason="Jump back into unlocked chapters before the reading thread goes cold."
                    ctaLabel="Resume reading"
                    href="/library"
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
                </SurfacePanel>
              ) : null}

              {historyRail.length > 0 ? (
                <SurfacePanel>
                  <Rail
                    title="Reading History"
                    items={historyRail}
                    reason="Recent sessions stay one tap away when you want to retrace a title."
                    ctaLabel="Review History"
                    href="/library"
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
                </SurfacePanel>
              ) : null}

              {visibleLibraryItems.length > 0 ? (
                <SurfacePanel>
                  <Rail
                    title="Your Library"
                    items={visibleLibraryItems}
                    reason="Followed and bookmarked titles gathered into your current catalog view."
                    ctaLabel="Manage Shelf"
                    href="/library"
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
                </SurfacePanel>
              ) : null}

              {recommendedItems.length > 0 ? (
                <SurfacePanel>
                  <Rail
                    title="Recommended for You"
                    items={recommendedItems}
                    reason={recommendedRailReason}
                    ctaLabel="View Chart"
                    href="/rankings?type=popular&window=week"
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
                </SurfacePanel>
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
                  label: "View point packs",
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
                      description: "We couldn't top up the starter pack and restore today's streak.",
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
