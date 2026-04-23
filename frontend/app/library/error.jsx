"use client";

import { storefrontPrimaryButtonClass } from "../../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../../components/common/SurfacePanel";

export default function LibraryError({ error, reset }) {
  return (
    <main className="gush-home-shell min-h-screen overflow-hidden text-black">
      <div className="gush-page-ambient" />
      <div className="gush-page-main flex min-h-screen items-center justify-center px-6">
        <SurfacePanel
          appearance="light"
          accent="amber"
          className="relative w-full max-w-3xl bg-[#fffdf7] p-8 text-center"
        >
          <span className="inline-flex border-[2px] border-black bg-[#ffe500] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-black">
            Library
          </span>
          <h1 className="mt-5 text-[2.1rem] font-black uppercase tracking-[0.04em] text-black sm:text-[2.7rem]">
            Library error
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/68">
            We could not load your library cleanly right now. Please try again.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-black/55">
            {error?.message || "Please try again."}
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
