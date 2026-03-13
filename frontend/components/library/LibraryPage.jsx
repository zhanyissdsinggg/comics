"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import Rail from "../home/Rail";
import Skeleton from "../common/Skeleton";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import CollectionManager from "./CollectionManager";
import { trackEvent } from "../../lib/trackEvent";
import { useProgressStore } from "../../store/useProgressStore";
import { apiGet } from "../../lib/apiClient";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { useRewardsStore } from "../../store/useRewardsStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBookmarkStore } from "../../store/useBookmarkStore";
import { useFollowStore } from "../../store/useFollowStore";
import CheckInPanel from "./CheckInPanel";
import MissionsPanel from "./MissionsPanel";
import RewardToast from "./RewardToast";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useAuthStore } from "../../store/useAuthStore";
import ActionModal from "../series/ActionModal";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";

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
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const showStale = useStaleNotice(seriesResponse);
  const { shouldRetry } = useRetryPolicy();
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
    apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }).then((response) => {
      setSeriesResponse(response);
      if (response.ok) {
        setSeriesList(response.data?.series || []);
        if (response.stale) {
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
      } else if (response.status === 0 || response.status >= 500) {
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
      setInitialLoading(false);
    });
  }, [isAdultMode, shouldRetry]);

  const handleCheckIn = async () => {
    setCheckinWorking(true);
    const response = await checkIn();
    if (response.ok) {
      const rewardPts = response.data?.rewardPts ?? rewards?.todayReward ?? 0;
      setToastMessage(`+${rewardPts} bonus POINTS`);
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
        title: "Not enough POINTS",
        description: "Not enough POINTS to make up today.",
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
      setToastMessage(`+${reward || 0} bonus POINTS`);
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
      seriesList
        .filter((series) => !visibleLibraryItems.some((item) => item.seriesId === series.id))
        .slice(0, 8)
        .map((series) => ({
          id: series.id,
          seriesId: series.id,
          title: series.title,
          subtitle: series.badge || series.status,
          coverTone: series.coverTone,
          coverUrl: series.coverUrl,
          isAdult: Boolean(series.adult),
        })),
    [seriesList, visibleLibraryItems],
  );
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

  return (
    <div className="min-h-screen bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Library desk"
          title="Your library, arranged for fast return visits."
          description="Resume chapters, review history, and manage collection surfaces without digging through cluttered shelves."
          secondary={
            isSignedIn
              ? "Rewards, missions, and reading history stay tied to the current account."
              : "Sign in to unlock check-in rewards, mission payouts, and a library that follows you across sessions."
          }
          stats={libraryStats}
          actions={
            <button
              type="button"
              onClick={() => setShowCollectionManager((value) => !value)}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-neutral-100 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/10"
            >
              {showCollectionManager ? "Close Collections" : "Manage Collections"}
            </button>
          }
        />

        {showStale ? (
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
                        Turn this into a persistent library.
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-neutral-400">
                        Sign in to unlock daily check-ins, mission payouts, and reading progress that survives device changes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("auth:open"))}
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
                    Library controls
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                    Keep the shelf clean and mode-aware.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-neutral-400">
                    The library follows the current storefront mode and surfaces only the titles that belong in it.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-400">
                      Catalog mode
                    </p>
                    <p className="mt-3 font-display text-2xl font-semibold text-white">
                      {isAdultMode ? "18+ enabled" : "Standard mode"}
                    </p>
                    <p className="mt-2 text-sm text-neutral-400">
                      Only titles allowed in the active storefront lane are shown below.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-400">
                      Reading sync
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

            <div className="grid gap-6">
              <SurfacePanel>
                <Rail
                  title="Continue Reading"
                  items={continueRailItems}
                  onItemClick={(item) => {
                    if (item.seriesId && item.episodeId) {
                      router.push(`/read/${item.seriesId}/${item.episodeId}`);
                      return;
                    }
                    if (item.seriesId) {
                      router.push(`/series/${item.seriesId}`);
                    }
                  }}
                />
              </SurfacePanel>

              {historyRail.length > 0 ? (
                <SurfacePanel>
                  <Rail
                    title="Reading History"
                    items={historyRail}
                    onItemClick={(item) => {
                      if (item.seriesId && item.episodeId) {
                        router.push(`/read/${item.seriesId}/${item.episodeId}`);
                        return;
                      }
                      if (item.seriesId) {
                        router.push(`/series/${item.seriesId}`);
                      }
                    }}
                  />
                </SurfacePanel>
              ) : null}

              <SurfacePanel>
                <Rail
                  title="Your Library"
                  items={visibleLibraryItems}
                  onItemClick={(item) => {
                    if (item.seriesId) {
                      router.push(`/series/${item.seriesId}`);
                    }
                  }}
                />
              </SurfacePanel>

              <SurfacePanel>
                <Rail
                  title="Recommended for you"
                  items={recommendedItems}
                  onItemClick={(item) => router.push(`/series/${item.id}`)}
                />
              </SurfacePanel>
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
                  label: "Top up POINTS",
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
                  label: "Quick top up (Starter)",
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
                      title: "Top up failed",
                      description: "Unable to top up and make up today.",
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
