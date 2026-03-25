import RankingsPage from "../../components/rankings/RankingsPage";
import { createPageMetadata } from "../../lib/seo";
import { loadRankingsSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Top Series",
  description: "Top Series, fresh releases, completed reads, and free starts on Gush.",
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
      hasInitialRankings={payload?.ready === true}
    />
  );
}
