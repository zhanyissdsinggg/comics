"use client";

import dynamic from "next/dynamic";

const ReaderPage = dynamic(() => import("../../../../components/reader/ReaderPage"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-[#f6f7f9] text-black">
      <h1 className="sr-only">Reader</h1>
      <div className="sticky top-0 z-20 border-b border-black/8 bg-[rgba(255,255,255,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="h-8 w-16 animate-pulse rounded-full bg-black/10" />
          <div className="h-6 w-40 animate-pulse rounded-full bg-black/10" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-black/10" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`reader-shell-${index}`}
            className="h-48 animate-pulse rounded-[28px] bg-black/[0.06]"
          />
        ))}
      </div>
      <noscript>
        <p className="mx-auto max-w-5xl px-4 pb-8 text-sm text-black/60">
          JavaScript is required to open the reader view.
        </p>
      </noscript>
    </main>
  ),
});

export default function ReaderPageShell(props) {
  return <ReaderPage {...props} />;
}
