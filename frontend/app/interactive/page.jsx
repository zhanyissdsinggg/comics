import FigmaSearchPage from "../../components/figma/FigmaSearchPage";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";
import { loadSearchSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Interactive Stories",
  description: "Browse interactive stories on Gush.",
  path: "/interactive",
  robots: buildNoIndexRobots({ follow: true }),
});

export default async function InteractivePage() {
  const includeAdult = await isServerAdultModeEnabled();
  const { results, hotKeywords, ready } = await loadSearchSeoPayload("", {
    includeAdult,
  });

  return (
    <FigmaSearchPage
      initialQuery=""
      initialFormat="interactive"
      initialResults={results}
      initialHotKeywords={hotKeywords}
      initialReady={ready}
    />
  );
}
