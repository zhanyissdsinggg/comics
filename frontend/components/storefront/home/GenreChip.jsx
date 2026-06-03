"use client";

import { cn } from "@/lib/utils";
import {
  storefrontHomeAccentChipClass,
  storefrontHomeChipClass,
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
      ? storefrontHomeAccentChipClass
      : tone === "ghost"
        ? `${storefrontHomeChipClass} bg-[rgba(255,255,255,0.03)] text-[color:var(--gush-home-text-secondary)]`
        : storefrontHomeChipClass;

  return (
    <span
      className={cn("justify-center whitespace-nowrap", toneClass, className)}
    >
      {label}
    </span>
  );
}
