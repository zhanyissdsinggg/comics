"use client";

export default function GlobalError({ error, reset }) {
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
              {error?.message || "Please try again."}
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
