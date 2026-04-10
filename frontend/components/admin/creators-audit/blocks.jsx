"use client";

import { cn } from "@/lib/utils";
import Skeleton from "@/components/common/Skeleton";

import AdminShell from "../AdminShell";

export function ActionButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
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
          ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950"
          : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function MetricCard({ title, value, hint, tone = "blue" }) {
  const toneClasses = {
    blue: "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)]",
    emerald: "border-emerald-200 bg-emerald-50/90",
    amber: "border-amber-200 bg-amber-50/90",
    rose: "border-rose-200 bg-rose-50/90",
  };

  return (
    <div
      className={cn(
        "rounded-[24px] border px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]",
        toneClasses[tone] || toneClasses.blue,
      )}
    >
      <p className="text-sm text-slate-600">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{hint}</p>
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-5 py-10 text-center">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function StatusPill({ children, tone = "slate" }) {
  const toneClasses = {
    slate: "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-slate-600",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    blue: "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone] || toneClasses.slate,
      )}
    >
      {children}
    </span>
  );
}

export function LoadingView() {
  return (
    <AdminShell
      title="创作者"
      subtitle="正在整理创作者署名、命名和前台身份数据。"
    >
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-[32px]" />
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`creator-metric-${index}`} className="h-32 rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-[28px]" />
          <Skeleton className="h-80 rounded-[28px]" />
        </div>
        <Skeleton className="h-[28rem] rounded-[28px]" />
      </div>
    </AdminShell>
  );
}
