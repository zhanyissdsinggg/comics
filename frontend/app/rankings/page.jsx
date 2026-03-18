import RankingsPage from "../../components/rankings/RankingsPage";
import { createPageMetadata } from "../../lib/seo";
import { loadRankingsSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Top Series",
  description: "Browse Top Series, new releases, completed picks, and free-start favorites across comics and novels on Gush.",
  path: "/rankings",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const type = initialSearchParams?.type || "popular";
  const window = initialSearchParams?.window || "all";
  const payload = await loadRankingsSeoPayload(type, window);

  return (
    <RankingsPage
      initialSearchParams={initialSearchParams}
      initialRankings={payload?.rankings || []}
      hasInitialRankings={Boolean(payload)}
    />
  );
}
