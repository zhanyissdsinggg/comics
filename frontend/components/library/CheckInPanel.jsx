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
      <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="space-y-3" aria-hidden="true">
          <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="h-7 w-48 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-4 w-full max-w-sm animate-pulse rounded-full bg-slate-100" />
        </div>
        <p className="mt-4 text-sm font-medium text-black/58">
          Today's check-in is getting ready.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Pill appearance="light" tone="subtle">
              Streak
            </Pill>
            <Pill appearance="light" tone="accent">
              {rewards.streakCount}-day run
            </Pill>
          </div>
          <h2 className="mt-3 text-xl font-black uppercase tracking-[-0.03em] text-black">
            Today's check-in
          </h2>
          <p className="mt-2 text-sm font-medium text-black/68">
            Pick up +{rewards.todayReward} bonus points and keep the streak
            going.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCheckIn}
            disabled={!rewards.canCheckIn || working}
            className="rounded-full border border-black bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-black/90 hover:shadow-[0_10px_20px_rgba(15,23,42,0.14)] active:translate-y-px disabled:opacity-50"
          >
            {rewards.canCheckIn ? "Claim points" : "Checked in"}
          </button>
          <button
            type="button"
            onClick={onMakeUp}
            disabled={rewards.makeUpUsedToday || working}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-black shadow-[0_10px_20px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-black/[0.03] hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)] active:translate-y-px disabled:opacity-50"
          >
            Restore streak
          </button>
        </div>
      </div>
      {!rewards.makeUpUsedToday ? (
        <p className="mt-4 text-xs font-medium text-black/58">
          Missed a day? Restore the streak for {rewards.makeUpCost} points.
        </p>
      ) : null}
    </section>
  );
}
