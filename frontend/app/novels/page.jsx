import NovelsPage from "../../components/novels/NovelsPage";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { createPageMetadata } from "../../lib/seo";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Novels",
  description: "Trending novels, fresh updates, and finished reads on Gush.",
  path: "/novels",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const payload = await loadSeriesCatalogSeoPayload({ includeAdult: false });
  const initialSeries = (payload?.series || []).filter((item) => item?.type === "novel");

  return (
    <ErrorBoundary
      title="Failed to load novels page"
      message="Couldn't load novels."
    >
      <NovelsPage
        initialSearchParams={initialSearchParams}
        initialSeries={initialSeries}
        hasInitialSeries={payload?.ready === true}
        matureCatalogAvailable={false}
      />
    </ErrorBoundary>
  );
}
