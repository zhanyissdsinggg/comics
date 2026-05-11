import FigmaHomePage from "../../components/figma/FigmaHomePage";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";
import { loadRankingsSeoPayload } from "../../lib/storefrontSeo";

export async function generateMetadata() {
  const includeAdult = await isServerAdultModeEnabled();

  return createPageMetadata({
    title: "Trending Stories",
    description: "Trending titles, top picks, and finished series on Gush.",
    path: "/rankings",
    robots: includeAdult ? buildNoIndexRobots({ follow: false }) : undefined,
  });
}

export default async function Page() {
  const includeAdult = await isServerAdultModeEnabled();
  const payload = await loadRankingsSeoPayload("popular", "all", { includeAdult });

  return (
    <FigmaHomePage
      seriesList={payload?.rankings || []}
      initialReady={payload?.ready}
      catalogSource="rankings"
    />
  );
}
