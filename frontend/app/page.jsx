import { Suspense } from "react";
import HomePage from "../components/home/HomePage";
import { createPageMetadata } from "../lib/seo";

export const metadata = createPageMetadata({
  title: "Read Comics, Manga & Novels Online",
  description:
    "Discover premium comics and novels with fast pages, mature-content controls that work, and daily reading updates.",
  path: "/",
});

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f6fb]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
            <div className="h-48 w-full animate-pulse rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
            <div className="h-10 w-64 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-48 w-full animate-pulse rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
          </div>
        </div>
      }
    >
      <HomePage />
    </Suspense>
  );
}
