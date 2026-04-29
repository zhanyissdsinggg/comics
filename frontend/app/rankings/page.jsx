import RankingsPage from "../../components/rankings/RankingsPage";
import { createPageMetadata } from "../../lib/seo";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Trending Stories",
  description: "Trending titles, top picks, and finished series on Gush.",
  path: "/rankings",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const payload = await loadSeriesCatalogSeoPayload();

  return (
    <RankingsPage
      initialSearchParams={initialSearchParams}
      initialSeries={payload?.series || []}
      hasInitialSeries={payload?.ready === true}
    />
  );
}
