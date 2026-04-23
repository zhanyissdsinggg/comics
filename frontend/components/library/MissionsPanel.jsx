"use client";

export default function MissionsPanel({ missions, onClaim, workingId }) {
  if (!missions) {
    return (
      <section className="border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
        <div className="space-y-3" aria-hidden="true">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="h-7 w-44 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-16 w-full animate-pulse rounded-[22px] bg-slate-100" />
          <div className="h-16 w-full animate-pulse rounded-[22px] bg-slate-100" />
        </div>
        <p className="mt-4 text-sm font-medium text-black/58">
          Reading missions are getting ready.
        </p>
      </section>
    );
  }

  const renderMission = (mission) => {
    const done = mission.progress >= mission.target;

    return (
      <div
        key={mission.id}
        className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-black bg-[#f5f1ea] p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
      >
        <div>
          <p className="text-sm font-black uppercase tracking-[-0.02em] text-black">
            {mission.title}
          </p>
          <p className="text-xs font-medium text-black/58">{mission.desc}</p>
          <p className="mt-1 text-xs font-medium text-black/44">
            {done
              ? `Complete 路 +${mission.reward} bonus points`
              : `${mission.progress}/${mission.target} complete 路 +${mission.reward} bonus points`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onClaim(mission.id)}
          disabled={!done || mission.claimed || workingId === mission.id}
          className="border-[3px] border-black bg-[#ff007a] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e1006d] hover:shadow-none disabled:opacity-40"
        >
          {mission.claimed ? "Claimed" : "Claim points"}
        </button>
      </div>
    );
  };

  return (
    <section className="border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-black">
        Reading missions
      </h2>
      <p className="mt-2 text-sm font-medium text-black/68">
        Small goals for extra points while you read.
      </p>
      <div className="mt-4 space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-black/45">
          Today
        </p>
        {missions.daily.map(renderMission)}
        <p className="pt-2 text-xs font-black uppercase tracking-[0.18em] text-black/45">
          This week
        </p>
        {missions.weekly.map(renderMission)}
      </div>
    </section>
  );
}
