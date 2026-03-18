"use client";

export default function MissionsPanel({ missions, onClaim, workingId }) {
  if (!missions) {
    return (
      <section className="rounded-[28px] border border-black/6 bg-white/86 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm text-slate-500">Loading reading missions...</p>
      </section>
    );
  }

  const renderMission = (mission) => {
    const done = mission.progress >= mission.target;
    return (
      <div
        key={mission.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-black/6 bg-[#f8f9fc] p-4"
      >
        <div>
          <p className="text-sm font-semibold text-slate-950">{mission.title}</p>
          <p className="text-xs text-slate-500">{mission.desc}</p>
          <p className="mt-1 text-xs text-slate-400">
            {mission.progress}/{mission.target} done · +{mission.reward} bonus points
          </p>
        </div>
        <button
          type="button"
          onClick={() => onClaim(mission.id)}
          disabled={!done || mission.claimed || workingId === mission.id}
          className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
        >
          {mission.claimed ? "Claimed" : "Claim points"}
        </button>
      </div>
    );
  };

  return (
    <section className="rounded-[28px] border border-black/6 bg-white/90 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <h2 className="text-lg font-semibold text-slate-950">Reading missions</h2>
      <p className="mt-2 text-sm text-slate-600">Small goals for extra points while you read.</p>
      <div className="mt-4 space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Today</p>
        {missions.daily.map(renderMission)}
        <p className="pt-2 text-xs uppercase tracking-[0.18em] text-slate-400">This week</p>
        {missions.weekly.map(renderMission)}
      </div>
    </section>
  );
}
