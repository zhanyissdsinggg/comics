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

const BRAND_SUBNOTE = "Comics & novels";

export default function HeaderLogo({ variant = "default" }) {
  const pathname = usePathname() || "/";
  const { branding } = useBrandingStore();
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
          className={`flex h-10 items-center rounded-full px-3 transition-all duration-300 ${
            isLight
              ? "border border-black/8 bg-white/88 shadow-[0_8px_20px_rgba(0,0,0,0.05)] group-hover:border-black/12 group-hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_16px_30px_rgba(0,0,0,0.22)]"
              : "border border-white/10 bg-white/[0.04] group-hover:border-white/16 group-hover:bg-white/[0.08]"
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
          className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] transition-transform duration-300 group-hover:scale-[1.02] ${
            isLight
              ? "border border-black/8 bg-[linear-gradient(180deg,#ffffff,#f3f4f6)] shadow-[0_10px_22px_rgba(0,0,0,0.06)]"
              : "border border-white/10 bg-[linear-gradient(180deg,rgba(41,151,255,0.95),rgba(0,113,227,0.88))] shadow-[0_18px_32px_rgba(0,113,227,0.28)]"
          }`}
        >
          <span
            className={`absolute inset-0 ${
              isLight
                ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),transparent_34%)]"
                : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_32%)]"
            }`}
          />
          <span
            className={`relative text-xl font-bold tracking-[-0.04em] ${isLight ? "text-slate-950 dark:text-white" : "text-white"}`}
          >
            {siteConfig.siteName.slice(0, 1)}
          </span>
        </span>
      )}

      <span className="hidden min-w-0 flex-col sm:flex">
        <span
          className={`text-[1.02rem] font-semibold leading-none tracking-[-0.04em] ${isLight ? "text-[color:var(--gush-ink-strong)] dark:text-white" : "text-white"}`}
        >
          {siteConfig.siteName}
        </span>
        <span
          className={`mt-1 text-[10px] uppercase tracking-[0.22em] ${isLight ? "text-[color:var(--gush-ink-faint)] dark:text-neutral-500" : "text-white/44"}`}
        >
          {BRAND_SUBNOTE}
        </span>
      </span>
    </RootLink>
  );
}
