const palette = {
  dark: {
    default: "border-neutral-700 bg-white/[0.04] text-neutral-200",
    accent: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    subtle: "border-neutral-700 bg-neutral-900/70 text-neutral-400",
  },
  light: {
    default: "border-black/8 bg-white/84 text-slate-600",
    accent:
      "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] text-[var(--gush-accent,#2f6bff)]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    subtle: "border-black/6 bg-[#f8f9fc] text-slate-500",
  },
};

export default function Pill({
  children,
  className = "",
  appearance = "dark",
  tone = "default",
}) {
  const paletteSet = palette[appearance] || palette.dark;
  const toneClass = paletteSet[tone] || paletteSet.default;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${toneClass} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
