"use client";

import SiteHeader from "../layout/SiteHeader";

export default function EmailLinkActionShell({
  eyebrow,
  title,
  description,
  asideTitle,
  asideBody,
  children,
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-neutral-100">
      <SiteHeader />
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_26%),radial-gradient(circle_at_78%_16%,rgba(59,130,246,0.14),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.14)_0%,rgba(2,6,23,0)_60%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <section className="max-w-xl self-center">
            <span className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/90">
              {eyebrow}
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-neutral-300 sm:text-lg">
              {description}
            </p>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_80px_rgba(2,6,23,0.32)]">
              <p className="text-sm font-semibold text-white">{asideTitle}</p>
              <p className="mt-3 text-sm leading-6 text-neutral-400">{asideBody}</p>
            </div>
          </section>

          <section className="relative rounded-[32px] border border-white/10 bg-neutral-950/80 p-6 shadow-[0_34px_120px_rgba(2,6,23,0.48)] backdrop-blur sm:p-8">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
