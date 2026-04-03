"use client";

export default function AuthRedirectPage({
  title = "Opening sign in",
  description = "You'll be back to reading in a moment.",
}) {
  return (
    <div className="gush-home-shell relative min-h-screen overflow-hidden">
      <div className="gush-page-ambient" />
      <main className="gush-page-main flex min-h-screen items-center justify-center">
        <div className="relative w-full max-w-md rounded-[32px] border border-[rgba(47,88,198,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.96))] px-8 py-8 text-center shadow-[0_26px_72px_rgba(15,23,42,0.08)]">
          <div className="mx-auto inline-flex rounded-full border border-[rgba(47,88,198,0.12)] bg-[rgba(47,88,198,0.06)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Redirecting
          </div>
          <div className="mx-auto mt-5 h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--gush-accent,#2f6bff)] border-t-transparent" />
          <h1 className="mt-5 font-display text-[1.9rem] font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-400">
            Getting things ready
          </p>
        </div>
      </main>
    </div>
  );
}
