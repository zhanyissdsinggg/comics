"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const SearchPage = dynamic(() => import("../../components/search/SearchPage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen overflow-hidden bg-[var(--gush-page-bg)] text-[var(--gush-ink-strong)]">
      <main className="mx-auto w-full max-w-[1320px] space-y-5 px-4 py-10">
        <section className="overflow-hidden rounded-[32px] border border-[var(--gush-border)] bg-[linear-gradient(180deg,rgba(22,18,30,0.96)_0%,rgba(15,13,19,0.98)_100%)] p-6 shadow-[var(--gush-shadow-panel)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,79,154,0.12),transparent_28%),radial-gradient(circle_at_top_left,rgba(103,232,249,0.1),transparent_24%)]" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gush-ink-soft)]">
            Search
          </p>
          <h1 className="relative mt-3 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.4rem]">
            Find your next obsession
          </h1>
          <p className="relative mt-3 max-w-2xl text-sm leading-6 text-[var(--gush-ink-soft)]">
            Search by mood, genre, format, or creator.
          </p>
          <div className="relative mt-5 flex flex-wrap gap-2 text-xs">
            <a
              href="/comics"
              className="rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.08]"
            >
              Comics
            </a>
            <a
              href="/novels"
              className="rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.08]"
            >
              Novels
            </a>
            <a
              href="/creators"
              className="rounded-full border border-[rgba(103,232,249,0.2)] bg-[rgba(103,232,249,0.08)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--gush-cyan)] shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-[rgba(103,232,249,0.3)] hover:bg-[rgba(103,232,249,0.12)]"
            >
              Creators
            </a>
          </div>
        </section>
        <Skeleton className="h-14 w-full rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_18px_42px_rgba(8,6,20,0.22)]" />
        <Skeleton className="h-72 w-full rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_20px_48px_rgba(8,6,20,0.24)]" />
      </main>
    </div>
  ),
});

export default function SearchPageShell() {
  return <SearchPage />;
}
