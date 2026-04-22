"use client";

import { cn } from "@/lib/utils";
import Skeleton from "@/components/common/Skeleton";

export const pillIdleClassName =
  "rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950";

export const pillActiveClassName =
  "rounded-full border border-[color:var(--gush-border-strong)] bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]";

export function EmptyBlock({ title, description }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-5 py-7 text-center shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">工作区</p>
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
        "rounded-[26px] border px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]",
        accent
          ? "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f6f7fa)]"
          : "border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#fafafc)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">运营视图</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{label}</p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            accent
              ? "border-[color:var(--gush-border-strong)] bg-white text-slate-950"
              : "border-[color:var(--gush-border)] bg-white text-slate-500",
          )}
        >
          实时
        </span>
      </div>
      <p className="mt-4 text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

export function SectionHeader({ title, description, action = null, eyebrow = "工作区" }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
        <h2 className="text-[1.28rem] font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function QueueItem({ title, detail, meta, badge, tone = "default" }) {
  const toneClassName =
    tone === "warning"
      ? "bg-amber-100"
      : tone === "success"
        ? "bg-emerald-100"
        : tone === "accent"
          ? "bg-sky-100"
          : "bg-slate-200";

  return (
    <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,248,250,0.94))] px-4 py-4 shadow-[0_8px_22px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
      <div className="flex items-start gap-3">
        <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", toneClassName)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
            {badge ? (
              <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">{meta}</p>
        </div>
      </div>
    </div>
  );
}
