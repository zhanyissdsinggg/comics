"use client";

import { cn } from "@/lib/utils";

const toneClasses = {
  dark: {
    default: "border border-white/10 bg-[#111214] text-white",
    muted: "border border-white/10 bg-[#17181b] text-white",
    highlight: "border border-white/10 bg-[#111214] text-white",
    warning: "border border-amber-200/10 bg-[#1d1811] text-white",
    danger: "border border-rose-200/10 bg-[#1e1316] text-white",
  },
  light: {
    default:
      "border border-black/8 bg-white text-slate-900 backdrop-blur-none dark:border-white/10 dark:bg-[rgba(17,17,19,0.82)] dark:text-white",
    muted:
      "border border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900 backdrop-blur-none dark:border-white/10 dark:bg-[rgba(20,20,23,0.76)] dark:text-white",
    highlight:
      "border border-black/8 bg-[linear-gradient(180deg,#111214_0%,#1b1d22_100%)] text-white backdrop-blur-none dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(20,20,23,0.9),rgba(10,10,12,0.84))] dark:text-white",
    warning:
      "border border-amber-200/70 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8eb_100%)] text-slate-900 dark:border-amber-300/20 dark:bg-[rgba(59,43,16,0.9)] dark:text-white",
    danger:
      "border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] text-slate-900 dark:border-red-300/20 dark:bg-[rgba(66,24,30,0.9)] dark:text-white",
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
    emerald: "bg-emerald-200/60",
    cyan: "bg-sky-200/60",
    amber: "bg-amber-200/60",
    rose: "bg-rose-200/60",
    blue: "bg-sky-200/60",
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
    blue: "bg-[radial-gradient(circle_at_top_right,rgba(186,230,253,0.24),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(226,232,240,0.48),transparent_30%)]",
    emerald:
      "bg-[radial-gradient(circle_at_top_right,rgba(187,247,208,0.28),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(226,232,240,0.44),transparent_30%)]",
    cyan: "bg-[radial-gradient(circle_at_top_right,rgba(186,230,253,0.24),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(224,231,255,0.32),transparent_30%)]",
    amber:
      "bg-[radial-gradient(circle_at_top_right,rgba(253,230,138,0.24),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_30%)]",
    rose: "bg-[radial-gradient(circle_at_top_right,rgba(251,207,232,0.24),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_30%)]",
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
        "relative overflow-hidden rounded-[30px] border p-5 shadow-[0_20px_46px_rgba(15,23,42,0.08)] sm:p-6",
        toneClasses[resolvedAppearance]?.[tone] ||
          toneClasses[resolvedAppearance].default,
        isLight ? "" : "backdrop-blur-[24px]",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute left-5 top-5 h-12 w-12 rounded-full blur-2xl sm:left-6 sm:top-6 sm:h-14 sm:w-14",
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
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(255,255,255,0.12)_18%,transparent_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_34%)]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_34%)]",
        )}
      />
      <div className="relative">{children}</div>
    </section>
  );
}
