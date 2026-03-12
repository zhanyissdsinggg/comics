"use client";

import Link from "next/link";
import Image from "next/image";
import { useBrandingStore } from "../../store/useBrandingStore";
import { siteConfig } from "../../lib/siteConfig";

const BRAND_NOTE = "Curated reads daily";

export default function HeaderLogo() {
  const { branding } = useBrandingStore();

  return (
    <Link
      href="/"
      aria-label="Go to home"
      className="group flex shrink-0 items-center gap-3 rounded-full pr-1 text-left transition-transform duration-300 hover:scale-[1.01]"
    >
      {branding?.siteLogoUrl ? (
        <span className="flex h-11 items-center rounded-[18px] border border-white/10 bg-white/[0.04] px-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-all duration-300 group-hover:border-emerald-400/20 group-hover:bg-white/[0.08]">
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
        <span className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-emerald-400/30 bg-[linear-gradient(135deg,rgba(16,185,129,0.24),rgba(34,211,238,0.14),rgba(255,255,255,0.04))] shadow-[0_18px_60px_rgba(16,185,129,0.2)] transition-transform duration-300 group-hover:scale-[1.03]">
          <span className="font-display text-xl font-bold tracking-tight text-white">
            {siteConfig.siteName.slice(0, 1)}
          </span>
        </span>
      )}

      <span className="hidden min-w-0 flex-col sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/75">
          {BRAND_NOTE}
        </span>
        <span className="font-display text-lg font-semibold leading-none tracking-tight text-white">
          {siteConfig.siteName}
        </span>
      </span>
    </Link>
  );
}
