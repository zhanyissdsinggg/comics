"use client";

import { cn } from "@/lib/utils";

const toneClasses = {
  dark: {
    default: "border-[3px] border-black bg-black text-white",
    muted: "border-[3px] border-black bg-[#141414] text-white",
    highlight: "border-[3px] border-black bg-black text-white",
    warning: "border-[3px] border-black bg-[#2b2214] text-white",
    danger: "border-[3px] border-black bg-[#2a1318] text-white",
  },
  light: {
    default:
      "border-[3px] border-black bg-white text-slate-900 backdrop-blur-none dark:border-white/8 dark:bg-[rgba(17,17,19,0.82)] dark:text-white",
    muted:
      "border-[3px] border-black bg-[#fff6cf] text-slate-900 backdrop-blur-none dark:border-white/8 dark:bg-[rgba(20,20,23,0.76)] dark:text-white",
    highlight:
      "border-[3px] border-black bg-[#ff007a] text-white backdrop-blur-none dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(20,20,23,0.9),rgba(10,10,12,0.84))] dark:text-white",
    warning:
      "border-[3px] border-black bg-[#fff1d6] text-slate-900 dark:border-amber-300/20 dark:bg-[rgba(59,43,16,0.9)] dark:text-white",
    danger:
      "border-[3px] border-black bg-[#ffe7ec] text-slate-900 dark:border-red-300/20 dark:bg-[rgba(66,24,30,0.9)] dark:text-white",
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
    emerald: "bg-[#00ff88]",
    cyan: "bg-[#00e5ff]",
    amber: "bg-[#ffe500]",
    rose: "bg-[#ff7db6]",
    blue: "bg-[#ffe500]",
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
    blue: "bg-[radial-gradient(circle_at_top_right,rgba(255,229,0,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(0,229,255,0.16),transparent_28%)]",
    emerald:
      "bg-[radial-gradient(circle_at_top_right,rgba(0,255,136,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,229,0,0.16),transparent_28%)]",
    cyan: "bg-[radial-gradient(circle_at_top_right,rgba(0,229,255,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,0,122,0.16),transparent_28%)]",
    amber:
      "bg-[radial-gradient(circle_at_top_right,rgba(255,229,0,0.24),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,0,122,0.12),transparent_28%)]",
    rose: "bg-[radial-gradient(circle_at_top_right,rgba(255,0,122,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,229,0,0.16),transparent_28%)]",
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
        "relative overflow-hidden border p-5 shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:p-6",
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
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0)_18%,transparent_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_34%)]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_34%)]",
        )}
      />
      <div className="relative">{children}</div>
    </section>
  );
}
