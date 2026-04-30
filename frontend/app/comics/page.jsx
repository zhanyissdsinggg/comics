import ComicsPage from "../../components/comics/ComicsPage";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { cookies } from "next/headers";
import { canReadMatureFromCookieStore } from "../../lib/matureContent";
import { createPageMetadata } from "../../lib/seo";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Comics",
  description: "Trending comics, new updates, and finished reads on Gush.",
  path: "/comics",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const cookieStore = await cookies();
  const includeAdult = canReadMatureFromCookieStore(cookieStore);
  const [payload, maturePayload] = await Promise.all([
    loadSeriesCatalogSeoPayload({
      includeAdult,
    }),
    includeAdult
      ? Promise.resolve(null)
      : loadSeriesCatalogSeoPayload({ includeAdult: true }),
  ]);
  const initialSeries = (payload?.series || []).filter((item) => item?.type === "comic");
  const matureCatalogAvailable = (includeAdult
    ? payload?.series || []
    : maturePayload?.series || []
  ).some((item) => item?.type === "comic" && item?.adult);

  return (
    <ErrorBoundary
      title="Failed to load comics page"
      message="Couldn't load comics."
    >
      <ComicsPage
        initialSearchParams={initialSearchParams}
        initialSeries={initialSeries}
        hasInitialSeries={payload?.ready === true}
        matureCatalogAvailable={matureCatalogAvailable}
      />
    </ErrorBoundary>
  );
}
