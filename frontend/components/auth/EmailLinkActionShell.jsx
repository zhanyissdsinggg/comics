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
    <main className="gush-home-shell min-h-screen overflow-hidden text-slate-900">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <div className="gush-page-main">
        <div className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.84fr)] lg:py-10">
          <section className="max-w-3xl self-start">
            <div className="rounded-[32px] border border-[color:var(--gush-border)] bg-white px-6 py-7 shadow-[0_18px_44px_rgba(15,23,42,0.07)] sm:px-7 sm:py-8">
              <span className="inline-flex rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                {eyebrow}
              </span>
              <h1 className="mt-5 font-display text-[2.2rem] font-semibold leading-[0.96] tracking-tight text-slate-950 sm:text-[3rem]">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
                {description}
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="relative rounded-[32px] border border-[color:var(--gush-border)] bg-white p-6 text-slate-900 shadow-[0_18px_44px_rgba(15,23,42,0.07)] sm:p-7">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--gush-border)] to-transparent" />
              <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),transparent_38%)]" />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {asideTitle}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {asideBody}
                </p>
              </div>
            </section>

            <section className="relative rounded-[32px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--gush-border)] to-transparent" />
              <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),transparent_38%)]" />
              {children}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
