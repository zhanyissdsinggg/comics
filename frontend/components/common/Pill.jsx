const palette = {
  dark: {
    default: "border-white/10 bg-white/[0.05] text-neutral-200",
    accent: "border-white/14 bg-white/[0.08] text-white",
    success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    subtle: "border-white/8 bg-white/[0.03] text-neutral-400",
  },
  light: {
    default: "border-black/8 bg-white text-slate-600",
    accent:
      "border-[rgba(134,98,69,0.14)] bg-[rgba(134,98,69,0.07)] text-[var(--gush-accent,#866245)]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    subtle: "border-black/6 bg-[rgba(246,243,237,0.92)] text-slate-500",
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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${toneClass} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
