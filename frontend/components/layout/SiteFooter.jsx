"use client";

import Link from "next/link";
import { siteConfig } from "../../lib/siteConfig";

const footerSections = [
  {
    title: "Browse",
    links: [
      { label: "Comics", href: "/comics" },
      { label: "Novels", href: "/novels" },
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
    <footer className="mt-12 border-t border-white/5 bg-neutral-950">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">{siteConfig.siteName}</h3>
            <p className="text-sm leading-relaxed text-neutral-400">{siteConfig.tagline}</p>
            <div className="space-y-1 text-sm text-neutral-500">
              <p>{siteConfig.supportEmail}</p>
              {siteConfig.companyAddress ? <p>{siteConfig.companyAddress}</p> : null}
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-3 text-sm font-semibold text-neutral-300">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-400 transition-colors hover:text-emerald-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-white/5 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-neutral-500">
              ? {currentYear} {siteConfig.companyName}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-500 transition-colors hover:text-emerald-400"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
