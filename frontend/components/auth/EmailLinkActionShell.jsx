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
    <main className="relative min-h-screen overflow-hidden bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.12),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(255,255,255,0.82),transparent_22%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <div className="relative">
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <section className="max-w-xl self-center">
            <span className="inline-flex rounded-full border border-black/8 bg-white/84 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              {eyebrow}
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
              {description}
            </p>

            <div className="mt-8 rounded-[28px] border border-[rgba(47,107,255,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,246,255,0.98))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {asideTitle}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{asideBody}</p>
            </div>
          </section>

          <section className="relative rounded-[32px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(47,107,255,0.32)] to-transparent" />
            <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.06),transparent_26%),radial-gradient(circle_at_86%_0%,rgba(255,255,255,0.72),transparent_22%)]" />
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
