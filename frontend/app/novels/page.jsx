import FigmaHomePage from "../../components/figma/FigmaHomePage";
import { FIGMA_CONTENT_TYPES } from "../../components/figma/figma-utils";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export async function generateMetadata() {
  const includeAdult = await isServerAdultModeEnabled();

  return createPageMetadata({
    title: "Novels",
    description: "Trending novels, fresh updates, and finished reads on Gush.",
    path: "/novels",
    robots: includeAdult ? buildNoIndexRobots({ follow: false }) : undefined,
  });
}

export default async function Page() {
  const includeAdult = await isServerAdultModeEnabled();
  const payload = await loadSeriesCatalogSeoPayload({ includeAdult });

  return (
    <FigmaHomePage
      seriesList={payload?.series || []}
      initialContentType={FIGMA_CONTENT_TYPES.NOVELS}
      initialReady={payload?.ready}
    />
  );
}
