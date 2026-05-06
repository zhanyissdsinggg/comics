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
import {
  formatInstallmentCount,
  formatInstallmentLabel,
  getEntryLabelPlural,
  getLatestEntryLabel,
  getStartReadingLabel,
} from "../../../lib/seriesFormatLabels";
import { buildSeriesStructuredData } from "../../../lib/structuredData";
import {
  isBlockedPublicSeriesIdentifier,
  isBlockedPublicSeriesRecord,
  shouldBlockDemoContentInProduction,
} from "../../../lib/publicCatalogVisibility";
import { buildPublicSeriesStaticParams } from "../../../lib/publicSeriesCatalog";
import {
  logSeriesInvariant,
  shouldForceNotFoundForSeries,
} from "../../../lib/publicSeriesRouteValidation";
import { loadSeriesRoutePayload, loadSeriesSeoPayload } from "../../../lib/storefrontSeo";

export const revalidate = 300;
export const dynamic = "force-dynamic";
export async function generateStaticParams() {
  return buildPublicSeriesStaticParams();
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

function buildFallbackSeriesSummary(payload) {
  const series = payload?.series || null;
  const episodes = Array.isArray(payload?.episodes) ? payload.episodes : [];
  if (!series?.id || !series?.title) {
    return null;
  }

  const sortedEpisodes = [...episodes].sort(
    (left, right) => Number(left?.number || 0) - Number(right?.number || 0),
  );
  const firstEpisode = sortedEpisodes[0] || null;
  const latestEpisode = sortedEpisodes[sortedEpisodes.length - 1] || null;
  const creatorName = resolveSeriesCreatorName(series);
  const formatLabel =
    String(series?.type || "").trim().toLowerCase() === "novel"
      ? "Novel"
      : "Comic";
  const statusLabel =
    String(series?.status || "").trim() ||
    (sortedEpisodes.length > 0 ? "Ongoing" : "Coming soon");
  const genres = Array.isArray(series?.genres) ? series.genres.filter(Boolean) : [];
  const latestLabel = latestEpisode
    ? getLatestEntryLabel(series, latestEpisode.number)
    : "Coming soon";

  return {
    series,
    sortedEpisodes,
    firstEpisode,
    creatorName,
    formatLabel,
    statusLabel,
    genres,
    latestLabel,
  };
}

function SeriesRouteFallback({ payload = null }) {
  const summary = buildFallbackSeriesSummary(payload);

  if (!summary) {
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

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="rounded-[30px] border-2 border-[#FFE500] bg-black/90 p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
            <div className="aspect-[3/4] rounded-[28px] border-2 border-white/20 bg-[#111111]" />
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {summary.formatLabel}
                </span>
                <span className="rounded-full border-2 border-white/20 bg-black px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {summary.statusLabel}
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="text-[2rem] font-black uppercase leading-[0.94] tracking-[-0.05em] text-white sm:text-[3.4rem]">
                  {summary.series.title}
                </h1>
                {summary.creatorName ? (
                  <p className="text-sm font-black uppercase tracking-[0.06em] text-white/80">
                    {summary.creatorName}
                  </p>
                ) : null}
                {summary.series.description ? (
                  <p className="max-w-3xl text-sm font-semibold leading-7 text-white/78">
                    {summary.series.description}
                  </p>
                ) : null}
              </div>

              {summary.genres.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {summary.genres.slice(0, 4).map((genre) => (
                    <span
                      key={`${summary.series.id}-fallback-genre-${genre}`}
                      className="rounded-full border-2 border-black bg-[#00E5FF] px-3 py-1 text-xs font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}

              {summary.firstEpisode ? (
                <a
                  href={`/read/${summary.series.id}/${summary.firstEpisode.id}`}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-black bg-[#00E5FF] px-5 py-3 text-sm font-black uppercase tracking-[0.02em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  {getStartReadingLabel(summary.series, summary.firstEpisode.number)}
                </a>
              ) : null}

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[22px] border-2 border-white/20 bg-black px-4 py-3 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
                    Format
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.04em]">
                    {summary.formatLabel}
                  </p>
                </div>
                <div className="rounded-[22px] border-2 border-white/20 bg-black px-4 py-3 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.04em]">
                    {summary.statusLabel}
                  </p>
                </div>
                <div className="rounded-[22px] border-2 border-white/20 bg-black px-4 py-3 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
                    {getEntryLabelPlural(summary.series)}
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.04em]">
                    {formatInstallmentCount(summary.series, summary.sortedEpisodes.length)}
                  </p>
                </div>
                <div className="rounded-[22px] border-2 border-black bg-[#FFE500] px-4 py-3 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/65">
                    Latest
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.04em]">
                    {summary.latestLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border-2 border-white/20 bg-black/80 p-5 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b-2 border-white/15 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-[1.55rem] font-black uppercase tracking-[-0.04em] text-white">
                {getEntryLabelPlural(summary.series)}
              </h2>
              <span className="rounded-full border-2 border-black bg-[#FFE500] px-2.5 py-1 text-[10px] font-black tracking-[0.2em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                {summary.sortedEpisodes.length}
              </span>
            </div>
          </div>

          <ul className="space-y-3">
            {summary.sortedEpisodes.map((episode) => (
              <li
                key={episode.id}
                id={`episode-${episode.id}`}
                className="rounded-[24px] border-2 border-white/15 bg-[#0a0a0a] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-black uppercase tracking-[0.02em] text-white">
                      {formatInstallmentLabel(summary.series, episode.number)}
                    </p>
                  </div>
                  <a
                    href={`/read/${summary.series.id}/${episode.id}`}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-full border-2 border-black bg-[#00E5FF] px-5 py-2.5 text-sm font-black uppercase tracking-[0.02em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {episode.number === 1 ? getStartReadingLabel(summary.series, 1) : "Continue"}
                  </a>
                </div>
              </li>
            ))}
          </ul>
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

export default async function SeriesRoutePage({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = (await Promise.resolve(searchParams)) || {};
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
  const routePayload = await loadSeriesRoutePayload(seriesId);
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
  const structuredData = buildSafeSeriesStructuredData(routePayload?.payload);

  return (
    <>
      <StructuredDataScript id={`series-jsonld-${seriesId}`} data={structuredData} />
      <WalletProvider>
        <RewardsProvider>
          <EntitlementProvider>
            <CouponProvider>
              <Suspense fallback={<SeriesRouteFallback payload={routePayload?.payload || null} />}>
                <SeriesPage
                  seriesId={seriesId}
                  initialSeriesPayload={routePayload?.payload || null}
                  initialSeriesState={routePayload?.state || "unavailable"}
                  initialGateStatus={routePayload?.gateReason || "OK"}
                  initialSearchParams={resolvedSearchParams}
                />
              </Suspense>
            </CouponProvider>
          </EntitlementProvider>
        </RewardsProvider>
      </WalletProvider>
    </>
  );
}
