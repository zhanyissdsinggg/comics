"use client";

import Pill from "../common/Pill";
import { formatUSNumber } from "../../lib/localization";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function BenefitRow({ children }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 rounded-full bg-[#00E5FF]"
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
  ctaLabel = "Get pack",
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
      className={[
        "group rounded-[26px] border-2 border-black bg-[#0b0b0b] p-5 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5",
        highlighted
          ? "outline outline-2 outline-offset-2 outline-[#00E5FF]"
          : "",
      ].join(" ")}
      style={{ willChange: "transform" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-white">
          {pkg.name}
        </h2>
        {highlighted ? (
          <Pill appearance="light" tone="accent">
            Best value
          </Pill>
        ) : null}
      </div>

      <p className="mt-2 text-sm font-semibold text-white/80">
        {formatUSNumber(pkg.paidPts)} base + {formatUSNumber(pkg.bonusPts)}{" "}
        extra
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/65">
        Total {formatUSNumber(totalPts)} points
        {bonusPct ? ` - ${bonusPct}% extra` : ""}
      </p>

      {bonusPct > 0 ? (
        <div className="mt-3 rounded-[18px] border-2 border-black bg-black px-3 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 flex-shrink-0 text-[#00E5FF]"
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
            <p className="text-xs font-semibold text-white/80">
              Includes {bonusPct}% more points
            </p>
          </div>
        </div>
      ) : null}

      {pkg.priceLabel ? (
        <p className="mt-3 text-sm font-black uppercase tracking-[0.05em] text-white">
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

      <div className="mt-3 space-y-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/65">
        <BenefitRow>One-time points</BenefitRow>
        <BenefitRow>Read as you go</BenefitRow>
        <BenefitRow>No monthly charge</BenefitRow>
        {bonusPct > 0 ? (
          <BenefitRow>{bonusPct}% extra included</BenefitRow>
        ) : null}
      </div>

      {!hideAction ? (
        <button
          type="button"
          className={[
            "mt-4 w-full min-h-[48px] px-4 py-3",
            disabled
              ? `${storefrontSecondaryButtonClass} cursor-not-allowed opacity-50`
              : storefrontPrimaryButtonClass,
          ].join(" ")}
          onClick={() => onSelect?.(pkg.id)}
          disabled={disabled}
          style={{ willChange: "transform" }}
        >
          {ctaLabel}
        </button>
      ) : null}
      {statusNote ? (
        <p
          className={`${hideAction ? "mt-4" : "mt-3"} text-xs font-semibold leading-5 text-white/70`}
        >
          {statusNote}
        </p>
      ) : null}
    </div>
  );
}
