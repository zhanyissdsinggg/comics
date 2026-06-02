"use client";

import {
  storefrontAccentChipClass,
  storefrontBadgeClass,
} from "../../common/StorefrontPagePrimitives";

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
      ? `${storefrontAccentChipClass} min-h-[30px] px-3 py-1.5 text-white`
      : tone === "ghost"
        ? `${storefrontBadgeClass} min-h-[30px] px-3 py-1.5 text-white/76`
        : "border-white/12 bg-[rgba(11,14,23,0.52)] text-white/82";

  return (
    <span
      className={`inline-flex min-h-[30px] items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur-xl ${toneClass} ${className}`}
    >
      {label}
    </span>
  );
}
