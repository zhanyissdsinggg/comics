"use client";

import Link from "next/link";
import { siteConfig } from "../../lib/siteConfig";

const footerSections = [
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
    title: "Help",
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "FAQ", href: "/faq" },
      { label: "Support", href: "/support" },
      { label: "Mature Content", href: "/mature-content" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Store", href: "/store" },
      { label: "Membership", href: "/subscribe" },
      { label: "Purchases", href: "/orders" },
      { label: "Account", href: "/account" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "About", href: "/about" },
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ],
  },
];

const socialLinks = [
  { label: "GitHub", href: siteConfig.githubUrl },
  { label: "Twitter", href: siteConfig.twitterUrl },
].filter((item) => item.href);

const compactFooterSections = [
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
    title: "Account",
    links: [
      { label: "Store", href: "/store" },
      { label: "Membership", href: "/subscribe" },
      { label: "Purchases", href: "/orders" },
      { label: "Account", href: "/account" },
    ],
  },
];

const compactFooterMetaLinks = [
  { label: "Support", href: "/support" },
  { label: "FAQ", href: "/faq" },
  { label: "About", href: "/about" },
  { label: "Mature Content", href: "/mature-content" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
];

function normalizeFooterPath(href) {
  return String(href || "").split("?")[0];
}

const trustPanels = [
  {
    title: "Support",
    body: "Billing, account, and access help should always be easy to reach.",
    value: siteConfig.supportEmail,
    href: `mailto:${siteConfig.supportEmail}`,
  },
  {
    title: "Privacy",
    body: "Privacy questions and data requests have a direct contact path.",
    value: siteConfig.privacyEmail,
    href: `mailto:${siteConfig.privacyEmail}`,
  },
  {
    title: "Company",
    body: "Policies, company context, and legal contact stay visible instead of buried.",
    value: siteConfig.companyName,
    href: "/about",
  },
];

export default function SiteFooter({ tone = "default", variant = "full", pathname = "" }) {
  const currentYear = new Date().getFullYear();
  const isHome = tone === "home" || tone === "light";
  const isCompact = variant === "compact";
  const compactSections = compactFooterSections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => normalizeFooterPath(link.href) !== pathname),
    }))
    .filter((section) => section.links.length > 0);
  const compactMetaLinks = compactFooterMetaLinks.filter((link) => normalizeFooterPath(link.href) !== pathname);

  if (isCompact) {
    return (
      <footer
        className={`mt-16 border-t ${
          isHome
            ? "border-black/6 bg-[linear-gradient(180deg,#f7f8fb,#eef2f7)] text-slate-900"
            : "border-white/10 bg-[linear-gradient(180deg,rgba(8,10,16,0.78),rgba(5,7,11,1))] text-white"
        }`}
      >
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-lg space-y-3">
              <Link href="/" className={`font-display text-2xl font-semibold tracking-tight ${isHome ? "text-slate-950" : "text-white"}`}>
                {siteConfig.siteName}
              </Link>
              <p className={`text-sm leading-7 ${isHome ? "text-slate-600" : "text-neutral-300"}`}>
                Read comics and novels with point packs, membership, receipts in one place, and direct support when billing or access needs help.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className={isHome ? "text-slate-500 transition-colors hover:text-slate-950" : "text-neutral-300 transition-colors hover:text-white"}
                >
                  {siteConfig.supportEmail}
                </a>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {compactSections.map((section) => (
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

          <div className={`mt-6 flex flex-col gap-3 border-t pt-4 text-sm lg:flex-row lg:items-center lg:justify-between ${isHome ? "border-black/6 text-slate-400" : "border-white/10 text-neutral-500"}`}>
            <p>
              © {currentYear} {siteConfig.companyName}. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4">
              {compactMetaLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isHome ? "text-slate-500 transition-colors hover:text-slate-950" : "text-neutral-400 transition-colors hover:text-white"}
                >
                  {link.label}
                </Link>
              ))}
              {siteConfig.companyAddress ? <span>{siteConfig.companyAddress}</span> : null}
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
          ? "border-black/6 bg-[linear-gradient(180deg,#f4f6fa,#eef2f7)] text-slate-900"
          : "border-white/10 bg-[linear-gradient(180deg,rgba(8,10,16,0.78),rgba(5,7,11,1))] text-white"
      }`}
    >
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="max-w-xl space-y-4">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.32em] ${isHome ? "text-slate-400" : "text-emerald-300/75"}`}>
              Read comics and novels
            </p>
            <div>
              <Link href="/" className={`font-display text-3xl font-semibold tracking-tight ${isHome ? "text-slate-950" : "text-white"}`}>
                {siteConfig.siteName}
              </Link>
              <p className={`mt-3 text-sm leading-7 ${isHome ? "text-slate-600" : "text-neutral-300"}`}>{siteConfig.aboutSummary}</p>
              <p className={`mt-3 text-sm ${isHome ? "text-slate-500" : "text-neutral-400"}`}>
                Start free, unlock episodes with points, compare membership, and keep support close when you need it.
              </p>
              <p className={`mt-2 text-sm ${isHome ? "text-slate-500" : "text-neutral-400"}`}>
                Billing questions, privacy requests, and legal notices all have a direct contact path below.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isHome
                    ? "border-black/8 bg-white/72 text-slate-800 hover:border-black/12 hover:bg-white"
                    : "border-white/12 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.08]"
                }`}
              >
                {siteConfig.supportEmail}
              </a>
              <a
                href={`mailto:${siteConfig.privacyEmail}`}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isHome
                    ? "border-black/8 bg-black/[0.03] text-slate-600 hover:border-black/12 hover:bg-white hover:text-slate-900"
                    : "border-white/10 bg-black/10 text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {siteConfig.privacyEmail}
              </a>
              <a
                href={`mailto:${siteConfig.legalEmail}`}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isHome
                    ? "border-black/8 bg-black/[0.03] text-slate-600 hover:border-black/12 hover:bg-white hover:text-slate-900"
                    : "border-white/10 bg-black/10 text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {siteConfig.legalEmail}
              </a>
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    isHome
                      ? "border-black/8 bg-black/[0.03] text-slate-600 hover:border-black/12 hover:bg-white hover:text-slate-900"
                      : "border-white/10 bg-black/10 text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerSections.map((section) => (
              <div key={section.title} className="space-y-4">
                <h4 className={`text-[11px] font-semibold uppercase tracking-[0.32em] ${isHome ? "text-slate-400" : "text-neutral-400"}`}>
                  {section.title}
                </h4>
                <ul className="space-y-3">
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

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {trustPanels.map((panel) => {
            const isExternal = panel.href.startsWith("mailto:");
            const panelClass = `rounded-[24px] border px-4 py-4 ${
              isHome
                ? "border-black/6 bg-white/72 text-slate-900"
                : "border-white/10 bg-white/[0.04] text-white"
            }`;
            const titleClass = isHome ? "text-slate-950" : "text-white";
            const bodyClass = isHome ? "text-slate-500" : "text-neutral-300";
            const valueClass = isHome ? "text-slate-700 hover:text-slate-950" : "text-neutral-200 hover:text-white";

            return (
              <div key={panel.title} className={panelClass}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${isHome ? "text-slate-400" : "text-neutral-400"}`}>
                  {panel.title}
                </p>
                <p className={`mt-3 text-base font-semibold ${titleClass}`}>{panel.value}</p>
                <p className={`mt-2 text-sm leading-6 ${bodyClass}`}>{panel.body}</p>
                {isExternal ? (
                  <a href={panel.href} className={`mt-4 inline-flex text-sm font-semibold transition-colors ${valueClass}`}>
                    Contact {panel.title.toLowerCase()}
                  </a>
                ) : (
                  <Link href={panel.href} className={`mt-4 inline-flex text-sm font-semibold transition-colors ${valueClass}`}>
                    Open {panel.title.toLowerCase()}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className={`mt-10 flex flex-col gap-3 border-t pt-5 text-sm lg:flex-row lg:items-center lg:justify-between ${isHome ? "border-black/6 text-slate-400" : "border-white/10 text-neutral-500"}`}>
          <p>
            © {currentYear} {siteConfig.companyName}. All rights reserved.
          </p>
          {siteConfig.companyAddress ? <span>{siteConfig.companyAddress}</span> : null}
        </div>
      </div>
    </footer>
  );
}
