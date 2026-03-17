"use client";

import { cn } from "@/lib/utils";
import SurfacePanel from "./SurfacePanel";

export default function EditorialHero({
  eyebrow,
  title,
  description,
  secondary,
  actions = null,
  stats = [],
  className = "",
}) {
  const hasStats = Array.isArray(stats) && stats.length > 0;

  return (
    <SurfacePanel
      className={cn("relative overflow-hidden p-0", className)}
      tone="highlight"
      accent="cyan"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_84%_14%,rgba(34,211,238,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_38%,rgba(255,255,255,0.02))]" />
      <div className="relative grid gap-5 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
        <div className="max-w-3xl">
          {eyebrow ? (
            <div className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="mt-4 max-w-4xl font-display text-3xl font-semibold leading-[0.96] tracking-tight text-white sm:text-4xl xl:text-[3.1rem]">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-200 sm:text-base">
              {description}
            </p>
          ) : null}

          {secondary ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              {secondary}
            </p>
          ) : null}

          {actions ? (
            <div className="mt-5 flex flex-wrap gap-3 [&>a]:rounded-full [&>a]:px-5 [&>a]:py-2.5 [&>a]:shadow-[0_18px_50px_rgba(0,0,0,0.16)] [&>button]:rounded-full [&>button]:px-5 [&>button]:py-2.5 [&>button]:shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
              {actions}
            </div>
          ) : null}
        </div>

        {hasStats ? (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-2">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                title={stat.hint || ""}
                className={cn(
                  "rounded-[20px] border px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-lg",
                  index === 0
                    ? "border-emerald-400/20 bg-emerald-400/[0.08]"
                    : "border-white/10 bg-black/20",
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                  {stat.label}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-[1.9rem]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SurfacePanel>
  );
}
