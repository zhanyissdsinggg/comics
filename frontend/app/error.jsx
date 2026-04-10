"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="gush-home-shell overflow-hidden text-slate-900">
        <div className="gush-page-ambient" />
        <main className="gush-page-main flex min-h-screen items-center justify-center px-6">
          <div className="relative w-full max-w-3xl rounded-[32px] border border-[color:var(--gush-border)] bg-white p-8 text-center shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
            <span className="inline-flex rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Error
            </span>
            <h1 className="mt-5 font-display text-[2.2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.8rem]">
              Something went wrong
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              We could not load this page cleanly. Please try again, go back
              home, or contact support if the problem keeps happening.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
              >
                Go home
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/support";
                }}
                className="rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
              >
                Support
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
