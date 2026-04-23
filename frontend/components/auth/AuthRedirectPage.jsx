"use client";

export default function AuthRedirectPage({
  title = "Opening sign in",
  description = "You'll be back to reading in a moment.",
}) {
  return (
    <div className="gush-home-shell relative min-h-screen overflow-hidden">
      <div className="gush-page-ambient" />
      <main className="gush-page-main flex min-h-screen items-center justify-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border-[3px] border-black bg-white px-8 py-8 text-center shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),transparent_30%)]" />
          <div className="relative mx-auto inline-flex rounded-full border-[3px] border-black bg-[#dffcff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-black/55">
            Redirecting
          </div>
          <div className="mx-auto mt-5 h-9 w-9 animate-spin rounded-full border-[4px] border-black border-t-transparent" />
          <h1 className="relative mt-5 font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-black">
            {title}
          </h1>
          <p className="relative mt-3 text-sm leading-7 text-black/68">
            {description}
          </p>
          <p className="relative mt-6 text-xs uppercase tracking-[0.24em] text-black/40">
            Getting things ready
          </p>
        </div>
      </main>
    </div>
  );
}
