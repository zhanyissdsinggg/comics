"use client";

export default function GenreChip({
  label,
  tone = "default",
  className = "",
}) {
  if (!label) {
    return null;
  }

  const toneClass =
    tone === "accent"
      ? "border-[rgba(255,122,176,0.28)] bg-[rgba(255,92,164,0.14)] text-white"
      : tone === "ghost"
        ? "border-white/10 bg-white/[0.05] text-white/76"
        : "border-white/12 bg-[rgba(11,14,23,0.52)] text-white/82";

  return (
    <span
      className={`inline-flex min-h-[30px] items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur-xl ${toneClass} ${className}`}
    >
      {label}
    </span>
  );
}
