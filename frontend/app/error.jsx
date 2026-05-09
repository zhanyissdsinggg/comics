"use client";

import { storefrontPrimaryButtonClass, storefrontSecondaryButtonClass } from "../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../components/common/SurfacePanel";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="overflow-hidden bg-[linear-gradient(180deg,#0f0d13_0%,#130f18_44%,#17131d_100%)] text-white">
        <main className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center px-6">
          <SurfacePanel
            appearance="dark"
            accent="rose"
            tone="muted"
            className="relative w-full max-w-3xl p-8 text-center"
          >
            <span className="inline-flex rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/62">
              Error
            </span>
            <h1 className="mt-5 font-display text-[2.2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.8rem]">
              Something went wrong
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/75">
              Retry or head back home.
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
