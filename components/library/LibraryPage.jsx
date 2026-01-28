"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../layout/SiteHeader";
import Rail from "../home/Rail";
import Skeleton from "../common/Skeleton";
import { track } from "../../lib/analytics";
import { useProgressStore } from "../../store/useProgressStore";
import { useRewardsStore } from "../../store/useRewardsStore";
import CheckInPanel from "./CheckInPanel";
import MissionsPanel from "./MissionsPanel";
import RewardToast from "./RewardToast";

const continueItems = [
  { id: "l1", title: "Midnight Contract", subtitle: "Ep 12", coverTone: "warm" },
  { id: "l2", title: "Crimson Promise", subtitle: "Ep 4", coverTone: "dusk" },
  { id: "l3", title: "Nova", subtitle: "Ep 9", coverTone: "cool" },
];

const libraryItems = [
  { id: "lib1", title: "Bloom", subtitle: "Library", coverTone: "warm" },
  { id: "lib2", title: "Echo", subtitle: "Library", coverTone: "neon" },
];

export default function LibraryPage() {
  const { bySeriesId } = useProgressStore();
  const {
    rewards,
    missions,
    loadRewards,
    checkIn,
    makeUp,
    loadMissions,
    claimMission,
  } = useRewardsStore();
  const [toastMessage, setToastMessage] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [checkinWorking, setCheckinWorking] = useState(false);
  const progressEntries = Object.entries(bySeriesId);
  const dynamicContinue = progressEntries.map(([seriesId, progress]) => ({
    id: `${seriesId}-${progress.lastEpisodeId}`,
    title: seriesId,
    subtitle: `Continue ${progress.lastEpisodeId}`,
    coverTone: "warm",
  }));

  useEffect(() => {
    track("view_library", {});
  }, []);

  useEffect(() => {
    loadRewards();
    loadMissions();
  }, [loadMissions, loadRewards]);

  const handleCheckIn = async () => {
    setCheckinWorking(true);
    const response = await checkIn();
    if (response.ok) {
      setToastMessage(`+${response.data?.rewards?.todayReward || 0} bonus pts`);
    }
    setCheckinWorking(false);
  };

  const handleMakeUp = async () => {
    setCheckinWorking(true);
    const response = await makeUp();
    if (response.ok) {
      setToastMessage("Make-up successful");
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
      setToastMessage(`+${reward || 0} bonus pts`);
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

        <Rail
          title="Continue Reading"
          items={dynamicContinue.length > 0 ? dynamicContinue : continueItems}
        />

        <section className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Daily Check-in</h3>
              <p className="text-xs text-neutral-400">Claim bonus points today.</p>
            </div>
            <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900">
              Check in
            </button>
          </div>
        </section>

        <Rail title="Your Library" items={libraryItems} />

        <Skeleton className="h-32 w-full rounded-2xl" />
      </main>
      <RewardToast message={toastMessage} onClose={() => setToastMessage("")} />
    </div>
  );
}
