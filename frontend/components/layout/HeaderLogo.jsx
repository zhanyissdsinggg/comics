"use client";

import Link from "next/link";
import Image from "next/image";
import { useBrandingStore } from "../../store/useBrandingStore";
import { siteConfig } from "../../lib/siteConfig";

const BRAND_SUBNOTE = "Comics and novels";

export default function HeaderLogo({ variant = "default" }) {
  const { branding } = useBrandingStore();
  const isLight = variant === "home" || variant === "light";

  return (
    <Link
      href="/"
      aria-label="Go to home"
      className={`group flex shrink-0 items-center gap-3 rounded-full px-2.5 py-2 text-left transition-all duration-300 ${
        isLight
          ? "border border-black/8 bg-white/78 shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:border-black/12 hover:bg-white"
          : "border border-white/8 bg-white/[0.03] shadow-[0_16px_44px_rgba(0,0,0,0.18)] hover:border-white/14 hover:bg-white/[0.06]"
      }`}
    >
      {branding?.siteLogoUrl ? (
        <span
          className={`flex h-11 items-center rounded-full px-3 transition-all duration-300 ${
            isLight
              ? "border border-black/8 bg-black/[0.03] group-hover:border-black/12 group-hover:bg-black/[0.04]"
              : "border border-white/10 bg-white/[0.04] group-hover:border-white/20 group-hover:bg-white/[0.08]"
          }`}
        >
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
        <span
          className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full transition-transform duration-300 group-hover:scale-[1.03] ${
            isLight
              ? "border border-black/8 bg-[linear-gradient(180deg,#ffffff,#f1f4f9)] shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
              : "border border-emerald-400/28 bg-[linear-gradient(135deg,rgba(16,185,129,0.24),rgba(34,211,238,0.12),rgba(255,255,255,0.03))] shadow-[0_16px_48px_rgba(16,185,129,0.16)]"
          }`}
        >
          <span
            className={`absolute inset-0 ${isLight ? "bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.12),transparent_28%)]" : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_28%)]"}`}
          />
          <span className={`relative font-display text-xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            {siteConfig.siteName.slice(0, 1)}
          </span>
        </span>
      )}

      <span className="hidden min-w-0 flex-col sm:flex">
        <span className={`font-display text-lg font-semibold leading-none tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
          {siteConfig.siteName}
        </span>
        {isLight ? null : (
          <span className="mt-1 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            {BRAND_SUBNOTE}
          </span>
        )}
      </span>
    </Link>
  );
}
