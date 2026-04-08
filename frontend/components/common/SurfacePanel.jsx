"use client";

import { cn } from "@/lib/utils";

const toneClasses = {
  dark: {
    default: "border-white/10 bg-[rgba(11,15,22,0.9)] text-white",
    muted: "border-white/8 bg-[rgba(16,21,31,0.84)] text-white",
    highlight:
      "border-white/12 bg-[linear-gradient(180deg,rgba(14,19,28,0.92),rgba(10,14,21,0.9))] text-white",
    warning: "border-amber-400/20 bg-[rgba(59,41,13,0.9)] text-white",
    danger: "border-red-400/20 bg-[rgba(64,20,26,0.9)] text-white",
  },
  light: {
    default:
      "border-black/[0.055] bg-[rgba(255,252,247,0.68)] text-slate-900 backdrop-blur-2xl dark:border-white/8 dark:bg-[rgba(17,22,31,0.76)] dark:text-white",
    muted:
      "border-black/[0.05] bg-[rgba(250,246,239,0.58)] text-slate-900 backdrop-blur-[28px] dark:border-white/8 dark:bg-[rgba(20,26,37,0.72)] dark:text-white",
    highlight:
      "border-[rgba(134,98,69,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(250,246,239,0.72))] text-slate-900 backdrop-blur-[30px] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(20,27,38,0.84),rgba(14,20,29,0.78))] dark:text-white",
    warning:
      "border-amber-200 bg-[rgba(255,251,235,0.94)] text-slate-900 dark:border-amber-300/20 dark:bg-[rgba(59,43,16,0.9)] dark:text-white",
    danger:
      "border-red-200 bg-[rgba(255,241,242,0.94)] text-slate-900 dark:border-red-300/20 dark:bg-[rgba(66,24,30,0.9)] dark:text-white",
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
    emerald: "bg-emerald-500/42",
    cyan: "bg-cyan-500/38",
    amber: "bg-amber-500/42",
    rose: "bg-rose-500/42",
    blue: "bg-[rgba(134,98,69,0.42)]",
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
    blue: "bg-[radial-gradient(circle_at_top_left,rgba(134,98,69,0.07),transparent_30%)]",
    emerald:
      "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),transparent_30%)]",
    cyan: "bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.06),transparent_30%)]",
    amber:
      "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.06),transparent_30%)]",
    rose: "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.06),transparent_30%)]",
  },
};

export default function SurfacePanel({
  children,
  className = "",
  tone = "default",
  accent = "amber",
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
          "pointer-events-none absolute left-5 top-5 h-16 w-16 rounded-full blur-2xl sm:left-6 sm:top-6 sm:h-20 sm:w-20",
          accentEdgeClasses[resolvedAppearance]?.[accent] ||
            accentEdgeClasses[resolvedAppearance].blue,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-90",
          accentWashClasses[resolvedAppearance]?.[accent] ||
            accentWashClasses[resolvedAppearance].blue,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isLight
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.38),rgba(255,255,255,0.08)_28%,transparent_56%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_34%)]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_34%)]",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-[1px] rounded-[calc(var(--gush-radius-xl)-2px)]",
          isLight
            ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
            : "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        )}
      />
      <div className="relative">{children}</div>
    </section>
  );
}
