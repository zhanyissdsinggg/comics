"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const SearchPage = dynamic(() => import("../../components/search/SearchPage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <main className="mx-auto w-full max-w-[1320px] space-y-5 px-4 py-10">
        <section className="rounded-[30px] border border-black/10 bg-white p-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
            Search
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.05em] text-black">
            Titles
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="/comics"
              className="rounded-full border border-black/10 bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-black/72"
            >
              Comics
            </a>
            <a
              href="/novels"
              className="rounded-full border border-black/10 bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-black/72"
            >
              Novels
            </a>
            <a
              href="/creators"
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-black/72"
            >
              Creators
            </a>
          </div>
        </section>
        <Skeleton className="h-14 w-full rounded-[24px] border border-black/10 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.06)]" />
        <Skeleton className="h-72 w-full rounded-[30px] border border-black/10 bg-white shadow-[0_20px_46px_rgba(15,23,42,0.08)]" />
      </main>
    </div>
  ),
});

export default function SearchPageShell() {
  return <SearchPage />;
}
