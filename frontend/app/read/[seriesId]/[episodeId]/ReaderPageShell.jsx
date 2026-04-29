"use client";

import dynamic from "next/dynamic";

const ReaderPage = dynamic(() => import("../../../../components/reader/ReaderPage"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-black text-white">
      <h1 className="sr-only">Reader</h1>
      <div className="sticky top-0 z-20 border-b-2 border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="h-8 w-16 animate-pulse rounded-full border-2 border-white/15 bg-[#111111]" />
          <div className="h-6 w-40 animate-pulse rounded-full border-2 border-white/15 bg-[#111111]" />
          <div className="h-8 w-24 animate-pulse rounded-full border-2 border-white/15 bg-[#111111]" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`reader-shell-${index}`}
            className="h-48 animate-pulse rounded-[28px] border-2 border-white/15 bg-[#111111] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          />
        ))}
      </div>
      <noscript>
        <p className="mx-auto max-w-5xl px-4 pb-8 text-sm font-semibold text-white/70">
          JavaScript is required to open the reader view.
        </p>
      </noscript>
    </main>
  ),
});

export default function ReaderPageShell(props) {
  return <ReaderPage {...props} />;
}
