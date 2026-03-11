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
        <div className="min-h-screen bg-neutral-950">
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
            <div className="h-48 w-full animate-pulse rounded-3xl bg-neutral-800" />
            <div className="h-10 w-64 animate-pulse rounded-2xl bg-neutral-800" />
            <div className="h-48 w-full animate-pulse rounded-3xl bg-neutral-800" />
          </div>
        </div>
      }
    >
      <HomePage />
    </Suspense>
  );
}
