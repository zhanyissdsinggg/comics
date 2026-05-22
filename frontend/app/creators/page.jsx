import CreatorsHubPage from "../../components/creators/CreatorsHubPage";
import StructuredDataScript from "../../components/common/StructuredDataScript";
import { buildCreatorDirectory } from "../../lib/creatorDirectory";
import { headers } from "next/headers";
import { filterBlockedPublicSeries } from "../../lib/publicCatalogVisibility";
import { createPageMetadata } from "../../lib/seo";
import { buildCreatorsDirectoryStructuredData } from "../../lib/structuredData";
import {
  loadCreatorsDirectorySeoPayload,
  loadSeriesCatalogSeoPayload,
} from "../../lib/storefrontSeo";

export const revalidate = 300;
export const dynamic = "force-dynamic";

function resolveRequestOrigin(headerStore) {
  const forwardedHost = String(
    headerStore.get("x-forwarded-host") || headerStore.get("host") || "",
  ).trim();
  if (!forwardedHost) {
    return "";
  }

  const forwardedProto = String(
    headerStore.get("x-forwarded-proto") || "",
  ).trim();
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : /^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/i.test(forwardedHost)
        ? "http"
        : "https";

  return `${protocol}://${forwardedHost}`;
}

async function loadRuntimeCreatorsCatalogFallback() {
  try {
    const headerStore = await headers();
    const requestOrigin = resolveRequestOrigin(headerStore);
    if (!requestOrigin) {
      return [];
    }

    const response = await fetch(`${requestOrigin}/api/series?adult=0&pageSize=100`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
      headers: {
        "x-gush-seo": "creators-runtime-fallback",
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return filterBlockedPublicSeries(
      Array.isArray(payload?.series) ? payload.series : [],
    );
  } catch {
    return [];
  }
}

export async function generateMetadata() {
  const payload = await loadCreatorsDirectorySeoPayload();
  const leadCover = payload?.creators?.[0]?.spotlightSeries?.coverUrl || null;

  return createPageMetadata({
    title: "Creators",
    description: "Writers, artists, and studios behind the stories on Gush.",
    path: "/creators",
    image: leadCover,
  });
}

export default async function CreatorsPageRoute({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const [payload, catalogPayload] = await Promise.all([
    loadCreatorsDirectorySeoPayload(),
    loadSeriesCatalogSeoPayload(),
  ]);

  const seoCreators = Array.isArray(payload?.creators) ? payload.creators : [];
  const creatorCatalog = seoCreators.flatMap((creator) =>
    Array.isArray(creator?.series) ? creator.series : [],
  );
  const seoInitialCatalog =
    creatorCatalog.length > 0 ? creatorCatalog : catalogPayload?.series || [];
  const seoHasInitialCatalog = Boolean(
    (payload?.ready === true && creatorCatalog.length > 0) ||
      (catalogPayload?.ready === true && seoInitialCatalog.length > 0),
  );

  const runtimeCatalog =
    seoHasInitialCatalog && seoInitialCatalog.length > 0
      ? []
      : await loadRuntimeCreatorsCatalogFallback();
  const runtimeCreators =
    runtimeCatalog.length > 0 ? buildCreatorDirectory(runtimeCatalog) : [];

  const effectiveCreators =
    creatorCatalog.length > 0 ? seoCreators : runtimeCreators;
  const effectiveCatalog =
    seoInitialCatalog.length > 0 ? seoInitialCatalog : runtimeCatalog;
  const hasInitialCatalog = seoHasInitialCatalog || effectiveCatalog.length > 0;
  const structuredData = effectiveCreators.length > 0
    ? buildCreatorsDirectoryStructuredData({
        creators: effectiveCreators,
      })
    : [];

  return (
    <>
      <StructuredDataScript
        id="creators-directory-jsonld"
        data={structuredData}
      />
      <CreatorsHubPage
        initialCatalog={effectiveCatalog}
        hasInitialCatalog={hasInitialCatalog}
        initialTypeFilter={resolvedSearchParams.type || ""}
        initialGenreFilter={resolvedSearchParams.genre || ""}
      />
    </>
  );
}
