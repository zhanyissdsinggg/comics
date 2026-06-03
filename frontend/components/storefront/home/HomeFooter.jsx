"use client";

import Link from "next/link";

export default function HomeFooter() {
  const links = [
    { label: "Comics", href: "/comics" },
    { label: "Novels", href: "/novels" },
    { label: "Interactive", href: "/interactive" },
    { label: "Rankings", href: "/rankings" },
    { label: "Search", href: "/search" },
    { label: "Support", href: "/support" },
    { label: "Privacy", href: "/privacy-policy" },
    { label: "Terms", href: "/terms-of-service" },
  ];

  return (
    <footer className="border-t border-[rgba(255,255,255,0.08)] py-7 sm:py-[28px]">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Link
            href="/"
            className="inline-block bg-[linear-gradient(135deg,#EC4899_0%,#7C3AED_100%)] bg-clip-text font-display text-[1.7rem] font-black italic leading-none text-transparent"
          >
            Gush
          </Link>
          <p className="max-w-[28rem] text-[13px] leading-6 text-[rgba(255,255,255,0.45)]">
            Comics, novels, and interactive stories built for late-night binge sessions.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-4 gap-y-3 text-[13px] text-[rgba(255,255,255,0.45)] md:max-w-[42rem] md:justify-end">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors duration-200 hover:text-[rgba(255,255,255,0.82)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-5 flex flex-col gap-1 text-[13px] leading-6 text-[rgba(255,255,255,0.34)] sm:flex-row sm:items-center sm:justify-between">
        <p>Copyright 2026 Targaryen technology Co., Limited</p>
        <p>Gush Comics is operated by Targaryen technology Co., Limited.</p>
      </div>
    </footer>
  );
}
