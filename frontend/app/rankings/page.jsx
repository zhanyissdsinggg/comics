import RankingsPage from "../../components/rankings/RankingsPage";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";
import {
  loadRankingsSeoPayload,
  loadSeriesCatalogSeoPayload,
} from "../../lib/storefrontSeo";

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
  const rankingsPayload = await loadRankingsSeoPayload("popular", "all", {
    includeAdult,
  });
  const catalogPayload =
    Array.isArray(rankingsPayload?.rankings) && rankingsPayload.rankings.length > 0
      ? null
      : await loadSeriesCatalogSeoPayload({ includeAdult });
  const initialSeries =
    Array.isArray(rankingsPayload?.rankings) && rankingsPayload.rankings.length > 0
      ? rankingsPayload.rankings
      : Array.isArray(catalogPayload?.series)
        ? catalogPayload.series
        : [];

  return (
    <RankingsPage
      initialSearchParams={params}
      initialSeries={initialSeries}
      hasInitialSeries={initialSeries.length > 0}
    />
  );
}
