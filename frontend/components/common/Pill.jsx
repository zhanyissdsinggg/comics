const palette = {
  dark: {
    default: "border-white/10 bg-white/[0.05] text-neutral-200",
    accent: "border-white/14 bg-white/[0.08] text-white",
    success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    subtle: "border-white/8 bg-white/[0.03] text-neutral-400",
  },
  light: {
    default: "border-black bg-white text-black/68",
    accent: "border-black bg-[#ffe500] text-black",
    success: "border-black bg-[#d9fff0] text-black/72",
    subtle: "border-black bg-[#fff6cf] text-black/55",
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
      className={`inline-flex items-center rounded-full border-[3px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${toneClass} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
