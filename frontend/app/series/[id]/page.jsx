import StructuredDataScript from "../../../components/common/StructuredDataScript";
import FigmaSeriesDetailPage from "../../../components/figma/FigmaSeriesDetailPage";
import { CouponProvider } from "../../../store/useCouponStore";
import { EntitlementProvider } from "../../../store/useEntitlementStore";
import { RewardsProvider } from "../../../store/useRewardsStore";
import { WalletProvider } from "../../../store/useWalletStore";
import { notFound } from "next/navigation";
import { buildNoIndexRobots, createPageMetadata } from "../../../lib/seo";
import { resolveSeriesCreatorName } from "../../../lib/creatorIdentity";
import { siteConfig } from "../../../lib/siteConfig";
import {
  formatInstallmentCount,
} from "../../../lib/seriesFormatLabels";
import { buildSeriesStructuredData } from "../../../lib/structuredData";
import {
  isBlockedPublicSeriesIdentifier,
  isBlockedPublicSeriesRecord,
  shouldBlockDemoContentInProduction,
} from "../../../lib/publicCatalogVisibility";
import { isAdultContent } from "../../../lib/contentFilters";
import { buildPublicSeriesStaticParams } from "../../../lib/publicSeriesCatalog";
import {
  logSeriesInvariant,
  shouldForceNotFoundForSeries,
} from "../../../lib/publicSeriesRouteValidation";
import { isServerAdultModeEnabled } from "../../../lib/serverAdultGate";
import { loadSeriesRoutePayload } from "../../../lib/storefrontSeo";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return buildPublicSeriesStaticParams();
}

function buildSafeSeriesStructuredData(payload) {
  if (!payload?.series || isAdultContent(payload.series)) {
    return [];
  }

  try {
    return buildSeriesStructuredData(payload);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const seriesId = resolvedParams?.id;
  if (
    shouldBlockDemoContentInProduction() &&
    isBlockedPublicSeriesIdentifier(seriesId)
  ) {
    notFound();
  }
  const includeAdult = await isServerAdultModeEnabled();
  const routePayload = await loadSeriesRoutePayload(seriesId, { includeAdult });
  if (routePayload?.state && routePayload.state !== "ready") {
    return createPageMetadata({
      title: routePayload?.state === "adult-gated" ? "Mature title" : "Story",
      description:
        routePayload?.state === "adult-gated"
          ? `Sign in and confirm mature access to continue on ${siteConfig.siteName}.`
          : `Browse chapters, creators, and updates on ${siteConfig.siteName}.`,
      path: `/series/${seriesId || ""}`,
      robots: buildNoIndexRobots({ follow: false }),
    });
  }

  const payload = routePayload?.payload || null;
  const series = payload?.series || null;

  if (!series) {
    return createPageMetadata({
      title: "Story",
      description: `Browse chapters, creators, and updates on ${siteConfig.siteName}.`,
      path: `/series/${seriesId || ""}`,
    });
  }

  const statusLabel = String(series.status || "").trim() || "Ongoing";
  const authorLabel = resolveSeriesCreatorName(series);
  const genreLabel = Array.isArray(series.genres) && series.genres.length > 0 ? series.genres.slice(0, 2).join(" / ") : "";
  const episodeCount = Number(series.episodeCount || 0);
  const baseDescription = String(series.description || "").trim();
  const generatedDescription = [
    `Read ${series.title} on ${siteConfig.siteName}.`,
    authorLabel ? `By ${authorLabel}.` : "",
    genreLabel ? `${genreLabel}.` : "",
    episodeCount > 0 ? `${formatInstallmentCount(series, episodeCount)} live.` : "",
    `Status: ${statusLabel}.`,
  ]
    .filter(Boolean)
    .join(" ");
  const description = baseDescription || generatedDescription;
  const matureDescription = [
    `18+ mature series on ${siteConfig.siteName}.`,
    authorLabel ? `By ${authorLabel}.` : "",
    genreLabel ? `${genreLabel}.` : "",
    episodeCount > 0 ? `${formatInstallmentCount(series, episodeCount)} live.` : "",
    `Status: ${statusLabel}.`,
  ]
    .filter(Boolean)
    .join(" ");
  const isMatureSeries = isAdultContent(series);

  return createPageMetadata({
    title: series.title,
    description: isMatureSeries ? matureDescription : description,
    path: `/series/${seriesId}`,
    image: series.coverUrl || null,
    openGraphType: String(series.type || "").toLowerCase() === "novel" ? "book" : "website",
    robots: isMatureSeries ? buildNoIndexRobots({ follow: false }) : undefined,
  });
}

export default async function SeriesRoutePage({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const seriesId = String(resolvedParams?.id || "").trim();
  if (
    shouldBlockDemoContentInProduction() &&
    isBlockedPublicSeriesIdentifier(seriesId)
  ) {
    notFound();
  }
  if (isBlockedPublicSeriesRecord({ id: seriesId })) {
    notFound();
  }
  const includeAdult = await isServerAdultModeEnabled();
  const routePayload = await loadSeriesRoutePayload(seriesId, { includeAdult });
  if (routePayload?.state === "not-found") {
    notFound();
  }
  if (shouldForceNotFoundForSeries(seriesId, routePayload?.payload || null)) {
    logSeriesInvariant("Series route payload failed validation", {
      seriesId,
      state: routePayload?.state || "unknown",
      hasSeries: Boolean(routePayload?.payload?.series),
      episodeCount: Array.isArray(routePayload?.payload?.episodes)
        ? routePayload.payload.episodes.length
        : -1,
    });
    notFound();
  }
  if (!routePayload?.payload?.series && routePayload?.state === "ready") {
    logSeriesInvariant("Series route resolved ready without series payload", {
      seriesId,
    });
    notFound();
  }
  const structuredData = buildSafeSeriesStructuredData(routePayload?.payload);

  return (
    <>
      <StructuredDataScript id={`series-jsonld-${seriesId}`} data={structuredData} />
      <WalletProvider>
        <RewardsProvider>
          <EntitlementProvider>
            <CouponProvider>
              <FigmaSeriesDetailPage
                seriesId={seriesId}
                series={routePayload?.payload?.series || null}
                episodes={routePayload?.payload?.episodes || []}
                initialState={routePayload?.state || "unavailable"}
              />
            </CouponProvider>
          </EntitlementProvider>
        </RewardsProvider>
      </WalletProvider>
    </>
  );
}
