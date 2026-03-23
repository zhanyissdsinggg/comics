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
      <div className="relative grid gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)] xl:items-start">
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
              "mt-3 max-w-4xl font-display text-[1.95rem] font-semibold leading-[0.96] tracking-tight sm:text-[2.35rem] xl:text-[3rem]",
              isLight ? "text-slate-950" : "text-white",
            )}
          >
            {title}
          </h1>

          {description ? (
            <p
              className={cn(
                "mt-4 max-w-2xl text-sm leading-6 sm:text-[15px] sm:leading-7",
                isLight ? "text-slate-600" : "text-neutral-200",
              )}
            >
              {description}
            </p>
          ) : null}

          {secondary ? (
            <p
              className={cn(
                "mt-2.5 max-w-xl text-sm leading-6",
                isLight ? "text-slate-500" : "text-neutral-400",
              )}
            >
              {secondary}
            </p>
          ) : null}

          {actions ? (
            <div className="mt-5 flex flex-wrap gap-2.5 [&>*:nth-child(n+3)]:hidden sm:[&>*:nth-child(n+3)]:inline-flex [&>a]:min-h-11 [&>a]:rounded-full [&>a]:px-4 sm:[&>a]:px-5 [&>button]:min-h-11 [&>button]:rounded-full [&>button]:px-4 sm:[&>button]:px-5">
              {actions}
            </div>
          ) : null}
        </div>

        {hasStats ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 xl:gap-3 [&>*:nth-child(n+3)]:hidden sm:[&>*:nth-child(n+3)]:block">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                title={stat.hint || ""}
                className={cn(
                  "rounded-[20px] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]",
                  isLight
                    ? index === 0
                      ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.06)]"
                      : "border-black/6 bg-white/76"
                    : "border-white/10 bg-white/[0.04] shadow-none",
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
                    "mt-2 font-display text-[1.55rem] font-semibold tracking-tight",
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
