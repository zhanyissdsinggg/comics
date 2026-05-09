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
    ? "border border-[rgba(29,29,31,0.12)] bg-[rgba(255,255,255,0.94)] shadow-[0_14px_34px_rgba(58,44,86,0.1)]"
    : "border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_14px_34px_rgba(8,6,20,0.2)]";

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
                "text-[11px] font-semibold uppercase tracking-[0.24em]",
                isLight ? "text-white/80" : "text-neutral-400",
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
                isLight ? "text-white/90" : "text-neutral-200",
              )}
            >
              {description}
            </p>
          ) : null}

          {secondary ? (
            <p
              className={cn(
                "mt-2.5 max-w-xl text-sm leading-6",
                isLight ? "text-white/70" : "text-neutral-400",
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
                      "text-[11px] font-semibold uppercase tracking-[0.22em]",
                      isLight ? "text-white/60" : "text-neutral-400",
                    )}
                  >
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-display text-[1.32rem] font-black uppercase tracking-[-0.04em]",
                      "text-white",
                    )}
                  >
                    {stat.value}
                  </p>
                  {stat.hint ? (
                    <p
                      className={cn(
                        "mt-1.5 max-w-[16rem] text-[13px] leading-5",
                        isLight ? "text-white/68" : "text-neutral-400",
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
