"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="gush-home-shell overflow-hidden text-black">
        <div className="gush-page-ambient" />
        <main className="gush-page-main flex min-h-screen items-center justify-center px-6">
          <div className="relative w-full max-w-3xl rounded-[32px] border-[3px] border-black bg-[#fffdf7] p-8 text-center shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <span className="inline-flex rounded-full border-[2px] border-black bg-[#ffe500] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-black">
              Error
            </span>
            <h1 className="mt-5 text-[2.2rem] font-black uppercase tracking-[0.04em] text-black sm:text-[2.8rem]">
              Something went wrong
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/68">
              We could not load this page cleanly. Please try again, go back
              home, or contact support if the problem keeps happening.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-full border-[3px] border-black bg-[#ff007a] px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="rounded-full border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black transition hover:-translate-y-0.5 hover:bg-[#eefcff]"
              >
                Go home
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/support";
                }}
                className="rounded-full border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black transition hover:-translate-y-0.5 hover:bg-[#eefcff]"
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
