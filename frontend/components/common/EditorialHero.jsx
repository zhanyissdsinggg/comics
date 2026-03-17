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
      <div className="relative grid gap-6 px-5 py-6 sm:px-6 sm:py-7 xl:grid-cols-[minmax(0,1.08fr)_400px] xl:items-end">
        <div className="max-w-3xl">
          {eyebrow ? (
            <div className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-[0.94] tracking-tight text-white sm:text-5xl xl:text-[3.65rem]">
            {title}
          </h1>

          {description ? (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-200 sm:text-base">
              {description}
            </p>
          ) : null}

          {secondary ? (
            <div className="mt-6 max-w-2xl rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                Reader note
              </p>
              <p className="mt-3 text-sm leading-7 text-neutral-300">{secondary}</p>
            </div>
          ) : null}

          {actions ? (
            <div className="mt-7 flex flex-wrap gap-3 [&>a]:rounded-full [&>a]:px-5 [&>a]:py-2.5 [&>a]:shadow-[0_18px_50px_rgba(0,0,0,0.16)] [&>button]:rounded-full [&>button]:px-5 [&>button]:py-2.5 [&>button]:shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
              {actions}
            </div>
          ) : null}
        </div>

        {hasStats ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "rounded-[24px] border px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-lg",
                  index === 0
                    ? "border-emerald-400/20 bg-emerald-400/[0.08]"
                    : "border-white/10 bg-black/20",
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                  {stat.label}
                </p>
                <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-[2.2rem]">
                  {stat.value}
                </p>
                {stat.hint ? (
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{stat.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SurfacePanel>
  );
}
