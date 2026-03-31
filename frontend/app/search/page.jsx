import { Suspense } from "react";
import SearchPageShell from "./SearchPageShell";
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
    robots: {
      index: false,
      follow: true,
    },
  });
}

export default function Page() {
  return (
    <Suspense>
      <SearchPageShell />
    </Suspense>
  );
}
