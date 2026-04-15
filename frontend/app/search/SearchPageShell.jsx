"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const SearchPage = dynamic(() => import("../../components/search/SearchPage"), {
  ssr: false,
  loading: () => (
    <div className="gush-page-shell gush-home-shell min-h-screen overflow-hidden">
      <div className="gush-page-ambient h-[clamp(24rem,42vw,36rem)]" />
      <main className="mx-auto w-full max-w-[1320px] space-y-5 px-4 py-10">
        <section className="rounded-[30px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Search
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">
            Find titles fast.
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <a
              href="/comics"
              className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1.5 hover:border-[color:var(--gush-border-strong)]"
            >
              Comics
            </a>
            <a
              href="/novels"
              className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1.5 hover:border-[color:var(--gush-border-strong)]"
            >
              Novels
            </a>
            <a
              href="/creators"
              className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1.5 hover:border-[color:var(--gush-border-strong)]"
            >
              Creators
            </a>
          </div>
        </section>
        <Skeleton className="h-14 w-full rounded-[24px] border border-[color:var(--gush-border)] bg-white" />
        <Skeleton className="h-72 w-full rounded-[30px] border border-[color:var(--gush-border)] bg-white" />
      </main>
    </div>
  ),
});

export default function SearchPageShell() {
  return <SearchPage />;
}
