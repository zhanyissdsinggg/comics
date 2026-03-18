import ComicsPage from "../../components/comics/ComicsPage";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { createPageMetadata } from "../../lib/seo";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Comics",
  description:
    "Browse trending comics, free starts, fresh updates, and completed picks across the Gush catalog.",
  path: "/comics",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const payload = await loadSeriesCatalogSeoPayload();
  const initialSeries = (payload?.series || []).filter((item) => item?.type === "comic");

  return (
    <ErrorBoundary
      title="Failed to load comics page"
      message="We couldn't load the comics page. Please try again."
    >
      <ComicsPage
        initialSearchParams={initialSearchParams}
        initialSeries={initialSeries}
        hasInitialSeries={Boolean(payload)}
      />
    </ErrorBoundary>
  );
}
