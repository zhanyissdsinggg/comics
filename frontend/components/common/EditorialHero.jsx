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
  const statClass =
    "border-2 border-black bg-[#111111] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

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
                "text-white font-black uppercase tracking-[-0.05em]",
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
