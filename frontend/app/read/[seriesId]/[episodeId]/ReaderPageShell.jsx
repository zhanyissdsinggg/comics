"use client";

import dynamic from "next/dynamic";

const ReaderPage = dynamic(() => import("../../../../components/reader/ReaderPage"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="h-8 w-16 animate-pulse rounded-full bg-white/10" />
          <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`reader-shell-${index}`}
            className="h-48 animate-pulse rounded-[28px] bg-white/5"
          />
        ))}
      </div>
    </main>
  ),
});

export default function ReaderPageShell(props) {
  return <ReaderPage {...props} />;
}
