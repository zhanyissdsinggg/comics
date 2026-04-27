"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const SearchPage = dynamic(() => import("../../components/search/SearchPage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <main className="mx-auto w-full max-w-[1320px] space-y-5 px-4 py-10">
        <section className="rounded-[28px] border-2 border-[#FFE500] bg-black/90 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
            Search
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.05em] text-white">
            Titles
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="/comics"
              className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Comics
            </a>
            <a
              href="/novels"
              className="rounded-full border-2 border-black bg-[#FF007A] px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Novels
            </a>
            <a
              href="/creators"
              className="rounded-full border-2 border-black bg-[#00E5FF] px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Creators
            </a>
          </div>
        </section>
        <Skeleton className="h-14 w-full rounded-[22px] border-2 border-white/20 bg-white/10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
        <Skeleton className="h-72 w-full rounded-[28px] border-2 border-white/20 bg-white/10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
      </main>
    </div>
  ),
});

export default function SearchPageShell() {
  return <SearchPage />;
}
