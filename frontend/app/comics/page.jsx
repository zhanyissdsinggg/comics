import ComicsLandingPage from "../../components/storefront/ComicsLandingPage";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export async function generateMetadata() {
  const includeAdult = await isServerAdultModeEnabled();

  return createPageMetadata({
    title: "Comics",
    description: "Trending comics, new updates, and finished reads on Gush.",
    path: "/comics",
    robots: includeAdult ? buildNoIndexRobots({ follow: false }) : undefined,
  });
}

export default async function Page() {
  const includeAdult = await isServerAdultModeEnabled();
  const payload = await loadSeriesCatalogSeoPayload({
    includeAdult,
  });

  return (
    <ComicsLandingPage
      initialSeries={payload?.series || []}
      initialReady={payload?.ready}
      initialIncludeAdult={includeAdult}
    />
  );
}
