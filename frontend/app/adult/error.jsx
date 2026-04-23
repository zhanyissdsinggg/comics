"use client";

import { storefrontPrimaryButtonClass } from "../../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../../components/common/SurfacePanel";

export default function AdultError({ error, reset }) {
  return (
    <main className="gush-home-shell min-h-screen overflow-hidden text-slate-900">
      <div className="gush-page-ambient" />
      <div className="gush-page-main flex min-h-screen items-center justify-center px-6">
        <SurfacePanel
          appearance="light"
          accent="rose"
          className="relative w-full max-w-3xl overflow-hidden bg-white p-8 text-center"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),transparent_30%)]" />
          <span className="relative inline-flex border-[3px] border-black bg-[#ffe7ec] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-black/60">
            Adult
          </span>
          <h1 className="relative mt-5 font-display text-[2.1rem] font-black uppercase tracking-[-0.05em] text-black sm:text-[2.7rem]">
            Adult Hub error
          </h1>
          <p className="relative mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/68">
            We could not load the 18+ catalog cleanly right now. Please try
            again.
          </p>
          <p className="relative mx-auto mt-2 max-w-2xl text-sm leading-7 text-black/54">
            {error?.message || "Please try again."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className={`relative mt-6 ${storefrontPrimaryButtonClass}`}
          >
            Retry
          </button>
        </SurfacePanel>
      </div>
    </main>
  );
}
