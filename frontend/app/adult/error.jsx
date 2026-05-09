"use client";

import { storefrontPrimaryButtonClass } from "../../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../../components/common/SurfacePanel";

export default function AdultError({ error, reset }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0f0d13_0%,#130f18_44%,#17131d_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1320px] items-center justify-center px-6">
        <SurfacePanel
          appearance="dark"
          accent="rose"
          tone="muted"
          className="relative w-full max-w-3xl overflow-hidden p-8 text-center"
        >
          <span className="relative inline-flex rounded-full border border-[rgba(255,189,205,0.28)] bg-[rgba(255,79,154,0.14)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6e5]">
            Mature
          </span>
          <h1 className="relative mt-5 font-display text-[2.1rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.7rem]">
            Mature mode error
          </h1>
          <p className="relative mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/75">
            Couldn't load the 18+ catalog.
          </p>
          <p className="relative mx-auto mt-2 max-w-2xl text-sm font-semibold leading-7 text-white/60">
            {error?.message || "Retry when you're ready."}
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
