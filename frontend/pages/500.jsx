import Link from "next/link";

export default function ServerErrorPage() {
  return (
    <main className="min-h-screen bg-[#050816] px-6 py-16 text-neutral-100">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-white/10 bg-neutral-950/80 p-8 text-center shadow-[0_34px_120px_rgba(2,6,23,0.48)]">
          <span className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/90">
            Server error
          </span>
          <h1 className="mt-5 text-4xl font-semibold text-white">We hit a temporary issue.</h1>
          <p className="mt-4 text-base leading-7 text-neutral-300">
            The request did not complete cleanly, but your account and reading progress are safe.
            Please try again in a moment or jump back to a stable page.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-50"
            >
              Return home
            </Link>
            <Link
              href="/support"
              className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-white/[0.04]"
            >
              Contact support
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
