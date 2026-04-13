"use client";

import { cn } from "@/lib/utils";

const toneClasses = {
  dark: {
    default: "border-white/10 bg-[rgba(10,10,12,0.9)] text-white",
    muted: "border-white/8 bg-[rgba(14,14,16,0.88)] text-white",
    highlight:
      "border-white/12 bg-[linear-gradient(180deg,rgba(12,12,14,0.96),rgba(8,8,10,0.94))] text-white",
    warning: "border-white/10 bg-[rgba(22,18,14,0.9)] text-white",
    danger: "border-white/10 bg-[rgba(24,16,18,0.9)] text-white",
  },
  light: {
    default:
      "border-black/[0.055] bg-white text-slate-900 backdrop-blur-none dark:border-white/8 dark:bg-[rgba(17,17,19,0.82)] dark:text-white",
    muted:
      "border-black/[0.055] bg-white text-slate-900 backdrop-blur-none dark:border-white/8 dark:bg-[rgba(20,20,23,0.76)] dark:text-white",
    highlight:
      "border-black/[0.06] bg-white text-slate-900 backdrop-blur-none dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(20,20,23,0.9),rgba(10,10,12,0.84))] dark:text-white",
    warning:
      "border-[rgba(176,95,0,0.16)] bg-white text-slate-900 dark:border-amber-300/20 dark:bg-[rgba(59,43,16,0.9)] dark:text-white",
    danger:
      "border-[rgba(197,40,40,0.16)] bg-white text-slate-900 dark:border-red-300/20 dark:bg-[rgba(66,24,30,0.9)] dark:text-white",
  },
};

const accentEdgeClasses = {
  dark: {
    emerald: "bg-emerald-300/55",
    cyan: "bg-cyan-300/52",
    amber: "bg-amber-300/52",
    rose: "bg-rose-300/52",
    blue: "bg-sky-300/55",
  },
  light: {
    emerald: "bg-transparent",
    cyan: "bg-transparent",
    amber: "bg-transparent",
    rose: "bg-transparent",
    blue: "bg-transparent",
  },
};

const accentWashClasses = {
  dark: {
    blue: "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%)]",
    emerald:
      "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%)]",
    cyan: "bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%)]",
    amber:
      "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_34%)]",
    rose: "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.12),transparent_34%)]",
  },
  light: {
    blue: "bg-transparent",
    emerald: "bg-transparent",
    cyan: "bg-transparent",
    amber: "bg-transparent",
    rose: "bg-transparent",
  },
};

export default function SurfacePanel({
  children,
  className = "",
  tone = "default",
  accent = "blue",
  appearance = "default",
}) {
  const resolvedAppearance = appearance === "default" ? "light" : appearance;
  const isLight = resolvedAppearance === "light";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[var(--gush-radius-xl)] border p-5 shadow-[var(--gush-shadow-soft)] sm:p-6",
        toneClasses[resolvedAppearance]?.[tone] ||
          toneClasses[resolvedAppearance].default,
        isLight ? "" : "backdrop-blur-[24px]",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute left-5 top-5 h-12 w-12 rounded-full blur-2xl sm:left-6 sm:top-6 sm:h-14 sm:w-14",
          isLight && "hidden",
          accentEdgeClasses[resolvedAppearance]?.[accent] ||
            accentEdgeClasses[resolvedAppearance].blue,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-80",
          accentWashClasses[resolvedAppearance]?.[accent] ||
            accentWashClasses[resolvedAppearance].blue,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isLight
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0)_18%,transparent_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_34%)]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_34%)]",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-[1px] rounded-[calc(var(--gush-radius-xl)-2px)]",
          isLight
            ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
            : "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        )}
      />
      <div className="relative">{children}</div>
    </section>
  );
}
