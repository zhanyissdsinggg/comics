"use client";

import { storefrontPrimaryButtonClass } from "../../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../../components/common/SurfacePanel";

export default function LibraryError({ error, reset }) {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center px-6">
        <SurfacePanel
          appearance="dark"
          accent="yellow"
          tone="muted"
          className="relative w-full max-w-3xl p-8 text-center"
        >
          <span className="inline-flex rounded-full border-2 border-black bg-[#0b0b0b] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Library
          </span>
          <h1 className="mt-5 text-[2.1rem] font-black uppercase tracking-[0.04em] text-white sm:text-[2.7rem]">
            Library error
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/75">
            Couldn't load your library.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-7 text-white/60">
            {error?.message || "Retry when you're ready."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className={`mt-6 ${storefrontPrimaryButtonClass}`}
          >
            Retry
          </button>
        </SurfacePanel>
      </div>
    </main>
  );
}
