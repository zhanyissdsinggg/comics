"use client";

import Link from "next/link";
import {
  navigateWithDocument,
  shouldUseDocumentNavigation,
} from "../../lib/adultRouteNavigation";
import { siteConfig } from "../../lib/siteConfig";

const primaryFooterLinks = [
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Interactive", href: "/interactive" },
  { label: "Rankings", href: "/rankings" },
  { label: "Search", href: "/search" },
  { label: "Support", href: "/support" },
].concat(
  siteConfig.navigation.showCreatorsInNav
    ? [{ label: "Creators", href: "/creators" }]
    : [],
);

const fullFooterSections = [
  {
    title: "Explore",
    links: [
      { label: "Comics", href: "/comics" },
      { label: "Novels", href: "/novels" },
      { label: "Interactive", href: "/interactive" },
      { label: "Rankings", href: "/rankings" },
      { label: "Search", href: "/search" },
      { label: "Support", href: "/support" },
    ].concat(
      siteConfig.navigation.showCreatorsInNav
        ? [{ label: "Creators", href: "/creators" }]
        : [],
    ),
  },
  {
    title: "Account",
    links: []
      .concat(
        siteConfig.navigation.enableMonetizationNav &&
          siteConfig.monetization.pointPacksEnabled
          ? [{ label: "Store", href: "/store" }]
          : [],
      )
      .concat(
        siteConfig.navigation.enableMonetizationNav &&
          siteConfig.monetization.membershipEnabled
          ? [{ label: "Plans", href: "/subscribe" }]
          : [],
      )
      .concat(
        siteConfig.navigation.enableMonetizationNav &&
          siteConfig.monetization.checkoutEnabled
          ? [{ label: "Orders", href: "/orders" }]
          : [],
      )
      .concat([{ label: "Account", href: "/account" }]),
  },
  {
    title: "Support",
    links: [
      { label: "Support", href: "/support" },
      { label: "FAQ", href: "/faq" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
    ],
  },
];

const compactMetaFooterLinks = [
  { label: "Support", href: "/support" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
];

const homePrimaryFooterLinks = [
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Interactive", href: "/interactive" },
  { label: "Rankings", href: "/rankings" },
  { label: "Search", href: "/search" },
  { label: "Support", href: "/support" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
].concat(
  siteConfig.navigation.showCreatorsInNav
    ? [{ label: "Creators", href: "/creators" }]
    : [],
);

const homeCompactMetaFooterLinks = [];

const fullMetaFooterLinks = [
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
];

const contactActions = [{ label: "About", href: "/about" }];

const socialLinks = [
  { label: "GitHub", href: siteConfig.githubUrl },
  { label: "Twitter", href: siteConfig.twitterUrl },
].filter((item) => item.href);

const footerLegalStatement = `Gush Comics is operated by ${siteConfig.companyName}.`;

function buildFooterRouteKey(href) {
  const normalizedHref = String(href || "").trim();
  if (!normalizedHref) {
    return "";
  }

  const [path, query = ""] = normalizedHref.split("?");
  const params = new URLSearchParams(query);

    if (path === "/interactive") {
      return "/interactive";
    }

    if (path === "/search") {
      const type = String(params.get("type") || "")
        .trim()
        .toLowerCase();
      const format = String(params.get("format") || "")
        .trim()
        .toLowerCase();
      if (type === "interactive") {
        return "/interactive";
      }
      if (format === "interactive") {
        return "/interactive";
      }
    }

  return path;
}

function filterLinks(links, currentRouteKey) {
  return links.filter(
    (link) => buildFooterRouteKey(link.href) !== currentRouteKey,
  );
}

function filterSections(sections, currentRouteKey) {
  return sections
    .map((section) => ({
      ...section,
      links: filterLinks(section.links, currentRouteKey),
    }))
    .filter((section) => section.links.length > 0);
}

export default function SiteFooter({
  tone = "default",
  variant = "full",
  pathname = "",
  taglineOverride,
  showTagline = true,
}) {
  const currentYear = new Date().getFullYear();
  const isHome = tone === "home" || tone === "light";
  const isCompact = variant === "compact";
  const currentRouteKey = buildFooterRouteKey(pathname);
  const forceDocumentHomeNavigation = shouldUseDocumentNavigation(
    pathname,
    "/",
  );
  const footerPrimaryLinks = filterLinks(
    isHome && isCompact ? homePrimaryFooterLinks : primaryFooterLinks,
    currentRouteKey,
  );
  const footerMetaLinks = filterLinks(
    isHome && isCompact
      ? homeCompactMetaFooterLinks
      : isCompact
        ? compactMetaFooterLinks
        : fullMetaFooterLinks,
    currentRouteKey,
  );
  const footerSections = filterSections(fullFooterSections, currentRouteKey);
  const footerTagline = taglineOverride ?? siteConfig.tagline;
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
  const renderInternalLink = (link, className) => {
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
          className={className}
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link key={link.href} href={link.href} className={className}>
        {link.label}
      </Link>
    );
  };

  if (isCompact) {
    return (
      <footer
        data-site-footer="1"
        className={`${isHome ? "mt-0" : "mt-16"} border-t-[4px] border-[#ffe500] bg-black text-white`}
      >
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-md space-y-2">
              <FooterHomeLink
                {...footerHomeLinkProps}
                className="text-[1.95rem] font-black uppercase tracking-[0.04em] text-white"
              >
                {siteConfig.siteName}
              </FooterHomeLink>
            </div>

            <nav className="flex max-w-3xl flex-wrap gap-x-4 gap-y-2 text-sm font-semibold uppercase tracking-[0.08em]">
              {footerPrimaryLinks.map((link) =>
                renderInternalLink(
                  link,
                  "text-white/60 transition-colors hover:text-[#ff007a]",
                ),
              )}
            </nav>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t-[2px] border-white/10 pt-3 text-sm text-white/50 lg:flex-row lg:items-center lg:justify-end">
            <div className="flex flex-col gap-3">
              {footerMetaLinks.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {footerMetaLinks.map((link) =>
                    renderInternalLink(
                      link,
                      "font-medium text-white/60 transition-colors hover:text-[#ff007a]",
                    ),
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <p>
                Copyright {currentYear} {siteConfig.companyName}
              </p>
              <p className="text-white/40">{footerLegalStatement}</p>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      data-site-footer="1"
      className="mt-16 border-t-[4px] border-[#ffe500] bg-black text-white"
    >
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <div className="max-w-xl space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ffe500]">
                Read
              </p>
              <FooterHomeLink
                {...footerHomeLinkProps}
                className="text-[2.45rem] font-black uppercase tracking-[0.04em] text-white"
              >
                {siteConfig.siteName}
              </FooterHomeLink>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="font-medium text-white/60 transition-colors hover:text-[#ff007a]"
              >
                {siteConfig.supportEmail}
              </a>
              {contactActions.map((item) =>
                item.href.startsWith("mailto:") ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className="font-medium text-white/60 transition-colors hover:text-[#ff007a]"
                  >
                    {item.label}
                  </a>
                ) : (
                  renderInternalLink(
                    item,
                    "font-medium text-white/60 transition-colors hover:text-[#ff007a]",
                  )
                ),
              )}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {footerSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ffe500]">
                  {section.title}
                </h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      {renderInternalLink(
                        link,
                        "text-sm font-medium text-white/70 transition-colors hover:text-[#ff007a]",
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t-[2px] border-white/10 pt-4 text-sm text-white/60 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {footerMetaLinks.map((link) =>
                renderInternalLink(
                  link,
                  "font-medium text-white/60 transition-colors hover:text-[#ff007a]",
                ),
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white/60 transition-colors hover:text-[#ff007a]"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>
                Copyright {currentYear} {siteConfig.companyName}
              </span>
              {siteConfig.companyAddress ? (
                <span>{siteConfig.companyAddress}</span>
              ) : null}
            </div>
            <p className="text-white/40">{footerLegalStatement}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
