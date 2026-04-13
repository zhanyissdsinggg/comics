"use client";

import { useEffect, useState } from "react";
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
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
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

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [branding?.siteLogoUrl]);

  const hasRenderableLogo = Boolean(branding?.siteLogoUrl) && !logoLoadFailed;

  return (
    <RootLink
      {...rootLinkProps}
      aria-label="Go to home"
      className="group flex shrink-0 items-center gap-3 rounded-full pr-2 text-left transition-all duration-300"
    >
      {hasRenderableLogo ? (
        <span
          className="flex h-10 items-center rounded-full border border-[color:var(--gush-border)] bg-white px-3 shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-all duration-300 group-hover:border-[color:var(--gush-border-strong)] group-hover:bg-[color:var(--gush-page-bg-muted)]"
        >
          <Image
            src={branding.siteLogoUrl}
            alt={`${siteConfig.siteName} logo`}
            width={120}
            height={28}
            className="h-7 w-auto"
            priority
            onError={() => setLogoLoadFailed(true)}
          />
        </span>
      ) : (
        <span
          className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] shadow-[0_10px_22px_rgba(0,0,0,0.06)] transition-transform duration-300 group-hover:scale-[1.02]"
        >
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),transparent_34%)]" />
          <span className="relative text-xl font-bold tracking-[-0.04em] text-slate-950">
            {siteConfig.siteName.slice(0, 1)}
          </span>
        </span>
      )}

      <span className="hidden min-w-0 flex-col sm:flex">
        <span className="text-[1.02rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--gush-ink-strong)]">
          {siteConfig.siteName}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[color:var(--gush-ink-faint)]">
          {BRAND_SUBNOTE}
        </span>
      </span>
    </RootLink>
  );
}
