"use client";

import { storefrontPrimaryButtonClass } from "../../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../../components/common/SurfacePanel";

export default function LibraryError({ error, reset }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0f0d13_0%,#130f18_44%,#17131d_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center px-6">
        <SurfacePanel
          appearance="dark"
          accent="blue"
          tone="muted"
          className="relative w-full max-w-3xl p-8 text-center"
        >
          <span className="inline-flex rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/62">
            Library
          </span>
          <h1 className="mt-5 font-display text-[2.1rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.7rem]">
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
