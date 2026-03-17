"use client";

import Link from "next/link";
import Image from "next/image";
import { useBrandingStore } from "../../store/useBrandingStore";
import { siteConfig } from "../../lib/siteConfig";

const BRAND_NOTE = "Official comics daily";
const BRAND_SUBNOTE = "Curated reads and premium drops";

export default function HeaderLogo() {
  const { branding } = useBrandingStore();

  return (
    <Link
      href="/"
      aria-label="Go to home"
      className="group flex shrink-0 items-center gap-3 rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-2.5 py-2 text-left shadow-[0_18px_60px_rgba(0,0,0,0.16)] transition-all duration-300 hover:border-white/14 hover:bg-white/[0.06]"
    >
      {branding?.siteLogoUrl ? (
        <span className="flex h-12 items-center rounded-[18px] border border-white/10 bg-white/[0.04] px-3 shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition-all duration-300 group-hover:border-emerald-400/20 group-hover:bg-white/[0.08]">
          <Image
            src={branding.siteLogoUrl}
            alt={`${siteConfig.siteName} logo`}
            width={120}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </span>
      ) : (
        <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] border border-emerald-400/30 bg-[linear-gradient(135deg,rgba(16,185,129,0.3),rgba(34,211,238,0.14),rgba(255,255,255,0.04))] shadow-[0_18px_60px_rgba(16,185,129,0.2)] transition-transform duration-300 group-hover:scale-[1.03]">
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_28%)]" />
          <span className="relative font-display text-xl font-bold tracking-tight text-white">
            {siteConfig.siteName.slice(0, 1)}
          </span>
        </span>
      )}

      <span className="hidden min-w-0 flex-col sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/75">
          {BRAND_NOTE}
        </span>
        <span className="mt-1 font-display text-lg font-semibold leading-none tracking-tight text-white">
          {siteConfig.siteName}
        </span>
        <span className="mt-1 text-[11px] text-neutral-400">{BRAND_SUBNOTE}</span>
      </span>
    </Link>
  );
}
