"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useBrandingStore } from "../../store/useBrandingStore";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";
import { siteConfig } from "../../lib/siteConfig";

const BRAND_SUBNOTE = "Comics and novels";

export default function HeaderLogo({ variant = "default" }) {
  const pathname = usePathname() || "/";
  const { branding } = useBrandingStore();
  const isHome = variant === "home";
  const isLight =
    variant === "light" || variant === "home" || variant === "default";
  const forceDocumentNavigation = shouldUseDocumentNavigation(pathname, "/");
  const RootLink = forceDocumentNavigation ? "a" : Link;
  const rootLinkProps = forceDocumentNavigation
    ? {
        href: "/",
        onClick: (event) => {
          event.preventDefault();
          navigateWithDocument("/");
        },
      }
    : { href: "/" };

  return (
    <RootLink
      {...rootLinkProps}
      aria-label="Go to home"
      className="group flex shrink-0 items-center gap-3 rounded-full pr-2 text-left transition-all duration-300"
    >
      {branding?.siteLogoUrl ? (
        <span
          className={`flex h-10 items-center rounded-[20px] px-3 transition-all duration-300 ${
            isHome
              ? "border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.92)] shadow-[0_10px_24px_rgba(15,23,42,0.035)] group-hover:border-[rgba(134,98,69,0.22)] group-hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_16px_30px_rgba(0,0,0,0.22)] dark:group-hover:border-[rgba(242,207,155,0.28)]"
              : isLight
                ? "border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.88)] shadow-[0_10px_24px_rgba(15,23,42,0.035)] group-hover:border-[color:var(--gush-border-strong)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_16px_30px_rgba(0,0,0,0.22)] dark:group-hover:border-[rgba(242,207,155,0.28)]"
                : "border border-white/10 bg-white/[0.04] group-hover:border-[rgba(242,207,155,0.35)] group-hover:bg-white/[0.08]"
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
          className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[20px] transition-transform duration-300 group-hover:scale-[1.02] ${
            isHome
              ? "border border-[color:var(--gush-border)] bg-[linear-gradient(145deg,rgba(255,250,243,0.96),rgba(244,236,226,0.94),rgba(233,224,213,0.82))] shadow-[0_10px_24px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(216,183,140,0.12),rgba(255,255,255,0.04),rgba(105,123,171,0.16))] dark:shadow-[0_18px_34px_rgba(0,0,0,0.22)]"
              : isLight
                ? "border border-[color:var(--gush-border)] bg-[rgba(255,253,249,0.92)] shadow-[0_10px_24px_rgba(15,23,42,0.035)]"
                : "border border-[rgba(242,207,155,0.28)] bg-[linear-gradient(145deg,rgba(242,207,155,0.14),rgba(111,131,182,0.14),rgba(255,255,255,0.03))] shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
          }`}
        >
          <span
            className={`absolute inset-0 ${
              isHome
                ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.64),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%)]"
                : isLight
                  ? "bg-[radial-gradient(circle_at_top_left,rgba(134,98,69,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%)]"
                  : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_28%)]"
            }`}
          />
          <span
            className={`relative font-display text-xl font-bold tracking-tight ${isHome ? "text-[color:var(--gush-ink-strong)] dark:text-white" : isLight ? "text-slate-900 dark:text-white" : "text-white"}`}
          >
            {siteConfig.siteName.slice(0, 1)}
          </span>
        </span>
      )}

      <span className="hidden min-w-0 flex-col sm:flex">
        <span
          className={`font-display text-[1.05rem] font-semibold leading-none tracking-[-0.04em] ${isHome ? "text-[color:var(--gush-ink-strong)] dark:text-white" : isLight ? "text-[color:var(--gush-ink-strong)] dark:text-white" : "text-white"}`}
        >
          {siteConfig.siteName}
        </span>
        <span
          className={`mt-1 text-[10px] uppercase tracking-[0.22em] ${isHome ? "text-[color:var(--gush-ink-faint)] dark:text-neutral-500" : isLight ? "text-[color:var(--gush-ink-faint)] dark:text-neutral-500" : "text-neutral-500"}`}
        >
          {BRAND_SUBNOTE}
        </span>
      </span>
    </RootLink>
  );
}
