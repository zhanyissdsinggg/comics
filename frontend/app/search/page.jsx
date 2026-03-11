import { Suspense } from "react";
import SearchPage from "../../components/search/SearchPage";
import Skeleton from "../../components/common/Skeleton";
import { createPageMetadata } from "../../lib/seo";

function readQuery(searchParams) {
  const raw = searchParams?.q;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value || "").trim();
}

export async function generateMetadata({ searchParams }) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const query = readQuery(resolvedSearchParams);

  return createPageMetadata({
    title: query ? `Search: ${query}` : "Search Comics & Novels",
    description: query
      ? `Browse search results for ${query}.`
      : "Search the catalog by title, genre, or keyword.",
    path: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
  });
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950">
          <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
            <Skeleton className="h-10 w-40 rounded-2xl" />
            <Skeleton className="h-8 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      }
    >
      <SearchPage />
    </Suspense>
  );
}
