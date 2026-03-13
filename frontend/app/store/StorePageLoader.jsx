"use client";

import dynamic from "next/dynamic";
import Skeleton from "../../components/common/Skeleton";

const StorePage = dynamic(() => import("../../components/store/StorePage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-40 rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  ),
});

export default function StorePageLoader() {
  return <StorePage />;
}
