"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import SurfacePanel from "./SurfacePanel";
import {
  storefrontInfoCardClass,
  storefrontSecondaryButtonClass,
} from "./StorefrontPagePrimitives";

export default function EditorialHero({
  eyebrow,
  title,
  description,
  posterDescription = description,
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
  const accentPillClass = isLight
    ? "border-[rgba(43,33,65,0.12)] bg-[rgba(255,255,255,0.82)] text-slate-700"
    : "border-white/12 bg-[rgba(255,255,255,0.035)] text-white/74";
  const statClass = isLight
    ? "border border-[rgba(29,29,31,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,250,252,0.92)_100%)] shadow-[0_14px_34px_rgba(58,44,86,0.1)]"
    : "border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.035)_100%)] shadow-[0_18px_40px_rgba(8,6,20,0.22)]";
  const posterShellClass = isLight
    ? "border-[rgba(43,33,65,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,241,250,0.88)_100%)]"
    : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]";
  const posterCoreClass = isLight
    ? "border-[rgba(43,33,65,0.12)] bg-[linear-gradient(160deg,rgba(255,255,255,1)_0%,rgba(248,243,252,0.94)_48%,rgba(244,239,248,0.9)_100%)]"
    : "border-white/12 bg-[linear-gradient(160deg,rgba(12,13,22,0.96)_0%,rgba(18,16,28,0.96)_48%,rgba(28,16,30,0.96)_100%)]";
  const posterGlowClass = isLight
    ? "bg-[radial-gradient(circle_at_24%_18%,rgba(255,79,154,0.12),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(103,232,249,0.18),transparent_32%)]"
    : "bg-[radial-gradient(circle_at_24%_18%,rgba(255,79,154,0.18),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(103,232,249,0.14),transparent_32%)]";

  return (
    <SurfacePanel
      className={cn("relative overflow-hidden p-0", className)}
      tone="highlight"
      accent={accent}
      appearance={resolvedAppearance}
    >
      <div className="relative grid gap-6 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2.5">
            {eyebrow ? (
              <p
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] backdrop-blur-xl",
                  accentPillClass,
                )}
              >
                <Sparkles className="size-3.5" />
                {eyebrow}
              </p>
            ) : null}
            {secondary ? (
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.18em]",
                  isLight ? "text-slate-500" : "text-white/44",
                )}
              >
                {secondary}
              </p>
            ) : null}
          </div>

          <h1
            className={cn(
              "mt-4 max-w-4xl font-display text-[2.35rem] font-semibold leading-[0.92] tracking-[-0.05em] sm:text-[2.9rem] xl:text-[4rem]",
              isLight ? "text-slate-950" : "text-white",
            )}
          >
            {title}
          </h1>

          {description ? (
            <p
              className={cn(
                "mt-4 max-w-2xl text-sm leading-[1.72] sm:text-[15px] sm:leading-[1.78]",
                isLight ? "text-slate-700" : "text-white/70",
              )}
            >
              {description}
            </p>
          ) : null}

          {actions ? (
            <div className="mt-6 flex flex-wrap gap-3 [&>a]:min-h-11 [&>a]:px-4 sm:[&>a]:px-5 [&>button]:min-h-11 [&>button]:px-4 sm:[&>button]:px-5">
              {actions}
            </div>
          ) : null}

          {hasStats ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  title={stat.hint || ""}
                  className={cn(
                    "min-w-[10rem] rounded-[24px] border px-4 py-4",
                    statClass,
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.22em]",
                      isLight ? "text-slate-500" : "text-white/46",
                    )}
                  >
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.04em]",
                      isLight ? "text-slate-950" : "text-white",
                    )}
                  >
                    {stat.value}
                  </p>
                  {stat.hint ? (
                    <p
                      className={cn(
                        "mt-1.5 max-w-[16rem] text-[13px] leading-[1.58]",
                        isLight ? "text-slate-500" : "text-white/54",
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

        <div className="hidden lg:block">
          <div className="relative mx-auto w-full max-w-[320px]">
            <div
              className={cn(
                "absolute inset-5 rounded-[34px] blur-3xl",
                posterGlowClass,
              )}
            />
            <div
              className={cn(
                "absolute inset-[18px] -rotate-[6deg] rounded-[30px] border",
                posterShellClass,
              )}
            />
            <div
              className={cn(
                "absolute inset-[10px] rotate-[4deg] rounded-[30px] border",
                posterShellClass,
              )}
            />
            <div
              className={cn(
                "relative overflow-hidden rounded-[32px] border px-5 py-5 shadow-[0_24px_68px_rgba(8,6,20,0.28)]",
                posterCoreClass,
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_22%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.18)_100%)]" />
              <div className="relative space-y-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    accentPillClass,
                  )}
                >
                  Featured
                </span>
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] p-4 backdrop-blur-xl">
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.2em]",
                      isLight ? "text-slate-500" : "text-white/48",
                    )}
                  >
                    Open Tonight
                  </p>
                  <p
                    className={cn(
                      "mt-3 font-display text-[1.55rem] font-semibold leading-[0.96] tracking-[-0.04em]",
                      isLight ? "text-slate-950" : "text-white",
                    )}
                  >
                    {title}
                  </p>
                  {posterDescription ? (
                    <p
                      className={cn(
                        "mt-3 text-sm leading-6",
                        isLight ? "text-slate-600" : "text-white/60",
                      )}
                    >
                      {posterDescription}
                    </p>
                  ) : null}
                </div>
                <div className={`flex items-center justify-between rounded-[20px] px-4 py-3 ${storefrontInfoCardClass}`}>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isLight ? "text-slate-600" : "text-white/72",
                    )}
                  >
                    Browse the shelf
                  </p>
                  <span className={`inline-flex h-9 w-9 items-center justify-center px-0 ${storefrontSecondaryButtonClass}`}>
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SurfacePanel>
  );
}
