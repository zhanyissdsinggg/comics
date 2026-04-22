"use client";

import { cn } from "@/lib/utils";
import Skeleton from "@/components/common/Skeleton";

import AdminShell from "../AdminShell";

function getToneClasses(tone) {
  if (tone === "blue") {
    return "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-950";
  }

  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "cyan") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function ActionButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
        "border-[color:var(--gush-border)] bg-white text-slate-700 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PillButton({ active = false, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
          : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function MetricCard({ label, value, hint, tone = "blue" }) {
  const toneClasses = {
    blue: "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f7f7f9)]",
    emerald: "border-emerald-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.95))]",
    amber: "border-amber-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.95))]",
    rose: "border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.95))]",
    cyan: "border-sky-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.95))]",
  };

  return (
    <div
      className={cn(
        "rounded-[24px] border px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]",
        toneClasses[tone] || toneClasses.blue,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">前台巡检</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{hint}</p>
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-white px-5 py-10 text-center shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">检查结果</p>
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function StatusPill({ children, tone = "slate" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "slate"
          ? "border-[color:var(--gush-border)] bg-white text-slate-600"
          : getToneClasses(tone),
      )}
    >
      {children}
    </span>
  );
}

export function LoadingView() {
  return (
    <AdminShell
      title="前台巡检"
      subtitle="按读者视角检查作品页。"
    >
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-[32px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`storefront-stat-${index}`} className="h-32 rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-[36rem] rounded-[28px]" />
          <Skeleton className="h-[28rem] rounded-[28px]" />
        </div>
      </div>
    </AdminShell>
  );
}
