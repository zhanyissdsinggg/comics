"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../layout/SiteHeader";
import Rail from "../home/Rail";
import Skeleton from "../common/Skeleton";
import CollectionManager from "./CollectionManager";
import { track } from "../../lib/analytics";
import { useProgressStore } from "../../store/useProgressStore";
import { apiGet } from "../../lib/apiClient";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { useRewardsStore } from "../../store/useRewardsStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import CheckInPanel from "./CheckInPanel";
import MissionsPanel from "./MissionsPanel";
import RewardToast from "./RewardToast";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useWalletStore } from "../../store/useWalletStore";
import ActionModal from "../series/ActionModal";
import { useRouter } from "next/navigation";

const continueItems = [
  { id: "l1", title: "Midnight Contract", subtitle: "Ep 12", coverTone: "warm", isAdult: false },
  { id: "l2", title: "Crimson Promise", subtitle: "Ep 4", coverTone: "dusk", isAdult: false },
  { id: "l3", title: "Nova", subtitle: "Ep 9", coverTone: "cool", isAdult: false },
];

const libraryItems = [
  { id: "lib1", title: "Bloom", subtitle: "Library", coverTone: "warm", isAdult: false },
  { id: "lib2", title: "Echo", subtitle: "Library", coverTone: "neon", isAdult: false },
];

function parseEpisodeNumber(value) {
  if (!value) {
    return "";
  }
  const match = String(value).match(/(\d+)/);
  return match ? match[1] : "";
}

export default function LibraryPage() {
  const router = useRouter();
  const { isAdultMode } = useAdultGateStore();
  const { bySeriesId, loadProgress } = useProgressStore();
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
  const showStale = useStaleNotice(seriesResponse);
  const { shouldRetry } = useRetryPolicy();
  const progressEntries = Object.entries(bySeriesId);
  const dynamicContinue = progressEntries
    .map(([seriesId, progress]) => {
      const series = seriesList.find((item) => item.id === seriesId);
      if (!series) {
        return null;
      }
      return {
        id: `${seriesId}-${progress.lastEpisodeId}`,
        title: series.title,
        subtitle: `Continue Ep ${parseEpisodeNumber(progress.lastEpisodeId) || "?"}`,
        coverTone: series.coverTone,
        isAdult: Boolean(series.adult),
      };
    })
    .filter(Boolean);
  const filteredContinue = isAdultMode
    ? dynamicContinue.filter((item) => item.isAdult)
    : dynamicContinue.filter((item) => !item.isAdult);

  const historyRail = historyItems
    .map((entry) => {
      const series = seriesList.find((item) => item.id === entry.seriesId);
      if (!series) {
        return null;
      }
      return {
        id: `history-${entry.seriesId}-${entry.episodeId}`,
        title: series.title,
        subtitle: `Last read ${entry.episodeId}`,
        coverTone: series.coverTone,
        isAdult: Boolean(series.adult),
      };
    })
    .filter(Boolean);

  useEffect(() => {
    track("view_library", {});
  }, []);

  useEffect(() => {
    loadRewards();
    loadMissions();
    loadProgress();
    loadHistory();
  }, [loadMissions, loadRewards, loadProgress, loadHistory]);

  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }).then((response) => {
      setSeriesResponse(response);
      if (response.ok) {
        setSeriesList(response.data?.series || []);
      } else if (response.status === 0 || response.status >= 500) {
        if (shouldRetry(`library_series_${adultFlag}`)) {
          setTimeout(() => {
            apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000, bust: true }).then(
              (retryResponse) => {
                setSeriesResponse(retryResponse);
                if (retryResponse.ok) {
                  setSeriesList(retryResponse.data?.series || []);
                }
              }
            );
          }, 600);
        }
      }
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
        (mission) => mission.id === missionId
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

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 space-y-10">
        <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6">
          <h1 className="text-2xl font-semibold">Library</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Continue where you left off and manage your saved series.
          </p>
        </section>
        {showStale ? (
          <section className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
            Showing cached data. Reconnect to refresh.
          </section>
        ) : null}

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

        {/* 老王注释：收藏夹管理按钮 */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowCollectionManager(!showCollectionManager)}
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:bg-neutral-800"
          >
            {showCollectionManager ? "关闭收藏夹管理" : "管理收藏夹"}
          </button>
        </div>

        {/* 老王注释：收藏夹管理面板 */}
        {showCollectionManager && (
          <div className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6">
            <CollectionManager onClose={() => setShowCollectionManager(false)} />
          </div>
        )}

        <Rail
          title="Continue Reading"
          items={filteredContinue.length > 0 ? filteredContinue : continueItems}
          onItemClick={(item) => {
            const seriesId = item.id?.split("-")[0];
            if (seriesId) {
              router.push(`/series/${seriesId}`);
              return;
            }
            router.push("/series/c1");
          }}
        />

        {historyRail.length > 0 ? (
          <Rail title="Reading History" items={historyRail} />
        ) : null}

        <Rail
          title="Your Library"
          items={
            isAdultMode
              ? libraryItems.filter((item) => item.isAdult)
              : libraryItems.filter((item) => !item.isAdult)
          }
          onItemClick={(item) => router.push(`/series/${item.id?.replace("lib", "c") || "c1"}`)}
        />

        <Rail
          title="Recommended for you"
          items={seriesList.slice(0, 8).map((series) => ({
            id: series.id,
            title: series.title,
            subtitle: series.badge || series.status,
            coverTone: series.coverTone,
            isAdult: Boolean(series.adult),
          }))}
          onItemClick={(item) => router.push(`/series/${item.id}`)}
        />
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
                    router.push("/store?returnTo=/library&focus=auto");
                    setMakeupModal(null);
                  },
                  variant: "secondary",
                },
                {
                  label: "Quick top up (Starter)",
                  onClick: async () => {
                    const topupResponse = await topup("starter");
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
