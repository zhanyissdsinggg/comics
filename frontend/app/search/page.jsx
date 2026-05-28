import { redirect } from "next/navigation";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";
import DiscoverySearchPage from "../../components/storefront/DiscoverySearchPage";
import {
  loadSearchSeoPayload,
  loadSeriesCatalogSeoPayload,
} from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Search Comics & Novels",
  description: "Find a story by mood, genre, format, and whatever you want to read tonight on Gush.",
  path: "/search",
  robots: buildNoIndexRobots({ follow: true }),
});

function isInteractiveSearchRoute(searchParams = {}) {
  const type = String(searchParams?.type || "")
    .trim()
    .toLowerCase();
  const format = String(searchParams?.format || "")
    .trim()
    .toLowerCase();

  return type === "interactive" || format === "interactive";
}

export default async function Page({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const initialQuery = String(
    resolvedSearchParams.q || resolvedSearchParams.query || "",
  ).trim();
  const initialType = String(resolvedSearchParams.type || "").trim().toLowerCase();
  const initialFormat = String(
    resolvedSearchParams.format || resolvedSearchParams.type || "",
  )
    .trim()
    .toLowerCase();
  const seoType =
    initialType ||
    (initialFormat === "comic" || initialFormat === "novel"
      ? initialFormat
      : "");

  if (isInteractiveSearchRoute(resolvedSearchParams)) {
    const redirectParams = new URLSearchParams();
    if (initialQuery) {
      redirectParams.set("q", initialQuery);
    }
    if (String(resolvedSearchParams.mode || "").trim()) {
      redirectParams.set("mode", String(resolvedSearchParams.mode).trim());
    }
    const redirectSuffix = redirectParams.toString();
    redirect(redirectSuffix ? `/interactive?${redirectSuffix}` : "/interactive");
  }

  const includeAdult = await isServerAdultModeEnabled();
  const [searchPayload, catalogPayload] = await Promise.all([
    loadSearchSeoPayload(initialQuery, {
      includeAdult,
      type: seoType,
      status: String(resolvedSearchParams.status || "").trim(),
      genre: String(resolvedSearchParams.genre || "").trim(),
      sort: String(resolvedSearchParams.sort || "").trim(),
      page: String(resolvedSearchParams.page || "").trim(),
    }),
    loadSeriesCatalogSeoPayload({ includeAdult }),
  ]);

  return (
    <DiscoverySearchPage
      initialQuery={initialQuery}
      initialType={initialType}
      initialFormat={initialFormat}
      initialStatus={String(resolvedSearchParams.status || "").trim()}
      initialGenre={String(resolvedSearchParams.genre || "").trim()}
      initialSort={String(resolvedSearchParams.sort || "").trim()}
      initialPage={String(resolvedSearchParams.page || "").trim()}
      initialIncludeAdult={includeAdult}
      initialResults={searchPayload.results || []}
      initialTotal={Number(searchPayload.total || 0)}
      initialHotKeywords={searchPayload.hotKeywords || []}
      initialCatalog={catalogPayload.series || []}
      initialReady={searchPayload.ready === true}
    />
  );
}
