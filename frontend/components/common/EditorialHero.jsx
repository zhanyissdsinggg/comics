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
  const resolvedAppearance = appearance === "default" ? "dark" : appearance;
  const isLight = resolvedAppearance === "light";
  const statClass = isLight
    ? "border border-[rgba(29,29,31,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,250,252,0.92)_100%)] shadow-[0_14px_34px_rgba(58,44,86,0.1)]"
    : "border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.035)_100%)] shadow-[0_18px_40px_rgba(8,6,20,0.22)]";

  return (
    <SurfacePanel
      className={cn("relative overflow-hidden p-0", className)}
      tone="highlight"
      accent={accent}
      appearance={resolvedAppearance}
    >
      <div className="relative px-5 py-5 sm:px-6 sm:py-6">
        <div className="max-w-4xl">
          {eyebrow ? (
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.24em]",
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
                "mt-4 max-w-2xl text-sm leading-[1.72] sm:text-[15px] sm:leading-[1.78]",
                isLight ? "text-slate-700" : "text-neutral-200",
              )}
            >
              {description}
            </p>
          ) : null}

          {secondary ? (
            <p
              className={cn(
                "mt-2.5 max-w-xl text-sm leading-[1.68]",
                isLight ? "text-slate-500" : "text-neutral-400",
              )}
            >
              {secondary}
            </p>
          ) : null}

          {actions ? (
            <div className="mt-5 flex flex-wrap gap-3 [&>*:nth-child(n+3)]:hidden sm:[&>*:nth-child(n+3)]:inline-flex [&>a]:min-h-11 [&>a]:px-4 sm:[&>a]:px-5 [&>button]:min-h-11 [&>button]:px-4 sm:[&>button]:px-5">
              {actions}
            </div>
          ) : null}

          {hasStats ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  title={stat.hint || ""}
                  className={cn(
                    "min-w-[10rem] rounded-[22px] border px-4 py-3.5",
                    statClass,
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.22em]",
                      isLight ? "text-slate-500" : "text-neutral-400",
                    )}
                  >
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-display text-[1.28rem] font-semibold tracking-[-0.04em]",
                      isLight ? "text-slate-950" : "text-white",
                    )}
                  >
                    {stat.value}
                  </p>
                  {stat.hint ? (
                    <p
                      className={cn(
                        "mt-1.5 max-w-[16rem] text-[13px] leading-[1.58]",
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
      </div>
    </SurfacePanel>
  );
}
