"use client";

import SurfacePanel from "../common/SurfacePanel";
import { storefrontPrimaryButtonClass } from "../common/StorefrontPagePrimitives";

export default function MissionsPanel({ missions, onClaim, workingId }) {
  if (!missions) {
    return (
      <SurfacePanel tone="muted" accent="cyan" appearance="dark">
        <div className="space-y-3" aria-hidden="true">
          <div className="h-4 w-28 animate-pulse rounded-full bg-white/15" />
          <div className="h-7 w-44 animate-pulse rounded-2xl bg-white/15" />
          <div className="h-16 w-full animate-pulse rounded-[22px] bg-[#111111]" />
          <div className="h-16 w-full animate-pulse rounded-[22px] bg-[#111111]" />
        </div>
        <p className="mt-4 text-sm font-semibold text-white/75">
          Missions are loading.
        </p>
      </SurfacePanel>
    );
  }

  const renderMission = (mission) => {
    const done = mission.progress >= mission.target;
    const rewardCopy = done
      ? `Done • +${mission.reward} points`
      : `${mission.progress}/${mission.target} done • +${mission.reward} points`;

    return (
      <div
        key={mission.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-2 border-black bg-[#0b0b0b] p-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      >
        <div>
          <p className="text-sm font-black uppercase tracking-[-0.02em] text-white">
            {mission.title}
          </p>
          <p className="text-xs font-semibold text-white/70">{mission.desc}</p>
          <p className="mt-1 text-xs font-semibold text-white/55">
            {rewardCopy}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onClaim(mission.id)}
          disabled={!done || mission.claimed || workingId === mission.id}
          className={`${storefrontPrimaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em] disabled:opacity-40`}
        >
          {mission.claimed ? "Claimed" : "Claim points"}
        </button>
      </div>
    );
  };

  return (
    <SurfacePanel tone="muted" accent="cyan" appearance="dark">
      <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-white">
        Missions
      </h2>
      <p className="mt-2 text-sm font-semibold text-white/80">
        Quick goals. Extra points.
      </p>
      <div className="mt-4 space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
          Today
        </p>
        {missions.daily.map(renderMission)}
        <p className="pt-2 text-xs font-black uppercase tracking-[0.18em] text-white/60">
          This week
        </p>
        {missions.weekly.map(renderMission)}
      </div>
    </SurfacePanel>
  );
}
