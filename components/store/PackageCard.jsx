"use client";

import Pill from "../common/Pill";

export default function PackageCard({ pkg, highlighted, onSelect }) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        highlighted
          ? "border-yellow-500 bg-yellow-500/10"
          : "border-neutral-900 bg-neutral-900/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{pkg.name}</h2>
        {highlighted ? <Pill>Recommended</Pill> : null}
      </div>
      <p className="mt-2 text-sm text-neutral-400">
        {pkg.paidPts} paid + {pkg.bonusPts} bonus
      </p>
      {pkg.tag ? (
        <div className="mt-2">
          <Pill>{pkg.tag}</Pill>
        </div>
      ) : null}
      <button
        type="button"
        className="mt-4 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
        onClick={() => onSelect?.(pkg.id)}
      >
        Buy
      </button>
    </div>
  );
}
