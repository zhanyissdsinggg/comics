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
        <span className="bg-[linear-gradient(135deg,#f9a8d4_0%,#ec4899_42%,#8b5cf6_100%)] bg-clip-text font-display text-[1.45rem] font-semibold leading-none tracking-[-0.06em] text-transparent transition-all duration-150 group-hover:brightness-110">
          {siteConfig.siteName}
        </span>
      </span>
    </RootLink>
  );
}
