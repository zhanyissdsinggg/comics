"use client";

import Pill from "../common/Pill";
import { formatUSNumber } from "../../lib/localization";

function BenefitRow({ children }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 rounded-full bg-[var(--gush-accent,#3157d6)]"
        aria-hidden="true"
      />
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
    pkg.paidPts && pkg.bonusPts
      ? Math.round((pkg.bonusPts / pkg.paidPts) * 100)
      : 0;
  const normalizedTag = String(pkg.tag || "")
    .trim()
    .toLowerCase();
  const showTag =
    Boolean(pkg.tag) && !(highlighted && normalizedTag === "best value");

  return (
    <div
        className={`group rounded-[28px] border p-5 transition-all duration-300 hover:-translate-y-1 ${
          highlighted
            ? "border-[color:var(--gush-border-strong)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.07)]"
            : "border-[color:var(--gush-border)] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.045)]"
        }`}
      style={{ willChange: "transform" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">{pkg.name}</h2>
        {highlighted ? (
          <Pill appearance="light" tone="accent">
            Best value
          </Pill>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {formatUSNumber(pkg.paidPts)} paid + {formatUSNumber(pkg.bonusPts)}{" "}
        bonus
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Total {formatUSNumber(totalPts)} points
        {bonusPct ? ` - ${bonusPct}% bonus` : ""}
      </p>

      {bonusPct > 0 ? (
        <div className="mt-3 rounded-[18px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-2">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 flex-shrink-0 text-[var(--gush-accent,#3157d6)]"
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

      {pkg.priceLabel ? (
        <p className="mt-3 text-sm font-semibold text-slate-950">
          {pkg.priceLabel}
        </p>
      ) : null}
      {showTag ? (
        <div className="mt-2">
          <Pill appearance="light">{pkg.tag}</Pill>
        </div>
      ) : null}
      {statusLabel ? (
        <div className="mt-2">
          <Pill appearance="light" tone="accent">
            {statusLabel}
          </Pill>
        </div>
      ) : null}

      <div className="mt-3 space-y-1 text-[10px] text-slate-500">
        <BenefitRow>One-time points for later reads</BenefitRow>
        <BenefitRow>Unlock locked chapters as needed</BenefitRow>
        <BenefitRow>No recurring billing</BenefitRow>
        {bonusPct > 0 ? (
          <BenefitRow>{bonusPct}% bonus included</BenefitRow>
        ) : null}
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
        <p
          className={`${hideAction ? "mt-4" : "mt-3"} text-xs leading-5 text-slate-500`}
        >
          {statusNote}
        </p>
      ) : null}
    </div>
  );
}
