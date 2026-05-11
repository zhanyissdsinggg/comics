import FigmaSearchPage from "../../components/figma/FigmaSearchPage";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";
import { loadSearchSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Search Stories",
  description: "Browse stories, creators, and formats on Gush.",
  path: "/search",
  robots: buildNoIndexRobots({ follow: true }),
});

export default async function Page({ searchParams }) {
  const params = (await searchParams) || {};
  const initialQuery = String(params?.q || "").trim();
  const initialFormat = String(params?.format || "").trim();
  const includeAdult = await isServerAdultModeEnabled();
  const { results, hotKeywords, ready } = await loadSearchSeoPayload(
    initialQuery,
    { includeAdult },
  );

  return (
    <FigmaSearchPage
      initialQuery={initialQuery}
      initialFormat={initialFormat}
      initialResults={results}
      initialHotKeywords={hotKeywords}
      initialReady={ready}
    />
  );
}
