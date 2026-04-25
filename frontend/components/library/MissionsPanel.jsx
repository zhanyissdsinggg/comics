"use client";

export default function MissionsPanel({ missions, onClaim, workingId }) {
  if (!missions) {
    return (
      <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
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
    const rewardCopy = done
      ? `Complete · +${mission.reward} bonus points`
      : `${mission.progress}/${mission.target} complete · +${mission.reward} bonus points`;

    return (
      <div
        key={mission.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-black/10 bg-[#f6f7f9] p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
      >
        <div>
          <p className="text-sm font-black uppercase tracking-[-0.02em] text-black">
            {mission.title}
          </p>
          <p className="text-xs font-medium text-black/58">{mission.desc}</p>
          <p className="mt-1 text-xs font-medium text-black/44">{rewardCopy}</p>
        </div>
        <button
          type="button"
          onClick={() => onClaim(mission.id)}
          disabled={!done || mission.claimed || workingId === mission.id}
          className="rounded-full border border-black bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-black/90 hover:shadow-[0_12px_22px_rgba(15,23,42,0.14)] active:translate-y-px disabled:opacity-40"
        >
          {mission.claimed ? "Claimed" : "Claim points"}
        </button>
      </div>
    );
  };

  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
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
