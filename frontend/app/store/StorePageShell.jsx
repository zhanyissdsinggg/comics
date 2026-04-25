"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const StorePage = dynamic(() => import("../../components/store/StorePage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="rounded-[30px] border border-black/10 bg-white p-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
            Store
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-black">
            Pick a plan.
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="/subscribe"
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-semibold uppercase tracking-[0.08em] text-black shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
            >
              Membership
            </a>
            <a
              href="/orders"
              className="rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1.5 font-semibold uppercase tracking-[0.08em] text-black shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
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
