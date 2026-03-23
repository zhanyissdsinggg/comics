"use client";

import { cn } from "@/lib/utils";

const toneClasses = {
  dark: {
    default: "border-white/10 bg-[rgba(11,15,22,0.9)] text-white",
    muted: "border-white/8 bg-[rgba(16,21,31,0.84)] text-white",
    highlight: "border-white/12 bg-[linear-gradient(180deg,rgba(15,21,31,0.92),rgba(11,15,22,0.9))] text-white",
    warning: "border-amber-400/20 bg-[rgba(59,41,13,0.9)] text-white",
    danger: "border-red-400/20 bg-[rgba(64,20,26,0.9)] text-white",
  },
  light: {
    default: "border-black/8 bg-white/90 text-slate-900",
    muted: "border-black/6 bg-[rgba(246,243,237,0.88)] text-slate-900",
    highlight: "border-[rgba(49,87,214,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,250,252,0.94))] text-slate-900",
    warning: "border-amber-200 bg-[rgba(255,251,235,0.94)] text-slate-900",
    danger: "border-red-200 bg-[rgba(255,241,242,0.94)] text-slate-900",
  },
};

const accentLineClasses = {
  dark: {
    emerald: "via-emerald-300/60",
    cyan: "via-cyan-300/55",
    amber: "via-amber-300/55",
    rose: "via-rose-300/55",
    blue: "via-sky-300/55",
  },
  light: {
    emerald: "via-emerald-500/45",
    cyan: "via-cyan-500/42",
    amber: "via-amber-500/42",
    rose: "via-rose-500/42",
    blue: "via-[rgba(49,87,214,0.42)]",
  },
};

const cornerGlowClasses = {
  dark: {
    blue: "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%)]",
    emerald: "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%)]",
    cyan: "bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%)]",
    amber: "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_34%)]",
    rose: "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_34%)]",
  },
  light: {
    blue: "bg-[radial-gradient(circle_at_top_left,rgba(49,87,214,0.1),transparent_32%)]",
    emerald: "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_32%)]",
    cyan: "bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.08),transparent_32%)]",
    amber: "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_32%)]",
    rose: "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.08),transparent_32%)]",
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
        "relative overflow-hidden rounded-[30px] border p-5 shadow-[var(--gush-shadow-soft)] sm:p-6",
        toneClasses[resolvedAppearance]?.[tone] || toneClasses[resolvedAppearance].default,
        isLight ? "backdrop-blur-md" : "backdrop-blur-xl",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          accentLineClasses[resolvedAppearance]?.[accent] || accentLineClasses[resolvedAppearance].blue,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-90",
          cornerGlowClasses[resolvedAppearance]?.[accent] || cornerGlowClasses[resolvedAppearance].blue,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isLight
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.32),transparent_38%)]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_34%)]",
        )}
      />
      <div className="relative">{children}</div>
    </section>
  );
}
