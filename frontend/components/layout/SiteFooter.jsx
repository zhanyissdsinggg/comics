"use client";

import Link from "next/link";
import { siteConfig } from "../../lib/siteConfig";

const primaryFooterLinks = [
  { label: "Comics", href: "/comics" },
  { label: "Novels", href: "/novels" },
  { label: "Creators", href: "/creators" },
  { label: "Top Series", href: "/rankings" },
  { label: "Point packs", href: "/store" },
  { label: "Membership", href: "/subscribe" },
];

const fullFooterSections = [
  {
    title: "Browse",
    links: [
      { label: "Comics", href: "/comics" },
      { label: "Novels", href: "/novels" },
      { label: "Creators", href: "/creators" },
      { label: "Top Series", href: "/rankings" },
    ],
  },
  {
    title: "Plans & Account",
    links: [
      { label: "Point packs", href: "/store" },
      { label: "Membership", href: "/subscribe" },
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

const fullMetaFooterLinks = [
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
];

const contactActions = [
  { label: "Support", href: `mailto:${siteConfig.supportEmail}` },
  { label: "Privacy", href: `mailto:${siteConfig.privacyEmail}` },
  { label: "About", href: "/about" },
];

const socialLinks = [
  { label: "GitHub", href: siteConfig.githubUrl },
  { label: "Twitter", href: siteConfig.twitterUrl },
].filter((item) => item.href);

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

export default function SiteFooter({ tone = "default", variant = "full", pathname = "" }) {
  const currentYear = new Date().getFullYear();
  const isHome = tone === "home" || tone === "light";
  const isCompact = variant === "compact";
  const footerPrimaryLinks = filterLinks(primaryFooterLinks, pathname);
  const footerMetaLinks = filterLinks(isCompact ? compactMetaFooterLinks : fullMetaFooterLinks, pathname);
  const footerSections = filterSections(fullFooterSections, pathname);

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
                {siteConfig.tagline}
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className={isHome ? "text-slate-500 transition-colors hover:text-slate-950" : "text-neutral-300 transition-colors hover:text-white"}
              >
                {siteConfig.supportEmail}
              </a>
              {footerMetaLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isHome ? "text-slate-500 transition-colors hover:text-slate-950" : "text-neutral-400 transition-colors hover:text-white"}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <p>
              (c) {currentYear} {siteConfig.companyName}
            </p>
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
                {siteConfig.tagline}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {contactActions.map((item) =>
                item.href.startsWith("mailto:") ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      isHome
                        ? "border-black/8 bg-white text-slate-700 hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)] hover:text-slate-950"
                        : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      isHome
                        ? "border-black/8 bg-white text-slate-700 hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)] hover:text-slate-950"
                        : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ),
              )}
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              (c) {currentYear} {siteConfig.companyName}
            </span>
            {siteConfig.companyAddress ? <span>{siteConfig.companyAddress}</span> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
