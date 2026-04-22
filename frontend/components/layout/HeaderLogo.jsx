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
      className="group flex shrink-0 items-center gap-3 pr-2 text-left transition-all duration-300"
    >
      {hasRenderableLogo ? (
        <span
          className="flex h-11 items-center border-[3px] border-black bg-[#ffe500] px-3 shadow-[4px_4px_0_0_rgba(255,0,122,1)] transition-all duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none"
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
          className="relative flex h-11 w-11 items-center justify-center overflow-hidden border-[3px] border-black bg-[#ffe500] shadow-[4px_4px_0_0_rgba(255,0,122,1)] transition-all duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none"
        >
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),transparent_34%)]" />
          <span className="relative text-xl font-black tracking-[-0.04em] text-black">
            {siteConfig.siteName.slice(0, 1)}
          </span>
        </span>
      )}

      <span className="hidden min-w-0 flex-col sm:flex">
        <span className="text-[1.02rem] font-black uppercase leading-none tracking-[-0.04em] text-black">
          {siteConfig.siteName}
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
          {BRAND_SUBNOTE}
        </span>
      </span>
    </RootLink>
  );
}
