"use client";

import { cn } from "@/lib/utils";
import Skeleton from "@/components/common/Skeleton";

export const pillIdleClassName =
  "rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950";

export const pillActiveClassName =
  "rounded-full border border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] px-4 py-2 text-sm font-semibold text-slate-950";

export function EmptyBlock({ title, description }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-6 text-center">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function LoadingView() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-[32px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={`dashboard-stat-${index}`} className="h-32 rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

export function StatCard({ label, value, detail, accent = false }) {
  return (
    <article
      className={cn(
        "rounded-[24px] border px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]",
        accent
          ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)]"
          : "border-[color:var(--gush-border)] bg-white/92",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-[1.9rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

export function SectionHeader({ title, description, action = null }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[1.28rem] font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function QueueItem({ title, detail, meta, badge }) {
  return (
    <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
        </div>
        {badge ? (
          <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{meta}</p>
    </div>
  );
}
