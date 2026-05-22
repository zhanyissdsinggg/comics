import FigmaHomePage from "../../components/figma/FigmaHomePage";
import { FIGMA_CONTENT_TYPES } from "../../components/figma/figma-utils";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";
import { getHomeEditorialSnapshot } from "../../lib/homeMerchandising";

function buildNovelFallbackCatalog() {
  return [
    {
      id: "series-011",
      title: "Solar Wind",
      type: "novel",
      status: "Ongoing",
      adult: false,
      description: "A courier crew races a solar storm to keep one city online.",
      shortDescription:
        "A courier crew races a solar storm to keep one city online.",
      synopsis: "A courier crew races a solar storm to keep one city online.",
      coverUrl: "/fallback/cover-default.svg",
      bannerUrl: "/fallback/banner-default.svg",
      genres: ["Sci-Fi", "Drama"],
      episodeCount: 3,
      latestEpisodeId: "series-011e3",
      updatedAt: "2026-04-22T12:00:00.000Z",
      creator: {
        label: "Mira Dane",
        type: "person",
      },
      creatorCredits: [
        {
          name: "Mira Dane",
          type: "person",
          role: "writer",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    },
    {
      id: "series-006",
      title: "Neon Nights",
      type: "novel",
      status: "Ongoing",
      adult: false,
      description:
        "A night courier tracks a missing singer through a city full of glitches.",
      shortDescription:
        "A night courier tracks a missing singer through a city full of glitches.",
      synopsis:
        "A night courier tracks a missing singer through a city full of glitches.",
      coverUrl: "/fallback/cover-default.svg",
      bannerUrl: "/fallback/banner-default.svg",
      genres: ["Sci-Fi", "Mystery"],
      episodeCount: 2,
      latestEpisodeId: "series-006e2",
      updatedAt: "2026-04-21T12:00:00.000Z",
      creator: {
        label: "Aster Quinn",
        type: "person",
      },
      creatorCredits: [
        {
          name: "Aster Quinn",
          type: "person",
          role: "writer",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    },
  ];
}

export async function generateMetadata() {
  const includeAdult = await isServerAdultModeEnabled();

  return createPageMetadata({
    title: "Novels",
    description: "Trending novels, fresh updates, and finished reads on Gush.",
    path: "/novels",
    robots: includeAdult ? buildNoIndexRobots({ follow: false }) : undefined,
  });
}

export default async function Page() {
  const includeAdult = await isServerAdultModeEnabled();
  const payload = await loadSeriesCatalogSeoPayload({ includeAdult });
  const serverSeries = Array.isArray(payload?.series) ? payload.series : [];
  const novelSeries = serverSeries.filter(
    (item) => String(item?.type || "").trim().toLowerCase() === "novel",
  );
  const safeSeries =
    novelSeries.length > 0 ? novelSeries : buildNovelFallbackCatalog();
  const snapshot = getHomeEditorialSnapshot(safeSeries);
  const initialReady = Boolean(payload?.ready) || snapshot.safeCatalog.length > 0;

  return (
    <FigmaHomePage
      seriesList={safeSeries}
      initialContentType={FIGMA_CONTENT_TYPES.NOVELS}
      initialReady={initialReady}
    />
  );
}
