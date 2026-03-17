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

const socialLinks = [
  { label: "GitHub", href: siteConfig.githubUrl },
  { label: "Twitter", href: siteConfig.twitterUrl },
].filter((item) => item.href);

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-white/10 bg-[linear-gradient(180deg,rgba(8,10,16,0.78),rgba(5,7,11,1))]">
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="max-w-xl space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/75">
              Read better
            </p>
            <div>
              <Link href="/" className="font-display text-3xl font-semibold tracking-tight text-white">
                {siteConfig.siteName}
              </Link>
              <p className="mt-3 text-sm leading-7 text-neutral-300">{siteConfig.aboutSummary}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white/20 hover:bg-white/[0.08]"
              >
                {siteConfig.supportEmail}
              </a>
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-white/10 bg-black/10 px-4 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
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
                        className="text-sm text-neutral-300 transition-colors hover:text-white"
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

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-neutral-500 lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {currentYear} {siteConfig.companyName}. All rights reserved.
          </p>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <span>{siteConfig.supportEmail}</span>
            {siteConfig.companyAddress ? <span>{siteConfig.companyAddress}</span> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
