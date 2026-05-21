import FigmaSearchPage from "../../components/figma/FigmaSearchPage";
import SearchPageShell from "./SearchPageShell";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Search Stories",
  description: "Browse stories, creators, and formats on Gush.",
  path: "/search",
  robots: buildNoIndexRobots({ follow: true }),
});

function isInteractiveSearchRoute(searchParams = {}) {
  const type = String(searchParams?.type || "")
    .trim()
    .toLowerCase();
  const format = String(searchParams?.format || "")
    .trim()
    .toLowerCase();

  return type === "interactive" || format === "interactive";
}

export default async function Page({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  if (isInteractiveSearchRoute(resolvedSearchParams)) {
    return (
      <FigmaSearchPage
        initialQuery={String(
          resolvedSearchParams.q || resolvedSearchParams.query || "",
        ).trim()}
        initialFormat="interactive"
        initialResults={[]}
        initialHotKeywords={[]}
        initialReady
        interactiveOnly
      />
    );
  }

  return <SearchPageShell />;
}
