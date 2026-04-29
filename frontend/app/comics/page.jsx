import ComicsPage from "../../components/comics/ComicsPage";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { createPageMetadata } from "../../lib/seo";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Comics",
  description: "Trending comics, new updates, and finished reads on Gush.",
  path: "/comics",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const payload = await loadSeriesCatalogSeoPayload();
  const initialSeries = (payload?.series || []).filter((item) => item?.type === "comic");

  return (
    <ErrorBoundary
      title="Failed to load comics page"
      message="Couldn't load comics."
    >
      <ComicsPage
        initialSearchParams={initialSearchParams}
        initialSeries={initialSeries}
        hasInitialSeries={payload?.ready === true}
      />
    </ErrorBoundary>
  );
}
