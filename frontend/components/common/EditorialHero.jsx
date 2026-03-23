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
      <div className="relative grid gap-8 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.24em]",
                isLight ? "text-slate-500" : "text-neutral-400",
              )}
            >
              {eyebrow}
            </p>
          ) : null}

          <h1
            className={cn(
              "mt-3 max-w-4xl font-display text-[2rem] font-semibold leading-[0.96] tracking-tight sm:text-[2.45rem] xl:text-[3.15rem]",
              isLight ? "text-slate-950" : "text-white",
            )}
          >
            {title}
          </h1>

          {description ? (
            <p
              className={cn(
                "mt-4 max-w-2xl text-sm leading-7 sm:text-base",
                isLight ? "text-slate-600" : "text-neutral-200",
              )}
            >
              {description}
            </p>
          ) : null}

          {secondary ? (
            <p
              className={cn(
                "mt-3 max-w-2xl text-sm leading-6",
                isLight ? "text-slate-500" : "text-neutral-400",
              )}
            >
              {secondary}
            </p>
          ) : null}

          {actions ? (
            <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3 [&>*:nth-child(n+3)]:hidden sm:[&>*:nth-child(n+3)]:inline-flex [&>a]:min-h-11 [&>a]:rounded-full [&>a]:px-4 sm:[&>a]:px-5 [&>button]:min-h-11 [&>button]:rounded-full [&>button]:px-4 sm:[&>button]:px-5">
              {actions}
            </div>
          ) : null}
        </div>

        {hasStats ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 xl:gap-0 xl:divide-y xl:divide-black/8 [&>*:nth-child(n+3)]:hidden sm:[&>*:nth-child(n+3)]:block">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                title={stat.hint || ""}
                className={cn(
                  "rounded-[22px] border px-4 py-4 xl:rounded-none xl:border-0 xl:px-0 xl:py-4",
                  isLight
                    ? index === 0
                      ? "border-[rgba(49,87,214,0.14)] bg-[rgba(49,87,214,0.07)]"
                      : "border-black/6 bg-white/78"
                    : "border-white/10 bg-white/[0.04]",
                )}
              >
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.22em]",
                    isLight ? "text-slate-500" : "text-neutral-400",
                  )}
                >
                  {stat.label}
                </p>
                <p
                  className={cn(
                    "mt-2 font-display text-2xl font-semibold tracking-tight",
                    isLight ? "text-slate-950" : "text-white",
                  )}
                >
                  {stat.value}
                </p>
                {stat.hint ? (
                  <p
                    className={cn(
                      "mt-2 text-sm leading-6",
                      isLight ? "text-slate-500" : "text-neutral-400",
                    )}
                  >
                    {stat.hint}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SurfacePanel>
  );
}
