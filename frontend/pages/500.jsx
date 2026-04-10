import Link from "next/link";

export default function ServerErrorPage() {
  return (
    <main className="gush-home-shell relative min-h-screen overflow-hidden px-6 py-16 text-slate-900">
      <div className="gush-page-ambient" />
      <div className="gush-page-main mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <section className="relative w-full rounded-[32px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,248,252,0.98))] p-8 text-center shadow-[0_20px_52px_rgba(15,23,42,0.06)]">
          <span className="inline-flex rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Server error
          </span>
          <h1 className="mt-5 font-display text-[2.4rem] font-semibold tracking-tight text-slate-950 sm:text-[3rem]">
            We hit a temporary issue.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Your account and reading progress are safe. Try again or go back
            home.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Return home
            </Link>
            <Link
              href="/support"
              className="rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
            >
              Support
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
