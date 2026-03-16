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
      { label: "Library", href: "/library" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Support", href: "/support" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ],
  },
];

const footerHighlights = ["Fast pages", "Clean browse", "Creator discovery", "Age-gated catalog"];

const socialLinks = [
  { label: "GitHub", href: siteConfig.githubUrl },
  { label: "Twitter", href: siteConfig.twitterUrl },
].filter((item) => item.href);

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-white/10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_26%),linear-gradient(180deg,rgba(8,10,16,0.98),rgba(4,5,8,1))]">
      <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] shadow-[0_30px_120px_rgba(0,0,0,0.26)] backdrop-blur-xl">
          <div className="grid gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-10 lg:py-10">
            <div className="space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/80">
                Built for uninterrupted reading
              </p>
              <div>
                <h3 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {siteConfig.siteName}
                </h3>
                <p className="mt-4 max-w-md text-sm leading-7 text-neutral-300">
                  {siteConfig.aboutSummary}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {footerHighlights.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-neutral-200"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/15 hover:text-white"
                >
                  {siteConfig.supportEmail}
                </a>
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {footerSections.map((section) => (
              <div key={section.title} className="space-y-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-neutral-400">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-neutral-300 transition-colors hover:text-emerald-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 px-6 py-5 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-neutral-500">
                © {currentYear} {siteConfig.companyName}. All rights reserved.
              </p>
              <div className="flex flex-col gap-1 text-sm text-neutral-500 sm:flex-row sm:items-center sm:gap-4">
                <span>{siteConfig.supportEmail}</span>
                {siteConfig.companyAddress ? <span>{siteConfig.companyAddress}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
