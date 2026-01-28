import { NextResponse } from "next/server";
import { SERIES_CATALOG } from "../../../lib/seriesCatalog";

function parseLatestNumber(value) {
  if (!value) {
    return 0;
  }
  const match = String(value).match(/(\d+)/);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[1], 10) || 0;
}

function buildEpisodes(seriesId, latestNumber, pricePts) {
  const now = Date.now();
  const episodes = Array.from({ length: latestNumber }, (_, index) => {
    const number = index + 1;
    const releasedAt = new Date(
      now - (latestNumber - number) * 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const ttfEligible = number % 4 !== 0;
    const ttfReadyAt = ttfEligible
      ? new Date(now + (number % 3 === 0 ? -1 : 2) * 60 * 60 * 1000).toISOString()
      : null;
    const previewFreePages = number <= 3 ? 3 : 0;

    return {
      id: `${seriesId}e${number}`,
      seriesId,
      number,
      title: `Episode ${number}`,
      releasedAt,
      pricePts,
      ttfEligible,
      ttfReadyAt,
      previewFreePages,
    };
  });
  return episodes.sort((a, b) => a.number - b.number);
}

function buildEntitlement(seriesId, episodes) {
  const unlockedEpisodeIds = episodes
    .slice(0, 1)
    .map((episode) => episode.id);
  return { seriesId, unlockedEpisodeIds };
}

function buildWallet() {
  return {
    paidPts: 1240,
    bonusPts: 180,
    subscription: {
      active: true,
      planId: "premium",
      renewAt: "2026-02-28T00:00:00Z",
      perks: { ttfMultiplier: 0.5, monthlyPts: 1200, dailyBonusPts: 20 },
    },
  };
}

export async function GET(request, { params }) {
  const { id } = params;
  const adult = request.nextUrl.searchParams.get("adult") === "1";
  const seriesItem = SERIES_CATALOG.find((item) => item.id === id);

  if (!seriesItem) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (seriesItem.adult && !adult) {
    return NextResponse.json({ error: "ADULT_GATED" });
  }

  const latestNumber = parseLatestNumber(seriesItem.latest);
  const episodes = buildEpisodes(
    seriesItem.id,
    latestNumber,
    seriesItem.pricing.episodePrice
  );
  const series = {
    id: seriesItem.id,
    title: seriesItem.title,
    type: seriesItem.type,
    adult: seriesItem.adult,
    genres: seriesItem.genres,
    status: seriesItem.status,
    rating: seriesItem.rating,
    description: seriesItem.description,
    badges: seriesItem.badge ? [seriesItem.badge] : [],
    coverTone: seriesItem.coverTone,
    pricing: seriesItem.pricing,
    ttf: seriesItem.ttf,
    latestEpisodeId: `${seriesItem.id}e${latestNumber}`,
  };
  const entitlement = buildEntitlement(id, episodes);
  const wallet = buildWallet();

  return NextResponse.json({ series, episodes, entitlement, wallet });
}
