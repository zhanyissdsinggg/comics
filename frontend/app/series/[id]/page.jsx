import SeriesPage from "../../../components/series/SeriesPage";
import StructuredDataScript from "../../../components/common/StructuredDataScript";
import { CouponProvider } from "../../../store/useCouponStore";
import { EntitlementProvider } from "../../../store/useEntitlementStore";
import { RewardsProvider } from "../../../store/useRewardsStore";
import { createPageMetadata } from "../../../lib/seo";
import { siteConfig } from "../../../lib/siteConfig";
import { buildSeriesStructuredData } from "../../../lib/structuredData";
import { loadSeriesSeoPayload } from "../../../lib/storefrontSeo";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const seriesId = resolvedParams?.id;
  const payload = await loadSeriesSeoPayload(seriesId);
  const series = payload?.series || null;

  if (!series) {
    return createPageMetadata({
      title: "Series",
      description: `Read full series details, episode lists, and release info on ${siteConfig.siteName}.`,
      path: `/series/${seriesId || ""}`,
    });
  }

  const freeEpisodeCount = Number(series.freeEpisodeCount || 0);
  const statusLabel = String(series.status || "").trim() || "Ongoing";
  const authorLabel = String(series.author || "").trim();
  const genreLabel = Array.isArray(series.genres) && series.genres.length > 0 ? series.genres.slice(0, 2).join(" / ") : "";
  const baseDescription = String(series.description || "").trim();
  const generatedDescription = [
    `Read ${series.title} on ${siteConfig.siteName}.`,
    authorLabel ? `By ${authorLabel}.` : "",
    genreLabel ? `${genreLabel}.` : "",
    freeEpisodeCount > 0 ? `${freeEpisodeCount} free episode${freeEpisodeCount === 1 ? "" : "s"} available.` : "",
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
  const payload = await loadSeriesSeoPayload(resolvedParams.id);
  const structuredData = payload ? buildSeriesStructuredData(payload) : [];

  return (
    <>
      <StructuredDataScript id={`series-jsonld-${resolvedParams.id}`} data={structuredData} />
      <RewardsProvider>
        <EntitlementProvider>
          <CouponProvider>
            <SeriesPage seriesId={resolvedParams.id} />
          </CouponProvider>
        </EntitlementProvider>
      </RewardsProvider>
    </>
  );
}
