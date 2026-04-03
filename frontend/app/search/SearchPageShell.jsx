"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const SearchPage = dynamic(() => import("../../components/search/SearchPage"), {
  ssr: false,
  loading: () => (
    <div className="gush-page-shell gush-home-shell min-h-screen overflow-hidden">
      <div className="gush-page-ambient h-[clamp(24rem,42vw,36rem)]" />
      <div className="mx-auto max-w-[1320px] space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-40 rounded-2xl bg-white/10" />
        <Skeleton className="h-8 w-full rounded-2xl bg-white/10" />
        <Skeleton className="h-64 w-full rounded-3xl bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.18)]" />
      </div>
    </div>
  ),
});

export default function SearchPageShell() {
  return <SearchPage />;
}
