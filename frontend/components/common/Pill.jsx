const palette = {
  dark: {
    default:
      "border-white/12 bg-[rgba(255,255,255,0.05)] text-white/80 shadow-[0_12px_28px_rgba(8,6,20,0.2)]",
    accent:
      "border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.14)] text-[#ffd7e8] shadow-[0_12px_28px_rgba(255,79,154,0.16)]",
    success:
      "border-emerald-300/18 bg-emerald-300/10 text-emerald-100 shadow-[0_12px_28px_rgba(8,6,20,0.18)]",
    subtle:
      "border-white/10 bg-[rgba(255,255,255,0.03)] text-white/55 shadow-[0_10px_24px_rgba(8,6,20,0.16)]",
  },
  light: {
    default:
      "border-[rgba(31,24,41,0.12)] bg-white text-[#1c1624] shadow-[0_12px_26px_rgba(58,44,86,0.1)]",
    accent:
      "border-[rgba(255,79,154,0.18)] bg-[rgba(255,79,154,0.1)] text-[#8f2958] shadow-[0_12px_26px_rgba(255,79,154,0.1)]",
    success:
      "border-emerald-300/28 bg-emerald-100/80 text-emerald-700 shadow-[0_12px_26px_rgba(58,44,86,0.08)]",
    subtle:
      "border-[rgba(31,24,41,0.1)] bg-[rgba(255,255,255,0.7)] text-[#6d647a] shadow-[0_10px_22px_rgba(58,44,86,0.08)]",
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
