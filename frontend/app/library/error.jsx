"use client";

export default function LibraryError({ error, reset }) {
  return (
    <main className="gush-home-shell min-h-screen overflow-hidden text-slate-900">
      <div className="gush-page-ambient" />
      <div className="gush-page-main flex min-h-screen items-center justify-center px-6">
        <div className="relative w-full max-w-3xl rounded-[32px] border border-[color:var(--gush-border)] bg-white p-8 text-center shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <span className="inline-flex rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Library
          </span>
          <h1 className="mt-5 font-display text-[2.1rem] font-semibold tracking-tight text-slate-950 sm:text-[2.7rem]">
            Library error
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            We could not load your library cleanly right now. Please try again.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-500">
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
      </div>
    </main>
  );
}
