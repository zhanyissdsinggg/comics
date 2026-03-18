"use client";

import { cn } from "@/lib/utils";

const toneClasses = {
  dark: {
    default:
      "border-white/10 bg-[linear-gradient(180deg,rgba(15,21,31,0.92),rgba(7,10,16,0.98))]",
    muted:
      "border-white/8 bg-[linear-gradient(180deg,rgba(15,19,28,0.84),rgba(8,11,16,0.94))]",
    highlight:
      "border-emerald-400/18 bg-[linear-gradient(180deg,rgba(11,32,29,0.9),rgba(7,13,18,0.98))]",
    warning:
      "border-amber-400/18 bg-[linear-gradient(180deg,rgba(49,36,18,0.9),rgba(20,14,8,0.98))]",
    danger:
      "border-red-400/18 bg-[linear-gradient(180deg,rgba(56,18,24,0.9),rgba(22,10,14,0.98))]",
  },
  light: {
    default:
      "border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,252,0.98))]",
    muted:
      "border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,253,0.96))]",
    highlight:
      "border-[rgba(47,107,255,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,246,255,0.98))]",
    warning:
      "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,247,237,0.98))]",
    danger:
      "border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.98))]",
  },
};

const accentClasses = {
  dark: {
    emerald: "via-emerald-300/55",
    cyan: "via-cyan-300/50",
    amber: "via-amber-300/50",
    rose: "via-rose-300/50",
    blue: "via-sky-300/50",
  },
  light: {
    emerald: "via-emerald-500/35",
    cyan: "via-cyan-500/35",
    amber: "via-amber-500/35",
    rose: "via-rose-500/35",
    blue: "via-[rgba(47,107,255,0.36)]",
  },
};

export default function SurfacePanel({
  children,
  className = "",
  tone = "default",
  accent = "emerald",
  appearance = "default",
}) {
  const isLight = appearance === "light";
  const resolvedAppearance = isLight ? "light" : "dark";

  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-[30px] border p-5 sm:p-6",
        isLight
          ? "shadow-[0_22px_52px_rgba(15,23,42,0.06)] backdrop-blur-xl"
          : "shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl",
        toneClasses[resolvedAppearance]?.[tone] || toneClasses[resolvedAppearance].default,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-80",
          accentClasses[resolvedAppearance]?.[accent] || accentClasses[resolvedAppearance].emerald,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isLight
            ? "bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.06),transparent_28%),radial-gradient(circle_at_86%_0%,rgba(255,255,255,0.68),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.6),transparent_24%,transparent_76%,rgba(255,255,255,0.24))]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_86%_0%,rgba(16,185,129,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_24%,transparent_76%,rgba(255,255,255,0.03))]",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isLight
            ? "opacity-[0.04] [background-image:linear-gradient(rgba(15,23,42,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.24)_1px,transparent_1px)] [background-size:30px_30px]"
            : "opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:30px_30px]",
        )}
      />
      <div className="relative">{children}</div>
    </section>
  );
}
