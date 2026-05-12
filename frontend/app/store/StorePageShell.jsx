"use client";

import { Suspense, lazy } from "react";
import Skeleton from "../../components/common/Skeleton";

const StorePageRuntime = lazy(() => import("./StorePageRuntime"));

function StoreLoadingFallback({ prelaunchStore = false }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0f0d13_0%,#130f18_44%,#17131d_100%)] text-white">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,30,0.96)_0%,rgba(15,13,19,0.98)_100%)] p-6 shadow-[0_28px_72px_rgba(8,6,20,0.34)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Store
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
            {prelaunchStore ? "Points are coming soon." : "Store"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
            {prelaunchStore
              ? "Point packs are not available yet. You can browse free chapters and reach support while checkout stays staged."
              : "Store access is ready for wallet and membership actions."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="/"
              className="rounded-full border border-[rgba(255,79,154,0.3)] bg-[linear-gradient(135deg,#ff4f9a_0%,#ff76ad_100%)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1a0e16] shadow-[0_14px_32px_rgba(255,79,154,0.22)] transition-all hover:-translate-y-0.5"
            >
              Browse free chapters
            </a>
            <a
              href="/support"
              className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.08]"
            >
              Support
            </a>
          </div>
        </section>
        <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-6">
            <Skeleton className="h-56 rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_20px_48px_rgba(8,6,20,0.24)]" />
            <Skeleton className="h-56 rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_20px_48px_rgba(8,6,20,0.24)]" />
          </div>
          <Skeleton className="h-[42rem] rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_20px_48px_rgba(8,6,20,0.24)]" />
        </div>
      </main>
    </div>
  );
}

export default function StorePageShell(props) {
  return (
    <Suspense
      fallback={<StoreLoadingFallback prelaunchStore={props?.prelaunchStore} />}
    >
      <StorePageRuntime {...props} />
    </Suspense>
  );
}
