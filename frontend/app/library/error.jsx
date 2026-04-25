"use client";

import { storefrontPrimaryButtonClass } from "../../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../../components/common/SurfacePanel";

export default function LibraryError({ error, reset }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <div className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center px-6">
        <SurfacePanel
          appearance="light"
          accent="amber"
          className="relative w-full max-w-3xl bg-[#fffdf7] p-8 text-center"
        >
          <span className="inline-flex rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-black/72 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
            Library
          </span>
          <h1 className="mt-5 text-[2.1rem] font-black uppercase tracking-[0.04em] text-black sm:text-[2.7rem]">
            Library error
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/68">
            We couldn't load your library.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-black/55">
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
