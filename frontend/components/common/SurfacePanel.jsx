"use client";

import { cn } from "@/lib/utils";

const toneClasses = {
  dark: {
    default:
      "border border-white/10 bg-[rgba(17,16,29,0.82)] text-white shadow-[0_18px_48px_rgba(8,6,20,0.32)]",
    muted:
      "border border-white/10 bg-[rgba(20,18,33,0.9)] text-white shadow-[0_18px_46px_rgba(8,6,20,0.28)]",
    highlight:
      "border border-[rgba(255,179,208,0.24)] bg-[linear-gradient(180deg,rgba(25,22,39,0.98)_0%,rgba(17,16,29,0.96)_100%)] text-white shadow-[0_22px_56px_rgba(10,8,24,0.34)]",
    warning: "border border-amber-200/10 bg-[#1d1811] text-white",
    danger: "border border-rose-200/10 bg-[#1e1316] text-white",
  },
  light: {
    default:
      "border border-[rgba(43,33,65,0.12)] bg-[rgba(255,252,247,0.94)] text-black shadow-[0_18px_42px_rgba(58,44,86,0.12)]",
    muted:
      "border border-[rgba(43,33,65,0.1)] bg-[rgba(251,248,244,0.98)] text-black shadow-[0_14px_36px_rgba(58,44,86,0.1)]",
    highlight:
      "border border-[rgba(255,130,173,0.22)] bg-[linear-gradient(180deg,rgba(255,247,244,0.98)_0%,rgba(255,240,246,0.96)_100%)] text-black shadow-[0_16px_38px_rgba(76,51,93,0.12)]",
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
  const resolvedAppearance = appearance === "default" ? "dark" : appearance;
  const isLight = resolvedAppearance === "light";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] p-5 sm:p-6",
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
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.46),transparent_52%)]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_36%)]",
        )}
      />
      <div className="pointer-events-none absolute inset-[1px] rounded-[27px] border border-white/6" />
      <div className="relative">{children}</div>
    </section>
  );
}
