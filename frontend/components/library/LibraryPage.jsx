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
    <SurfacePanel className="space-y-3" appearance="light" accent="blue">
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
        subtitle: sourceLabel || series.genres?.slice(0, 2).join(" | ") || series.badge || series.status,
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
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc]";

  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <main className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Library"
          title="Your next read should be obvious."
          description="Resume the last chapter fast, keep saved series in view, and stop hunting through your own shelf."
          secondary={
            isSignedIn
              ? "Reading history, saved titles, and rewards stay tied to this account so getting back into a story feels immediate."
              : "Sign in to keep your shelf, reading history, and rewards in one place."
          }
          stats={libraryStats}
          appearance="light"
          actions={
            <>
              {resumeSpotlight?.seriesId && resumeSpotlight?.episodeId ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildLibraryReadHref(
                        resumeSpotlight.seriesId,
                        resumeSpotlight.episodeId,
                        "LIBRARY_RESUME_SPOTLIGHT",
                        "resume_spotlight",
                      ),
                    )
                  }
                  className={primaryButtonClass}
                >
                  Resume now
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className={primaryButtonClass}
                >
                  Find something to start
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!isSignedIn) {
                    router.push("/rankings?type=popular&window=week");
                    return;
                  }
                  setShowCollectionManager((value) => !value);
                }}
                className={secondaryButtonClass}
              >
                {isSignedIn ? (showCollectionManager ? "Close collections" : "Manage collections") : "Browse Top Series"}
              </button>
            </>
          }
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {showLibraryStale ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Showing saved data while we reconnect.
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
            {isSignedIn ? (
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
            ) : (
              <SurfacePanel className="flex flex-wrap items-center justify-between gap-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Account sync
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Take this library, purchase history, and progress with you.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Sign in once and keep your shelf, reading history, rewards, and reading progress synced across visits.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openAuthPrompt}
                    className={primaryButtonClass}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/rankings?type=ttf&window=all")}
                    className={secondaryButtonClass}
                  >
                    Start free
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/how-it-works")}
                    className={secondaryButtonClass}
                  >
                    How it works
                  </button>
                </div>
              </SurfacePanel>
            )}

            {showCollectionManager ? (
              <SurfacePanel appearance="light" accent="blue">
                <CollectionManager onClose={() => setShowCollectionManager(false)} />
              </SurfacePanel>
            ) : null}

            {!hasLibrarySignals ? (
              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Get started
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Start a series, save a favorite, and this page becomes useful fast.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Read a free chapter, follow a title, or open Top Series so your library has something worth returning to.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/rankings?type=ttf&window=all")}
                    className={primaryButtonClass}
                  >
                    Start reading free
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/rankings?type=popular&window=week")}
                    className={secondaryButtonClass}
                  >
                    Browse Top Series
                  </button>
                  {!isSignedIn ? (
                    <button
                      type="button"
                      onClick={openAuthPrompt}
                      className={secondaryButtonClass}
                    >
                      Sign in for sync
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => router.push("/how-it-works")}
                    className={secondaryButtonClass}
                  >
                    How it works
                  </button>
                </div>
                {recommendedItems.slice(0, 3).length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {recommendedItems.slice(0, 3).map((item) => (
                      <button
                        key={item.seriesId}
                        type="button"
                        onClick={() =>
                          router.push(
                            buildLibrarySeriesHref(
                              item.seriesId,
                              item.entryPoint || "LIBRARY_EMPTY_STATE",
                              item.campaignId || "library_empty_state",
                            ),
                          )
                        }
                        className="rounded-[24px] border border-black/8 bg-white px-4 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:border-black/12 hover:bg-[#fbfcff]"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {item.eyebrow || "Start here"}
                        </p>
                        <p className="mt-3 text-base font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.subtitle}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </SurfacePanel>
            ) : null}

            <div className="grid gap-6">
              {continueRailItems.length > 0 ? (
                <Rail
                  title="Continue Reading"
                  items={continueRailItems}
                  reason="Pick up where you left off before the thread goes cold."
                  ctaLabel="Resume reading"
                  href="/library"
                  appearance="light"
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
              ) : null}

              {historyRail.length > 0 ? (
                <Rail
                  title="Reading History"
                  items={historyRail}
                  reason="Recent sessions stay close when you want to retrace a title."
                  ctaLabel="Review History"
                  href="/library"
                  appearance="light"
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
              ) : null}

              {visibleLibraryItems.length > 0 ? (
                <Rail
                  title="Your Library"
                  items={visibleLibraryItems}
                  reason="Saved and followed titles gathered into your current catalog view."
                  ctaLabel="Manage Shelf"
                  href="/library"
                  appearance="light"
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
              ) : null}

              {recommendedItems.length > 0 ? (
                <Rail
                  title="Recommended for You"
                  items={recommendedItems}
                  reason={recommendedRailReason}
                  ctaLabel="View Chart"
                  href="/rankings?type=popular&window=week"
                  appearance="light"
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
