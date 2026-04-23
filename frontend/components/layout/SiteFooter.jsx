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
  { label: "Creators", href: "/creators" },
  { label: "Featured", href: "/rankings" },
  { label: "Support", href: "/support" },
];

const fullFooterSections = [
  {
    title: "Browse",
    links: [
      { label: "Comics", href: "/comics" },
      { label: "Novels", href: "/novels" },
      { label: "Creators", href: "/creators" },
      { label: "Featured", href: "/rankings" },
      { label: "Support", href: "/support" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Store", href: "/store" },
      { label: "Plans", href: "/subscribe" },
      { label: "Purchases", href: "/orders" },
      { label: "Account", href: "/account" },
    ],
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
  { label: "Creators", href: "/creators" },
  { label: "Support", href: "/support" },
];

const homeCompactMetaFooterLinks = [
  { label: "Support", href: "/support" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
];

const fullMetaFooterLinks = [
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
];

const contactActions = [
  { label: "Support", href: `mailto:${siteConfig.supportEmail}` },
  { label: "About", href: "/about" },
];

const socialLinks = [
  { label: "GitHub", href: siteConfig.githubUrl },
  { label: "Twitter", href: siteConfig.twitterUrl },
].filter((item) => item.href);

function FooterAgeBadge() {
  return (
    <span
      aria-label="18 plus only"
      className="inline-flex items-center rounded-full border-[2px] border-black bg-[#ffe500] px-3 py-1 text-[11px] font-black tracking-[0.22em] text-black"
    >
      18+
    </span>
  );
}

function VisaIcon() {
  return (
    <svg viewBox="0 0 64 24" aria-hidden="true" className="h-4 w-auto">
      <text
        x="8"
        y="16"
        fill="currentColor"
        fontSize="11"
        fontStyle="italic"
        fontWeight="700"
        letterSpacing=".16em"
        className="font-sans"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardIcon() {
  return (
    <svg viewBox="0 0 64 24" aria-hidden="true" className="h-4 w-auto">
      <circle cx="23" cy="12" r="6.5" fill="#ef4444" />
      <circle cx="31" cy="12" r="6.5" fill="#f59e0b" fillOpacity="0.92" />
      <text
        x="40"
        y="15"
        fill="currentColor"
        fontSize="5.5"
        fontWeight="700"
        textAnchor="middle"
        className="font-sans"
      >
        MC
      </text>
    </svg>
  );
}

function PaymentIconRow() {
  const iconTone = "border-[2px] border-black bg-white text-black";

  return (
    <div className="flex flex-wrap items-center gap-2 opacity-60">
      <span
        className={`inline-flex h-8 min-w-[64px] items-center justify-center rounded-md border px-3 ${iconTone}`}
        aria-label="Visa accepted"
        title="Visa"
      >
        <VisaIcon />
      </span>
      <span
        className={`inline-flex h-8 min-w-[64px] items-center justify-center rounded-md border px-3 ${iconTone}`}
        aria-label="Mastercard accepted"
        title="Mastercard"
      >
        <MastercardIcon />
      </span>
    </div>
  );
}

function normalizeFooterPath(href) {
  return String(href || "").split("?")[0];
}

function filterLinks(links, pathname) {
  return links.filter((link) => normalizeFooterPath(link.href) !== pathname);
}

function filterSections(sections, pathname) {
  return sections
    .map((section) => ({
      ...section,
      links: filterLinks(section.links, pathname),
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
  const forceDocumentHomeNavigation = shouldUseDocumentNavigation(
    pathname,
    "/",
  );
  const footerPrimaryLinks = filterLinks(
    isHome && isCompact ? homePrimaryFooterLinks : primaryFooterLinks,
    pathname,
  );
  const footerMetaLinks = filterLinks(
    isHome && isCompact
      ? homeCompactMetaFooterLinks
      : isCompact
        ? compactMetaFooterLinks
        : fullMetaFooterLinks,
    pathname,
  );
  const footerSections = filterSections(fullFooterSections, pathname);
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
              {showTagline && footerTagline ? (
                <p className="text-sm leading-6 text-white/60">
                  {footerTagline}
                </p>
              ) : null}
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

          <div className="mt-4 flex flex-col gap-3 border-t-[2px] border-white/10 pt-3 text-sm text-white/50 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="font-medium text-white/60 transition-colors hover:text-[#ff007a]"
              >
                {siteConfig.supportEmail}
              </a>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {footerMetaLinks.map((link) =>
                  renderInternalLink(
                    link,
                    "font-medium text-white/60 transition-colors hover:text-[#ff007a]",
                  ),
                )}
                <FooterAgeBadge />
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <PaymentIconRow />
              <p>
                (c) {currentYear} {siteConfig.companyName}
              </p>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className="mt-16 border-t-[4px] border-[#ffe500] bg-black text-white"
    >
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <div className="max-w-xl space-y-4">
            <div className="space-y-2">
              <p
                className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ffe500]"
              >
                Stories
              </p>
              <FooterHomeLink
                {...footerHomeLinkProps}
                className="text-[2.45rem] font-black uppercase tracking-[0.04em] text-white"
              >
                {siteConfig.siteName}
              </FooterHomeLink>
              {showTagline && footerTagline ? (
                <p className="text-sm leading-6 text-white/60">
                  {footerTagline}
                </p>
              ) : null}
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
                <h4
                  className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ffe500]"
                >
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
              <FooterAgeBadge />
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
            <PaymentIconRow />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>
                (c) {currentYear} {siteConfig.companyName}
              </span>
              {siteConfig.companyAddress ? (
                <span>{siteConfig.companyAddress}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
