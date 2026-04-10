"use client";

export default function MissionsPanel({ missions, onClaim, workingId }) {
  if (!missions) {
    return (
      <section className="rounded-[28px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
        <div className="space-y-3" aria-hidden="true">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="h-7 w-44 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-16 w-full animate-pulse rounded-[22px] bg-slate-100" />
          <div className="h-16 w-full animate-pulse rounded-[22px] bg-slate-100" />
        </div>
        <p className="mt-4 text-sm text-slate-500">
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
        className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4"
      >
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {mission.title}
          </p>
          <p className="text-xs text-slate-500">{mission.desc}</p>
          <p className="mt-1 text-xs text-slate-400">
            {done
              ? `Complete · +${mission.reward} bonus points`
              : `${mission.progress}/${mission.target} complete · +${mission.reward} bonus points`}
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
    <section className="rounded-[28px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <h2 className="text-lg font-semibold text-slate-950">Reading missions</h2>
      <p className="mt-2 text-sm text-slate-600">
        Small goals for extra points while you read.
      </p>
      <div className="mt-4 space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Today
        </p>
        {missions.daily.map(renderMission)}
        <p className="pt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
          This week
        </p>
        {missions.weekly.map(renderMission)}
      </div>
    </section>
  );
}
