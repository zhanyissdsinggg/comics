import SeriesPage from "../../../components/series/SeriesPage";
import { CouponProvider } from "../../../store/useCouponStore";
import { EntitlementProvider } from "../../../store/useEntitlementStore";
import { RewardsProvider } from "../../../store/useRewardsStore";
import { createPageMetadata } from "../../../lib/seo";
import { siteConfig } from "../../../lib/siteConfig";

export const revalidate = 300;

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

async function loadSeriesForMetadata(seriesId) {
  if (!seriesId) {
    return null;
  }

  const apiBaseUrl = normalizeBaseUrl(
    process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:4000"
  );

  try {
    const response = await fetch(`${apiBaseUrl}/api/series/${encodeURIComponent(seriesId)}`, {
      next: { revalidate },
      headers: {
        "x-gush-seo": "series-metadata",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.series || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const seriesId = resolvedParams?.id;
  const series = await loadSeriesForMetadata(seriesId);

  if (!series) {
    return createPageMetadata({
      title: "Series",
      description: `Read full series details, episode lists, and release info on ${siteConfig.siteName}.`,
      path: `/series/${seriesId || ""}`,
    });
  }

  const description =
    String(series.description || "").trim() ||
    `Read ${series.title} on ${siteConfig.siteName}. Explore episodes, pricing, and release details.`;

  return createPageMetadata({
    title: series.title,
    description,
    path: `/series/${seriesId}`,
  });
}

export default async function SeriesRoutePage({ params }) {
  const resolvedParams = await Promise.resolve(params);

  return (
    <RewardsProvider>
      <EntitlementProvider>
        <CouponProvider>
          <SeriesPage seriesId={resolvedParams.id} />
        </CouponProvider>
      </EntitlementProvider>
    </RewardsProvider>
  );
}
