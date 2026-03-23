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
  appearance = "default",
  accent = "blue",
}) {
  const hasStats = Array.isArray(stats) && stats.length > 0;
  const isLight = appearance === "light";

  return (
    <SurfacePanel
      className={cn("relative overflow-hidden p-0", className)}
      tone="highlight"
      accent={accent}
      appearance={appearance}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isLight
            ? "bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.12),transparent_30%),radial-gradient(circle_at_84%_14%,rgba(255,255,255,0.76),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent_40%,rgba(255,255,255,0.14))]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_84%_14%,rgba(34,211,238,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_38%,rgba(255,255,255,0.02))]",
        )}
      />
      <div className="relative grid gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
        <div className="max-w-3xl">
          {eyebrow ? (
            <div
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em]",
                isLight
                  ? "border border-black/6 bg-white/80 text-slate-500"
                  : "border border-white/12 bg-black/20 text-emerald-200",
              )}
            >
              {eyebrow}
            </div>
          ) : null}

          <h1
            className={cn(
              "mt-3 max-w-4xl font-display text-[2rem] font-semibold leading-[0.96] tracking-tight sm:mt-4 sm:text-4xl xl:text-[3.1rem]",
              isLight ? "text-slate-950" : "text-white",
            )}
          >
            {title}
          </h1>

          {description ? (
            <p
              className={cn(
                "mt-2.5 max-w-2xl text-sm leading-6 sm:mt-3 sm:text-base",
                isLight ? "text-slate-600" : "text-neutral-200",
              )}
            >
              {description}
            </p>
          ) : null}

          {secondary ? (
            <p
              className={cn(
                "mt-2.5 max-w-2xl text-sm leading-6 sm:mt-3",
                isLight ? "text-slate-500" : "text-neutral-400",
              )}
            >
              {secondary}
            </p>
          ) : null}

          {actions ? (
            <div className="mt-4 flex flex-wrap gap-2.5 sm:mt-5 sm:gap-3 [&>*:nth-child(n+3)]:hidden sm:[&>*:nth-child(n+3)]:inline-flex [&>a]:min-h-11 [&>a]:rounded-full [&>a]:px-4 [&>a]:py-2.5 [&>a]:shadow-[0_18px_50px_rgba(0,0,0,0.16)] sm:[&>a]:px-5 [&>button]:min-h-11 [&>button]:rounded-full [&>button]:px-4 [&>button]:py-2.5 [&>button]:shadow-[0_18px_50px_rgba(0,0,0,0.16)] sm:[&>button]:px-5">
              {actions}
            </div>
          ) : null}
        </div>

        {hasStats ? (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-2 [&>*:nth-child(n+3)]:hidden sm:[&>*:nth-child(n+3)]:block">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                title={stat.hint || ""}
                className={cn(
                  "rounded-[20px] border px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-lg",
                  isLight
                    ? index === 0
                      ? "border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.08)] shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
                      : "border-black/6 bg-white/80 shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
                    : index === 0
                      ? "border-emerald-400/20 bg-emerald-400/[0.08]"
                      : "border-white/10 bg-black/20",
                )}
              >
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.28em]",
                    isLight ? "text-slate-500" : "text-neutral-400",
                  )}
                >
                  {stat.label}
                </p>
                <p
                  className={cn(
                    "mt-2 font-display text-2xl font-semibold tracking-tight sm:text-[1.9rem]",
                    isLight ? "text-slate-950" : "text-white",
                  )}
                >
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
