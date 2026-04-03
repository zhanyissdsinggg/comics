"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const StorePage = dynamic(() => import("../../components/store/StorePage"), {
  ssr: false,
  loading: () => (
    <div className="gush-page-shell gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <main className="gush-page-main gush-section-stack">
        <Skeleton className="h-[22rem] rounded-[32px]" />
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
