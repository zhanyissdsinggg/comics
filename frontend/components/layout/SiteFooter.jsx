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

export default function SiteFooter({ tone = "default" }) {
  const currentYear = new Date().getFullYear();
  const isHome = tone === "home" || tone === "light";

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
              Stories first
            </p>
            <div>
              <Link href="/" className={`font-display text-3xl font-semibold tracking-tight ${isHome ? "text-slate-950" : "text-white"}`}>
                {siteConfig.siteName}
              </Link>
              <p className={`mt-3 text-sm leading-7 ${isHome ? "text-slate-600" : "text-neutral-300"}`}>{siteConfig.aboutSummary}</p>
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

          <div className="grid gap-8 sm:grid-cols-3">
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

        <div className={`mt-10 flex flex-col gap-3 border-t pt-5 text-sm lg:flex-row lg:items-center lg:justify-between ${isHome ? "border-black/6 text-slate-400" : "border-white/10 text-neutral-500"}`}>
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
