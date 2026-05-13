"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";
import { siteConfig } from "../../lib/siteConfig";

const BRAND_SUBNOTE = "Comics & novels";

export default function HeaderLogo({ variant = "default" }) {
  const pathname = usePathname() || "/";
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
      className="group flex shrink-0 items-center gap-3 pr-2 text-left transition-all duration-300"
    >
      <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[16px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,79,154,0.28)_0%,rgba(167,139,250,0.22)_100%)] shadow-[0_18px_36px_rgba(0,0,0,0.28)] ring-1 ring-white/8 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_42px_rgba(0,0,0,0.34)]">
        <span className="relative text-xl font-black tracking-[-0.04em] text-white">
          {siteConfig.siteName.slice(0, 1)}
        </span>
      </span>

      <span className="hidden min-w-0 flex-col sm:flex">
        <span className="font-display text-[1.08rem] font-semibold leading-none tracking-[-0.04em] text-white">
          {siteConfig.siteName}
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/52">
          {BRAND_SUBNOTE}
        </span>
      </span>
    </RootLink>
  );
}
