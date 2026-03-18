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
      <section className="rounded-[28px] border border-black/6 bg-white/86 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm text-slate-500">Loading today's check-in...</p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-black/6 bg-white/90 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Pill appearance="light" tone="subtle">Streak</Pill>
            <Pill appearance="light" tone="accent">{rewards.streakCount}-day run</Pill>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-950">Today's check-in</h2>
          <p className="mt-2 text-sm text-slate-600">
            Pick up +{rewards.todayReward} bonus points and keep the streak going.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCheckIn}
            disabled={!rewards.canCheckIn || working}
            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {rewards.canCheckIn ? "Claim points" : "Checked in"}
          </button>
          <button
            type="button"
            onClick={onMakeUp}
            disabled={rewards.makeUpUsedToday || working}
            className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs text-slate-700 disabled:opacity-50"
          >
            Restore streak
          </button>
        </div>
      </div>
      {!rewards.makeUpUsedToday ? (
        <p className="mt-4 text-xs text-slate-500">
          Missed a day? Restore the streak for {rewards.makeUpCost} points.
        </p>
      ) : null}
    </section>
  );
}
