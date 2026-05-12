import RankingsPage from "../../components/rankings/RankingsPage";
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

export default async function Page({ searchParams }) {
  const params = (await searchParams) || {};
  const includeAdult = await isServerAdultModeEnabled();
  const payload = await loadRankingsSeoPayload("popular", "all", { includeAdult });

  return (
    <RankingsPage
      initialSearchParams={params}
      initialSeries={payload?.rankings || []}
      hasInitialSeries={payload?.ready}
    />
  );
}
