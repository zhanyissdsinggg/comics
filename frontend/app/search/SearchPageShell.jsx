"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const SearchPage = dynamic(() => import("../../components/search/SearchPage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen overflow-hidden bg-black text-black">
      <main className="mx-auto w-full max-w-[1320px] space-y-5 px-4 py-10">
        <section className="border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
            Search
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.05em] text-black">
            Find titles fast.
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="/comics"
              className="border-[3px] border-black bg-[#00e5ff] px-3 py-1.5 font-black uppercase tracking-[0.08em] text-black"
            >
              Comics
            </a>
            <a
              href="/novels"
              className="border-[3px] border-black bg-[#fff6c7] px-3 py-1.5 font-black uppercase tracking-[0.08em] text-black"
            >
              Novels
            </a>
            <a
              href="/creators"
              className="border-[3px] border-black bg-white px-3 py-1.5 font-black uppercase tracking-[0.08em] text-black"
            >
              Creators
            </a>
          </div>
        </section>
        <Skeleton className="h-14 w-full rounded-[24px] border-[3px] border-black bg-white shadow-[5px_5px_0_0_rgba(0,0,0,1)]" />
        <Skeleton className="h-72 w-full rounded-[30px] border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]" />
      </main>
    </div>
  ),
});

export default function SearchPageShell() {
  return <SearchPage />;
}
