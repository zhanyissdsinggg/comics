"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="bg-[#f4f6fb] text-slate-900">
        <main className="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
          <div className="relative w-full rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,248,252,0.98))] p-8 text-center shadow-[0_26px_70px_rgba(15,23,42,0.08)]">
            <span className="inline-flex rounded-full border border-black/8 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Error
            </span>
            <h1 className="mt-5 text-3xl font-semibold text-slate-950">Something went wrong</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              We could not load this page cleanly. Please try again, go back home, or contact support if the problem keeps happening.
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
                className="rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                Go home
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
