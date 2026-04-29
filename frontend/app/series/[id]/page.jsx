import SeriesPage from "../../../components/series/SeriesPage";
import StructuredDataScript from "../../../components/common/StructuredDataScript";
import { CouponProvider } from "../../../store/useCouponStore";
import { EntitlementProvider } from "../../../store/useEntitlementStore";
import { RewardsProvider } from "../../../store/useRewardsStore";
import { WalletProvider } from "../../../store/useWalletStore";
import { notFound } from "next/navigation";
import { createPageMetadata } from "../../../lib/seo";
import { resolveSeriesCreatorName } from "../../../lib/creatorIdentity";
import { siteConfig } from "../../../lib/siteConfig";
import { buildSeriesStructuredData } from "../../../lib/structuredData";
import { loadSeriesRoutePayload, loadSeriesSeoPayload } from "../../../lib/storefrontSeo";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const seriesId = resolvedParams?.id;
  const payload = await loadSeriesSeoPayload(seriesId);
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
    episodeCount > 0 ? `${episodeCount} chapter${episodeCount === 1 ? "" : "s"} live.` : "",
    `Status: ${statusLabel}.`,
  ]
    .filter(Boolean)
    .join(" ");
  const description = baseDescription || generatedDescription;

  return createPageMetadata({
    title: series.title,
    description,
    path: `/series/${seriesId}`,
    image: series.coverUrl || null,
    openGraphType: String(series.type || "").toLowerCase() === "novel" ? "book" : "website",
  });
}

export default async function SeriesRoutePage({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const routePayload = await loadSeriesRoutePayload(resolvedParams.id);
  if (routePayload?.state === "not-found") {
    notFound();
  }
  const structuredData = routePayload?.payload ? buildSeriesStructuredData(routePayload.payload) : [];

  return (
    <>
      <StructuredDataScript id={`series-jsonld-${resolvedParams.id}`} data={structuredData} />
      <WalletProvider>
        <RewardsProvider>
          <EntitlementProvider>
            <CouponProvider>
              <SeriesPage
                seriesId={resolvedParams.id}
                initialSeriesPayload={routePayload?.payload || null}
                initialSeriesState={routePayload?.state || "unavailable"}
                initialGateStatus={routePayload?.gateReason || "OK"}
              />
            </CouponProvider>
          </EntitlementProvider>
        </RewardsProvider>
      </WalletProvider>
    </>
  );
}
