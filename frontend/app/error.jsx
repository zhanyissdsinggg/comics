"use client";

import { storefrontPrimaryButtonClass, storefrontSecondaryButtonClass } from "../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../components/common/SurfacePanel";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="overflow-hidden bg-black text-black">
        <main className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center px-6">
          <SurfacePanel
            appearance="light"
            accent="amber"
            className="relative w-full max-w-3xl bg-[#fffdf7] p-8 text-center"
          >
            <span className="inline-flex border-[2px] border-black bg-[#ffe500] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-black">
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
                className={storefrontPrimaryButtonClass}
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                className={storefrontSecondaryButtonClass}
              >
                Go home
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/support";
                }}
                className={storefrontSecondaryButtonClass}
              >
                Support
              </button>
            </div>
          </SurfacePanel>
        </main>
      </body>
    </html>
  );
}
