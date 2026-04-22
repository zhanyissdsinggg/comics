"use client";

import Skeleton from "@/components/common/Skeleton";
import { cn } from "@/lib/utils";

import AdminShell from "../AdminShell";

export function getToneClasses(tone) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (tone === "rose") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

export function ActionButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
        "border-[color:var(--gush-border)] bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.035)] ring-1 ring-black/[0.02] hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950",
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
    blue: "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,247,255,0.94))]",
    emerald: "border-emerald-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(236,253,245,0.92))]",
    cyan: "border-sky-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(240,249,255,0.92))]",
    amber: "border-amber-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,251,235,0.92))]",
    rose: "border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,241,242,0.92))]",
  };

  return (
    <div
      className={cn(
        "rounded-[24px] border px-5 py-5 shadow-[0_14px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]",
        toneClasses[tone] || toneClasses.blue,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">首页编排</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{hint}</p>
    </div>
  );
}

export function MiniMetric({ label, value, hint }) {
  return (
    <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,246,248,0.92))] px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-6 text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,246,248,0.9))] px-5 py-10 text-center ring-1 ring-black/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">工作区</p>
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function LoadingView() {
  return (
    <AdminShell
      title="首页编排"
      subtitle="把首页推荐位当成编辑工作区来维护。"
    >
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-[32px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`merchandising-stat-${index}`} className="h-32 rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="h-[34rem] rounded-[28px]" />
        <Skeleton className="h-[36rem] rounded-[28px]" />
      </div>
    </AdminShell>
  );
}
