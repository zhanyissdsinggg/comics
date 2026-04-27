"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const StorePage = dynamic(() => import("../../components/store/StorePage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="rounded-[28px] border-2 border-[#FFE500] bg-black/90 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
            Store
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.05em] text-white">
            Top up.
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="/subscribe"
              className="rounded-full border-2 border-black bg-[#00E5FF] px-3 py-1.5 font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Membership
            </a>
            <a
              href="/orders"
              className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1.5 font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Orders
            </a>
          </div>
        </section>
        <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-6">
            <Skeleton className="h-56 rounded-[28px] border-2 border-white/20 bg-white/10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
            <Skeleton className="h-56 rounded-[28px] border-2 border-white/20 bg-white/10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
          </div>
          <Skeleton className="h-[42rem] rounded-[28px] border-2 border-white/20 bg-white/10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
        </div>
      </main>
    </div>
  ),
});

export default function StorePageShell(props) {
  return <StorePage {...props} />;
}
