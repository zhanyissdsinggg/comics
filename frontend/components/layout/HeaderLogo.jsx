"use client";

import Link from "next/link";
import Image from "next/image";
import { useBrandingStore } from "../../store/useBrandingStore";
import { siteConfig } from "../../lib/siteConfig";

const BRAND_SUBNOTE = "Comics and novels";

export default function HeaderLogo({ variant = "default" }) {
  const { branding } = useBrandingStore();
  const isHome = variant === "home";
  const isLight = variant === "light";

  return (
    <Link
      href="/"
      aria-label="Go to home"
      className="group flex shrink-0 items-center gap-3 rounded-full pr-2 text-left transition-all duration-300"
    >
      {branding?.siteLogoUrl ? (
        <span
          className={`flex h-10 items-center rounded-[18px] px-3 transition-all duration-300 ${
            isHome
              ? "border border-white/10 bg-white/[0.04] shadow-[0_18px_36px_rgba(0,0,0,0.18)] group-hover:border-white/18 group-hover:bg-white/[0.07]"
              : isLight
                ? "border border-black/8 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] group-hover:border-black/12 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_16px_30px_rgba(0,0,0,0.22)] dark:group-hover:border-white/18"
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
          className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[18px] transition-transform duration-300 group-hover:scale-[1.02] ${
            isHome
              ? "border border-white/12 bg-[linear-gradient(135deg,rgba(244,201,138,0.2),rgba(255,255,255,0.06),rgba(77,106,215,0.18))] shadow-[0_20px_38px_rgba(0,0,0,0.22)]"
              : isLight
                ? "border border-black/8 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              : "border border-emerald-400/28 bg-[linear-gradient(135deg,rgba(16,185,129,0.24),rgba(34,211,238,0.12),rgba(255,255,255,0.03))] shadow-[0_16px_48px_rgba(16,185,129,0.16)]"
          }`}
        >
          <span
            className={`absolute inset-0 ${
              isHome
                ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_28%)]"
                : isLight
                  ? "bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%)]"
                  : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_28%)]"
            }`}
          />
          <span className={`relative font-display text-xl font-bold tracking-tight ${isHome ? "text-white" : isLight ? "text-slate-900 dark:text-white" : "text-white"}`}>
            {siteConfig.siteName.slice(0, 1)}
          </span>
        </span>
      )}

      <span className="hidden min-w-0 flex-col sm:flex">
        <span className={`font-display text-lg font-semibold leading-none tracking-tight ${isHome ? "text-white" : isLight ? "text-slate-900 dark:text-white" : "text-white"}`}>
          {siteConfig.siteName}
        </span>
        <span className={`mt-1 text-[11px] ${isHome ? "text-white/42" : isLight ? "text-slate-400 dark:text-neutral-500" : "text-neutral-500"}`}>
          {BRAND_SUBNOTE}
        </span>
      </span>
    </Link>
  );
}
