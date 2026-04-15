"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const StorePage = dynamic(() => import("../../components/store/StorePage"), {
  ssr: false,
  loading: () => (
    <div className="gush-page-shell gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <main className="gush-page-main gush-section-stack">
        <section className="rounded-[30px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Store
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">
            Pick a plan.
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <a
              href="/subscribe"
              className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1.5 hover:border-[color:var(--gush-border-strong)]"
            >
              Membership
            </a>
            <a
              href="/orders"
              className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1.5 hover:border-[color:var(--gush-border-strong)]"
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
