"use client";

import { cn } from "@/lib/utils";

const toneClasses = {
  dark: {
    default: "border-white/10 bg-[rgba(11,15,22,0.9)] text-white",
    muted: "border-white/8 bg-[rgba(16,21,31,0.84)] text-white",
    highlight: "border-white/12 bg-[linear-gradient(180deg,rgba(14,19,28,0.92),rgba(10,14,21,0.9))] text-white",
    warning: "border-amber-400/20 bg-[rgba(59,41,13,0.9)] text-white",
    danger: "border-red-400/20 bg-[rgba(64,20,26,0.9)] text-white",
  },
  light: {
    default: "border-black/8 bg-[rgba(255,255,255,0.9)] text-slate-900",
    muted: "border-black/6 bg-[rgba(250,247,241,0.92)] text-slate-900",
    highlight: "border-[rgba(47,88,198,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(250,247,241,0.94))] text-slate-900",
    warning: "border-amber-200 bg-[rgba(255,251,235,0.94)] text-slate-900",
    danger: "border-red-200 bg-[rgba(255,241,242,0.94)] text-slate-900",
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
    blue: "bg-[rgba(47,88,198,0.42)]",
  },
};

const accentWashClasses = {
  dark: {
    blue: "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%)]",
    emerald: "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%)]",
    cyan: "bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%)]",
    amber: "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_34%)]",
    rose: "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.12),transparent_34%)]",
  },
  light: {
    blue: "bg-[radial-gradient(circle_at_top_left,rgba(47,88,198,0.07),transparent_30%)]",
    emerald: "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),transparent_30%)]",
    cyan: "bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.06),transparent_30%)]",
    amber: "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.06),transparent_30%)]",
    rose: "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.06),transparent_30%)]",
  },
};

export default function SurfacePanel({
  children,
  className = "",
  tone = "default",
  accent = "blue",
  appearance = "default",
}) {
  const isLight = appearance === "light";
  const resolvedAppearance = isLight ? "light" : "dark";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[var(--gush-radius-xl)] border p-5 shadow-[var(--gush-shadow-soft)] sm:p-6",
        toneClasses[resolvedAppearance]?.[tone] || toneClasses[resolvedAppearance].default,
        isLight ? "" : "backdrop-blur-xl",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute left-5 top-0 h-px w-16 rounded-full sm:left-6 sm:w-20",
          accentEdgeClasses[resolvedAppearance]?.[accent] || accentEdgeClasses[resolvedAppearance].blue,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-85",
          accentWashClasses[resolvedAppearance]?.[accent] || accentWashClasses[resolvedAppearance].blue,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isLight
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_36%)]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_34%)]",
        )}
      />
      <div className="relative">{children}</div>
    </section>
  );
}
