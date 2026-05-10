import FigmaSearchPage from "../../components/figma/FigmaSearchPage";
import { createPageMetadata } from "../../lib/seo";
import { loadSearchSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Search Stories",
  description: "Browse stories, creators, and formats on Gush.",
  path: "/search",
  robots: {
    index: false,
    follow: true,
  },
});

export default async function Page({ searchParams }) {
  const params = (await searchParams) || {};
  const initialQuery = String(params?.q || "").trim();
  const initialFormat = String(params?.format || "").trim();
  const { results, hotKeywords, ready } = await loadSearchSeoPayload(initialQuery);

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
