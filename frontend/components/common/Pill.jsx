const palette = {
  dark: {
    default: "border-white/20 bg-black text-neutral-200 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
    accent: "border-white/20 bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
    success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    subtle: "border-white/20 bg-[#0a0a0a] text-neutral-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
  },
  light: {
    // Keep "light" readable on dark surfaces, but still match the ZIP hard-edge style.
    default:
      "border-2 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    accent:
      "border-2 border-black bg-[#FFE500] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    success:
      "border-2 border-black bg-[#00E5FF] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    subtle:
      "border-2 border-black bg-white text-black/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
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
