"use client";

import Link from "next/link";
import { ArrowRight, Heart, MessageCircleMore } from "lucide-react";

export default function HomeFooter() {
  const links = [
    { label: "Comics", href: "/comics" },
    { label: "Novels", href: "/novels" },
    { label: "Interactive", href: "/interactive" },
    { label: "Support", href: "/support" },
  ];

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.03)_100%)] p-5 shadow-[0_22px_56px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,92,164,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(103,232,249,0.1),transparent_30%)]" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/46">
            Gush
          </p>
          <h2 className="max-w-[12ch] font-display text-[2rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-[2.5rem]">
            Stories you love. Anytime, anywhere.
          </h2>
          <p className="max-w-[34rem] text-sm leading-7 text-white/64">
            Comics, novels, and interactive stories built for late-night reading sessions and one-more-chapter mistakes.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/search"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff5aa3_0%,#ff8cb8_100%)] px-6 text-sm font-semibold text-[#180d15] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Find a Story
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/support"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 text-sm font-medium text-white/82 transition-colors hover:bg-white/[0.08]"
          >
            Contact Support
            <MessageCircleMore className="size-4" />
          </Link>
        </div>
      </div>

      <div className="relative mt-5 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-3 text-sm text-white/60">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="inline-flex items-center gap-2 text-sm text-white/48">
          <Heart className="size-4 text-[var(--gush-warning)]" />
          Built for binge nights.
        </p>
      </div>
    </section>
  );
}
