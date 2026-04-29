"use client";

import { storefrontPrimaryButtonClass, storefrontSecondaryButtonClass } from "../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../components/common/SurfacePanel";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="overflow-hidden bg-black text-white">
        <main className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center px-6">
          <SurfacePanel
            appearance="dark"
            accent="yellow"
            tone="muted"
            className="relative w-full max-w-3xl p-8 text-center"
          >
            <span className="inline-flex rounded-full border-2 border-black bg-[#0b0b0b] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              Error
            </span>
            <h1 className="mt-5 text-[2.2rem] font-black uppercase tracking-[0.04em] text-white sm:text-[2.8rem]">
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
