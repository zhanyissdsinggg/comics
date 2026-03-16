"use client";

import Pill from "../common/Pill";

export default function CheckInPanel({
  rewards,
  onCheckIn,
  onMakeUp,
  working,
}) {
  if (!rewards) {
    return (
      <section className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
        <p className="text-sm text-neutral-400">Checking today's reward...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Pill>Streak</Pill>
            <Pill>{rewards.streakCount} days</Pill>
          </div>
          <h2 className="mt-3 text-xl font-semibold">Daily rewards</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Claim today&apos;s check-in for +{rewards.todayReward} bonus points.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCheckIn}
            disabled={!rewards.canCheckIn || working}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900 disabled:opacity-50"
          >
            {rewards.canCheckIn ? "Claim today" : "Already claimed"}
          </button>
          <button
            type="button"
            onClick={onMakeUp}
            disabled={rewards.makeUpUsedToday || working}
            className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200 disabled:opacity-50"
          >
            Restore streak (-{rewards.makeUpCost} points)
          </button>
        </div>
      </div>
    </section>
  );
}
