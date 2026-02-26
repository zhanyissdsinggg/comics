/**
 * 老王注释：商店套餐卡片组件，带hover效果、触摸反馈和价值说明
 */
"use client";

import Pill from "../common/Pill";
import { formatUSNumber } from "../../lib/localization";

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
        Total {formatUSNumber(totalPts)} POINTS
        {bonusPct ? ` • ${bonusPct}% bonus` : ""}
      </p>

      {/* 老王注释：价值说明 */}
      {bonusPct > 0 && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xs text-emerald-300">
              Save {bonusPct}% • Unlock after purchase
            </p>
          </div>
        </div>
      )}

      {pkg.priceLabel ? (
        <p className="mt-2 text-sm font-semibold">{pkg.priceLabel}</p>
      ) : null}
      {pkg.tag ? (
        <div className="mt-2">
          <Pill>{pkg.tag}</Pill>
        </div>
      ) : null}

      {/* 老王注释：价值说明列表 */}
      <div className="mt-3 space-y-1 text-[10px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400">✓</span>
          <span>Permanent access</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400">✓</span>
          <span>Support creators</span>
        </div>
        {bonusPct > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span>
            <span>Best value deal</span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="mt-4 w-full min-h-[44px] rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition-all hover:bg-emerald-50 active:scale-95 active:bg-emerald-100"
        onClick={() => onSelect?.(pkg.id)}
        style={{ willChange: "transform" }}
      >
        Top up
      </button>
    </div>
  );
}
