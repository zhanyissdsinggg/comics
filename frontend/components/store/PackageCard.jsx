"use client";

import Pill from "../common/Pill";
import { formatUSNumber } from "../../lib/localization";

function BenefitRow({ children }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export default function PackageCard({ pkg, highlighted, onSelect }) {
  const totalPts = (pkg.paidPts || 0) + (pkg.bonusPts || 0);
  const bonusPct =
    pkg.paidPts && pkg.bonusPts ? Math.round((pkg.bonusPts / pkg.paidPts) * 100) : 0;

  return (
    <div
      className={`group rounded-2xl border p-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
        highlighted
          ? "border-yellow-500 bg-yellow-500/10 hover:border-yellow-400 hover:shadow-yellow-500/20"
          : "border-neutral-900 bg-neutral-900/50 hover:border-emerald-500/40 hover:shadow-emerald-500/20"
      }`}
      style={{ willChange: "transform" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold transition-colors group-hover:text-emerald-400">
          {pkg.name}
        </h2>
        {highlighted ? <Pill>Recommended</Pill> : null}
      </div>

      <p className="mt-2 text-sm text-neutral-400">
        {formatUSNumber(pkg.paidPts)} paid + {formatUSNumber(pkg.bonusPts)} bonus
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Total {formatUSNumber(totalPts)} points
        {bonusPct ? ` - ${bonusPct}% bonus` : ""}
      </p>

      {bonusPct > 0 ? (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 flex-shrink-0 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-xs text-emerald-300">
              Save {bonusPct}% and use your points right after purchase
            </p>
          </div>
        </div>
      ) : null}

      {pkg.priceLabel ? <p className="mt-2 text-sm font-semibold">{pkg.priceLabel}</p> : null}
      {pkg.tag ? (
        <div className="mt-2">
          <Pill>{pkg.tag}</Pill>
        </div>
      ) : null}

      <div className="mt-3 space-y-1 text-[10px] text-neutral-500">
        <BenefitRow>Permanent access</BenefitRow>
        <BenefitRow>Support creators</BenefitRow>
        {bonusPct > 0 ? <BenefitRow>Best value deal</BenefitRow> : null}
      </div>

      <button
        type="button"
        className="mt-4 w-full min-h-[44px] rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition-all hover:bg-emerald-50 active:scale-95 active:bg-emerald-100"
        onClick={() => onSelect?.(pkg.id)}
        style={{ willChange: "transform" }}
      >
        Buy points
      </button>
    </div>
  );
}
