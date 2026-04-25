const palette = {
  dark: {
    default: "border-white/10 bg-white/[0.05] text-neutral-200",
    accent: "border-white/20 bg-white/10 text-white",
    success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    subtle: "border-white/10 bg-white/[0.03] text-neutral-400",
  },
  light: {
    default: "border-black/10 bg-white text-black/68 shadow-[0_8px_18px_rgba(15,23,42,0.06)]",
    accent: "border-black/12 bg-[#f6f7f9] text-black shadow-[0_10px_22px_rgba(15,23,42,0.08)]",
    success: "border-emerald-200/70 bg-emerald-50 text-black/72 shadow-[0_10px_22px_rgba(16,185,129,0.08)]",
    subtle: "border-black/10 bg-[#f6f7f9] text-black/55",
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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${toneClass} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
