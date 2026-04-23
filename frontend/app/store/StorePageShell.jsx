"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const StorePage = dynamic(() => import("../../components/store/StorePage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen overflow-hidden bg-black text-black">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
            Store
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.05em] text-black">
            Pick a plan.
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="/subscribe"
              className="border-[3px] border-black bg-[#00e5ff] px-3 py-1.5 font-black uppercase tracking-[0.08em] text-black"
            >
              Membership
            </a>
            <a
              href="/orders"
              className="border-[3px] border-black bg-[#fff6c7] px-3 py-1.5 font-black uppercase tracking-[0.08em] text-black"
            >
              Orders
            </a>
          </div>
        </section>
        <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-6">
            <Skeleton className="h-56 rounded-[28px]" />
            <Skeleton className="h-56 rounded-[28px]" />
          </div>
          <Skeleton className="h-[42rem] rounded-[28px]" />
        </div>
      </main>
    </div>
  ),
});

export default function StorePageShell(props) {
  return <StorePage {...props} />;
}
