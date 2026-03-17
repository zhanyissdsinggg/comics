"use client";

import { cn } from "@/lib/utils";

const toneClasses = {
  default:
    "border-white/10 bg-[linear-gradient(180deg,rgba(15,21,31,0.92),rgba(7,10,16,0.98))]",
  muted:
    "border-white/8 bg-[linear-gradient(180deg,rgba(15,19,28,0.84),rgba(8,11,16,0.94))]",
  highlight:
    "border-emerald-400/18 bg-[linear-gradient(180deg,rgba(11,32,29,0.9),rgba(7,13,18,0.98))]",
};

const accentClasses = {
  emerald: "via-emerald-300/55",
  cyan: "via-cyan-300/50",
  amber: "via-amber-300/50",
  rose: "via-rose-300/50",
};

export default function SurfacePanel({
  children,
  className = "",
  tone = "default",
  accent = "emerald",
}) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-[30px] border p-5 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6",
        toneClasses[tone] || toneClasses.default,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-80",
          accentClasses[accent] || accentClasses.emerald,
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_86%_0%,rgba(16,185,129,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_24%,transparent_76%,rgba(255,255,255,0.03))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:30px_30px]" />
      <div className="relative">{children}</div>
    </section>
  );
}
