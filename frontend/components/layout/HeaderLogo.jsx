"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";
import { siteConfig } from "../../lib/siteConfig";

export default function HeaderLogo({ variant = "default" }) {
  void variant;
  const pathname = usePathname() || "/";
  const forceDocumentNavigation = shouldUseDocumentNavigation(pathname, "/");
  const isLongBrand = siteConfig.siteName.length > 18;
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
      aria-label="Go to Gush home"
      className="group flex h-11 shrink-0 items-center pr-2 text-left transition-all duration-150"
    >
      <span className="min-w-0">
        <span
          className={`bg-[linear-gradient(135deg,#f9a8d4_0%,#ec4899_42%,#8b5cf6_100%)] bg-clip-text font-display font-semibold leading-none text-transparent transition-all duration-150 group-hover:brightness-110 ${
            isLongBrand
              ? "text-[1rem] tracking-[-0.045em] sm:text-[1.08rem]"
              : "text-[1.45rem] tracking-[-0.06em]"
          }`}
        >
          {siteConfig.siteName}
        </span>
      </span>
    </RootLink>
  );
}
