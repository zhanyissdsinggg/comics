import SeriesPage from "../../../components/series/SeriesPage";
import StructuredDataScript from "../../../components/common/StructuredDataScript";
import { Suspense } from "react";
import { CouponProvider } from "../../../store/useCouponStore";
import { EntitlementProvider } from "../../../store/useEntitlementStore";
import { RewardsProvider } from "../../../store/useRewardsStore";
import { WalletProvider } from "../../../store/useWalletStore";
import { notFound } from "next/navigation";
import { createPageMetadata } from "../../../lib/seo";
import { resolveSeriesCreatorName } from "../../../lib/creatorIdentity";
import { siteConfig } from "../../../lib/siteConfig";
import { formatInstallmentCount } from "../../../lib/seriesFormatLabels";
import { buildSeriesStructuredData } from "../../../lib/structuredData";
import {
  isBlockedPublicSeriesIdentifier,
  isBlockedPublicSeriesRecord,
  shouldBlockDemoContentInProduction,
} from "../../../lib/publicCatalogVisibility";
import { loadSeriesRoutePayload, loadSeriesSeoPayload } from "../../../lib/storefrontSeo";

export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

function buildSafeSeriesStructuredData(payload) {
  if (!payload) {
    return [];
  }

  try {
    return buildSeriesStructuredData(payload);
  } catch {
    return [];
  }
}

function SeriesRouteFallback() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-10">
        <section className="rounded-[30px] border-2 border-[#FFE500] bg-black/85 p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
            <div className="aspect-[3/4] w-full rounded-[28px] border-2 border-white/20 bg-[#111111]" />
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="h-7 w-24 rounded-full bg-white/20" />
                <div className="h-7 w-24 rounded-full bg-white/20" />
              </div>
              <div className="h-12 w-4/5 rounded-[20px] bg-white/20" />
              <div className="h-5 w-3/5 rounded-full bg-[#111111]" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded-full bg-[#111111]" />
                <div className="h-4 w-[92%] rounded-full bg-[#111111]" />
                <div className="h-4 w-[76%] rounded-full bg-[#111111]" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
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
    episodeCount > 0 ? `${formatInstallmentCount(series, episodeCount)} live.` : "",
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
  if (
    shouldBlockDemoContentInProduction() &&
    isBlockedPublicSeriesIdentifier(resolvedParams.id)
  ) {
    notFound();
  }
  if (isBlockedPublicSeriesRecord({ id: resolvedParams.id })) {
    notFound();
  }
  const routePayload = await loadSeriesRoutePayload(resolvedParams.id);
  if (routePayload?.state === "not-found") {
    notFound();
  }
  const structuredData = buildSafeSeriesStructuredData(routePayload?.payload);

  return (
    <>
      <StructuredDataScript id={`series-jsonld-${resolvedParams.id}`} data={structuredData} />
      <WalletProvider>
        <RewardsProvider>
          <EntitlementProvider>
            <CouponProvider>
              <Suspense fallback={<SeriesRouteFallback />}>
                <SeriesPage
                  seriesId={resolvedParams.id}
                  initialSeriesPayload={routePayload?.payload || null}
                  initialSeriesState={routePayload?.state || "unavailable"}
                  initialGateStatus={routePayload?.gateReason || "OK"}
                />
              </Suspense>
            </CouponProvider>
          </EntitlementProvider>
        </RewardsProvider>
      </WalletProvider>
    </>
  );
}
