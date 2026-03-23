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

export default function PackageCard({
  pkg,
  highlighted,
  onSelect,
  disabled = false,
  hideAction = false,
  ctaLabel = "Get this pack",
  statusLabel = "",
  statusNote = "",
}) {
  const totalPts = (pkg.paidPts || 0) + (pkg.bonusPts || 0);
  const bonusPct =
    pkg.paidPts && pkg.bonusPts ? Math.round((pkg.bonusPts / pkg.paidPts) * 100) : 0;

  return (
    <div
      className={`group rounded-[28px] border p-5 transition-all duration-300 hover:-translate-y-1 ${
        highlighted
          ? "border-[rgba(47,107,255,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,246,255,0.98))] shadow-[0_20px_44px_rgba(15,23,42,0.08)]"
          : "border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))] shadow-[0_16px_34px_rgba(15,23,42,0.05)]"
      }`}
      style={{ willChange: "transform" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950 transition-colors group-hover:text-[var(--gush-accent,#2f6bff)]">
          {pkg.name}
        </h2>
        {highlighted ? <Pill appearance="light" tone="accent">Best value</Pill> : null}
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {formatUSNumber(pkg.paidPts)} paid + {formatUSNumber(pkg.bonusPts)} bonus
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Total {formatUSNumber(totalPts)} points
        {bonusPct ? ` - ${bonusPct}% bonus` : ""}
      </p>

      {bonusPct > 0 ? (
        <div className="mt-3 rounded-[18px] border border-[rgba(47,107,255,0.12)] bg-[rgba(47,107,255,0.06)] px-3 py-2">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 flex-shrink-0 text-[var(--gush-accent,#2f6bff)]"
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
            <p className="text-xs text-slate-700">
              Includes {bonusPct}% extra points
            </p>
          </div>
        </div>
      ) : null}

      {pkg.priceLabel ? <p className="mt-3 text-sm font-semibold text-slate-950">{pkg.priceLabel}</p> : null}
      {pkg.tag ? (
        <div className="mt-2">
          <Pill appearance="light">{pkg.tag}</Pill>
        </div>
      ) : null}
      {statusLabel ? (
        <div className="mt-2">
          <Pill appearance="light" tone="accent">{statusLabel}</Pill>
        </div>
      ) : null}

      <div className="mt-3 space-y-1 text-[10px] text-slate-500">
        <BenefitRow>Keep points ready for later reads</BenefitRow>
        <BenefitRow>Use them whenever a chapter is locked</BenefitRow>
        <BenefitRow>Good if you do not want a monthly plan</BenefitRow>
        {bonusPct > 0 ? <BenefitRow>Extra points already included</BenefitRow> : null}
      </div>

      {!hideAction ? (
        <button
          type="button"
          className={`mt-4 w-full min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-all ${
            disabled
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-slate-950 text-white hover:bg-slate-800 active:scale-95 active:bg-slate-900"
          }`}
          onClick={() => onSelect?.(pkg.id)}
          disabled={disabled}
          style={{ willChange: "transform" }}
        >
          {ctaLabel}
        </button>
      ) : null}
      {statusNote ? (
        <p className={`${hideAction ? "mt-4" : "mt-3"} text-xs leading-5 text-slate-500`}>
          {statusNote}
        </p>
      ) : null}
    </div>
  );
}
