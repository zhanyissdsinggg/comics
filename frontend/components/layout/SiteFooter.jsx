"use client";

import Link from "next/link";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";
import { siteConfig } from "../../lib/siteConfig";

const footerLinks = [
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Interactive", href: "/interactive" },
  { label: "Rankings", href: "/rankings" },
  { label: "Search", href: "/search" },
  { label: "Support", href: "/support" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
];

const footerLegalStatement = `${siteConfig.siteName} is operated by ${siteConfig.companyName}`;
const footerCopyright = `Copyright 2026 ${siteConfig.companyName}`;

export default function SiteFooter({
  pathname = "",
  showInteractiveNav = true,
}) {
  const forceDocumentHomeNavigation = shouldUseDocumentNavigation(
    pathname,
    "/",
  );
  const FooterHomeLink = forceDocumentHomeNavigation ? "a" : Link;
  const footerHomeLinkProps = forceDocumentHomeNavigation
    ? {
        href: "/",
        onClick: (event) => {
          event.preventDefault();
          navigateWithDocument("/");
        },
      }
    : { href: "/" };
  const visibleFooterLinks = footerLinks.filter(
    (link) => link.label !== "Interactive" || showInteractiveNav,
  );

  const renderInternalLink = (link) => {
    const useDocumentNavigation = shouldUseDocumentNavigation(
      pathname,
      link.href,
    );

    if (useDocumentNavigation) {
      return (
        <a
          key={link.href}
          href={link.href}
          onClick={(event) => {
            event.preventDefault();
            navigateWithDocument(link.href);
          }}
          className="text-[13px] leading-6 text-white/[0.45] transition-colors duration-150 hover:text-[#f9a8d4]"
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link
        key={link.href}
        href={link.href}
        className="text-[13px] leading-6 text-white/[0.45] transition-colors duration-150 hover:text-[#f9a8d4]"
      >
        {link.label}
      </Link>
    );
  };

  return (
    <footer
      data-site-footer="1"
      className="mt-16 border-t border-[rgba(255,255,255,0.08)] bg-transparent text-white/[0.45]"
    >
      <div className="gush-shell-container py-7 md:py-9">
        <div className="flex flex-col gap-5 md:gap-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <FooterHomeLink
                {...footerHomeLinkProps}
                className="inline-block bg-[linear-gradient(135deg,#f9a8d4_0%,#ec4899_42%,#8b5cf6_100%)] bg-clip-text font-display text-[1.9rem] font-semibold leading-none tracking-[-0.06em] text-transparent"
              >
                {siteConfig.siteName}
              </FooterHomeLink>
              <p className="text-[13px] leading-6 text-white/[0.45]">
                {footerLegalStatement}
              </p>
            </div>

            <p className="text-[13px] leading-6 text-white/[0.45]">
              {footerCopyright}
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-2.5"
          >
            {visibleFooterLinks.map((link) => renderInternalLink(link))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
