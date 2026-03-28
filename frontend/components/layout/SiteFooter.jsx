"use client";

import Link from "next/link";
import { siteConfig } from "../../lib/siteConfig";

const primaryFooterLinks = [
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Creators", href: "/creators" },
  { label: "Featured Series", href: "/rankings" },
  { label: "Help", href: "/support" },
];

const fullFooterSections = [
  {
    title: "Browse",
    links: [
      { label: "Comics", href: "/comics" },
      { label: "Novels", href: "/novels" },
      { label: "Creators", href: "/creators" },
      { label: "Featured Series", href: "/rankings" },
      { label: "Help", href: "/support" },
    ],
  },
  {
    title: "Store & Account",
    links: [
      { label: "Store", href: "/store" },
      { label: "Plans", href: "/subscribe" },
      { label: "Purchases", href: "/orders" },
      { label: "Account", href: "/account" },
    ],
  },
  {
    title: "Help & Legal",
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
  { label: "Help", href: "/support" },
];

const homeCompactMetaFooterLinks = [
  { label: "Help", href: "/support" },
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

function FooterAgeBadge({ isHome }) {
  return (
    <span
      aria-label="18 plus only"
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.22em] opacity-60 ${
        isHome ? "border-slate-400/40 text-slate-600" : "border-white/15 text-neutral-200"
      }`}
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
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fontStyle="italic"
        fontWeight="700"
        letterSpacing=".16em"
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
        fontFamily="Arial, sans-serif"
        fontSize="5.5"
        fontWeight="700"
        textAnchor="middle"
      >
        MC
      </text>
    </svg>
  );
}

function PaymentIconRow({ isHome }) {
  const iconTone = isHome
    ? "border-slate-300/70 bg-white/60 text-slate-500"
    : "border-white/10 bg-white/[0.03] text-neutral-200";

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

export default function SiteFooter({ tone = "default", variant = "full", pathname = "", taglineOverride = "" }) {
  const currentYear = new Date().getFullYear();
  const isHome = tone === "home" || tone === "light";
  const isCompact = variant === "compact";
  const footerPrimaryLinks = filterLinks(
    isHome && isCompact ? homePrimaryFooterLinks : primaryFooterLinks,
    pathname,
  );
  const footerMetaLinks = filterLinks(
    isHome && isCompact ? homeCompactMetaFooterLinks : isCompact ? compactMetaFooterLinks : fullMetaFooterLinks,
    pathname,
  );
  const footerSections = filterSections(fullFooterSections, pathname);
  const footerTagline = taglineOverride || siteConfig.tagline;

  if (isCompact) {
    return (
      <footer
        className={`mt-16 border-t ${
          isHome
            ? "border-black/8 bg-[rgba(246,243,237,0.82)] text-slate-900"
            : "border-white/10 bg-[linear-gradient(180deg,rgba(8,10,16,0.78),rgba(5,7,11,1))] text-white"
        }`}
      >
        <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-md space-y-2">
              <Link
                href="/"
                className={`font-display text-2xl font-semibold tracking-tight ${isHome ? "text-slate-950" : "text-white"}`}
              >
                {siteConfig.siteName}
              </Link>
              <p className={`text-sm leading-6 ${isHome ? "text-slate-600" : "text-neutral-300"}`}>
                {footerTagline}
              </p>
            </div>

            <nav className="flex max-w-3xl flex-wrap gap-x-4 gap-y-2 text-sm">
              {footerPrimaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isHome ? "text-slate-600 transition-colors hover:text-slate-950" : "text-neutral-300 transition-colors hover:text-white"}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div
            className={`mt-4 flex flex-col gap-3 border-t pt-3 text-sm lg:flex-row lg:items-center lg:justify-between ${
              isHome ? "border-black/8 text-slate-400" : "border-white/10 text-neutral-500"
            }`}
          >
            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className={isHome ? "text-slate-500 transition-colors hover:text-slate-950" : "text-neutral-300 transition-colors hover:text-white"}
              >
                {siteConfig.supportEmail}
              </a>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {footerMetaLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={isHome ? "text-slate-500 transition-colors hover:text-slate-950" : "text-neutral-400 transition-colors hover:text-white"}
                  >
                    {link.label}
                  </Link>
                ))}
                <FooterAgeBadge isHome={isHome} />
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <PaymentIconRow isHome={isHome} />
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
      className={`mt-16 border-t ${
        isHome
          ? "border-black/8 bg-[rgba(246,243,237,0.86)] text-slate-900"
          : "border-white/10 bg-[linear-gradient(180deg,rgba(8,10,16,0.78),rgba(5,7,11,1))] text-white"
      }`}
      >
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <div className="max-w-xl space-y-4">
            <div className="space-y-2">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.32em] ${isHome ? "text-slate-400" : "text-emerald-300/75"}`}>
                Read comics and novels
              </p>
              <Link
                href="/"
                className={`font-display text-3xl font-semibold tracking-tight ${isHome ? "text-slate-950" : "text-white"}`}
              >
                {siteConfig.siteName}
              </Link>
              <p className={`text-sm leading-6 ${isHome ? "text-slate-600" : "text-neutral-300"}`}>
                {footerTagline}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className={isHome ? "text-slate-600 transition-colors hover:text-slate-950" : "text-neutral-300 transition-colors hover:text-white"}
              >
                {siteConfig.supportEmail}
              </a>
              {contactActions.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={isHome ? "text-slate-600 transition-colors hover:text-slate-950" : "text-neutral-300 transition-colors hover:text-white"}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {footerSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <h4 className={`text-[11px] font-semibold uppercase tracking-[0.32em] ${isHome ? "text-slate-400" : "text-neutral-400"}`}>
                  {section.title}
                </h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`text-sm transition-colors ${isHome ? "text-slate-600 hover:text-slate-950" : "text-neutral-300 hover:text-white"}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`mt-6 flex flex-col gap-3 border-t pt-4 text-sm lg:flex-row lg:items-center lg:justify-between ${
            isHome ? "border-black/8 text-slate-400" : "border-white/10 text-neutral-500"
          }`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {footerMetaLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isHome ? "text-slate-500 transition-colors hover:text-slate-950" : "text-neutral-400 transition-colors hover:text-white"}
                >
                  {link.label}
                </Link>
              ))}
              <FooterAgeBadge isHome={isHome} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={isHome ? "text-slate-500 transition-colors hover:text-slate-950" : "text-neutral-400 transition-colors hover:text-white"}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <PaymentIconRow isHome={isHome} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>
                (c) {currentYear} {siteConfig.companyName}
              </span>
              {siteConfig.companyAddress ? <span>{siteConfig.companyAddress}</span> : null}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
