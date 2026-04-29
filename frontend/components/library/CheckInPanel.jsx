"use client";

import Pill from "../common/Pill";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

export default function CheckInPanel({
  rewards,
  onCheckIn,
  onMakeUp,
  working,
}) {
  if (!rewards) {
    return (
      <SurfacePanel tone="muted" accent="yellow" appearance="dark">
        <div className="space-y-3" aria-hidden="true">
          <div className="h-4 w-24 animate-pulse rounded-full bg-white/15" />
          <div className="h-7 w-48 animate-pulse rounded-2xl bg-white/15" />
          <div className="h-4 w-full max-w-sm animate-pulse rounded-full bg-[#111111]" />
        </div>
        <p className="mt-4 text-sm font-semibold text-white/75">
          Check-in is loading.
        </p>
      </SurfacePanel>
    );
  }

  return (
    <SurfacePanel tone="muted" accent="yellow" appearance="dark">
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
          <h2 className="mt-3 text-xl font-black uppercase tracking-[-0.03em] text-white">
            Daily check-in
          </h2>
          <p className="mt-2 text-sm font-semibold text-white/80">
            Get +{rewards.todayReward} points and keep your streak going.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCheckIn}
            disabled={!rewards.canCheckIn || working}
            className={`${storefrontPrimaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em] disabled:opacity-50`}
          >
            {rewards.canCheckIn ? "Claim points" : "Checked in"}
          </button>
          <button
            type="button"
            onClick={onMakeUp}
            disabled={rewards.makeUpUsedToday || working}
            className={`${storefrontSecondaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em] disabled:opacity-50`}
          >
            Fix streak
          </button>
        </div>
      </div>
      {!rewards.makeUpUsedToday ? (
        <p className="mt-4 text-xs font-semibold text-white/70">
          Missed a day? Fix it for {rewards.makeUpCost} points.
        </p>
      ) : null}
    </SurfacePanel>
  );
}
