import NovelsPage from "../../components/novels/NovelsPage";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { createPageMetadata } from "../../lib/seo";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Novels",
  description: "Novels on Gush.",
  path: "/novels",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const payload = await loadSeriesCatalogSeoPayload();
  const initialSeries = (payload?.series || []).filter((item) => item?.type === "novel");

  return (
    <ErrorBoundary
      title="Failed to load novels page"
      message="We couldn't load the novels page."
    >
      <NovelsPage
        initialSearchParams={initialSearchParams}
        initialSeries={initialSeries}
        hasInitialSeries={payload?.ready === true}
      />
    </ErrorBoundary>
  );
}
