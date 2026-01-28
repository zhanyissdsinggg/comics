"use client";

export default function MissionsPanel({ missions, onClaim, workingId }) {
  if (!missions) {
    return (
      <section className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
        <p className="text-sm text-neutral-400">Loading missions...</p>
      </section>
    );
  }

  const renderMission = (mission) => {
    const done = mission.progress >= mission.target;
    return (
      <div
        key={mission.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4"
      >
        <div>
          <p className="text-sm font-semibold">{mission.title}</p>
          <p className="text-xs text-neutral-400">{mission.desc}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {mission.progress}/{mission.target} · +{mission.reward} bonus
          </p>
        </div>
        <button
          type="button"
          onClick={() => onClaim(mission.id)}
          disabled={!done || mission.claimed || workingId === mission.id}
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900 disabled:opacity-40"
        >
          {mission.claimed ? "Claimed" : "Claim"}
        </button>
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
      <h2 className="text-lg font-semibold">Missions</h2>
      <div className="mt-4 space-y-3">
        <p className="text-xs uppercase text-neutral-500">Daily</p>
        {missions.daily.map(renderMission)}
        <p className="pt-2 text-xs uppercase text-neutral-500">Weekly</p>
        {missions.weekly.map(renderMission)}
      </div>
    </section>
  );
}
