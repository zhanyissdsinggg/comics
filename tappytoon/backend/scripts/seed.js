const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SERIES = [
  {
    id: "c1",
    title: "Midnight Contract",
    type: "comic",
    adult: false,
    genres: ["Romance", "Drama"],
    status: "Ongoing",
    rating: 4.8,
    description: "A contract binds two rivals under the midnight moon.",
    coverTone: "warm",
    badge: "Hot",
    badges: ["Hot"],
    episodePrice: 5,
    ttfEnabled: true,
    ttfIntervalHours: 24,
    latestEpisodeId: "",
    latestCount: 38,
  },
  {
    id: "a1",
    title: "After Dark Contract",
    type: "comic",
    adult: true,
    genres: ["Thriller", "Drama"],
    status: "Ongoing",
    rating: 4.6,
    description: "Adult-only midnight thriller.",
    coverTone: "noir",
    badge: "18+",
    badges: ["18+"],
    episodePrice: 6,
    ttfEnabled: true,
    ttfIntervalHours: 24,
    latestEpisodeId: "",
    latestCount: 12,
  },
];

function buildEpisodes(seriesId, latestCount, pricePts, ttfIntervalHours) {
  const now = Date.now();
  return Array.from({ length: latestCount }, (_, index) => {
    const number = index + 1;
    const releasedAt = new Date(now - (latestCount - number) * 7 * 24 * 60 * 60 * 1000);
    const ttfEligible = number % 4 !== 0;
    const ttfReadyAt = ttfEligible
      ? new Date(releasedAt.getTime() + ttfIntervalHours * 60 * 60 * 1000)
      : null;
    return {
      id: `${seriesId}e${number}`,
      seriesId,
      number,
      title: `Episode ${number}`,
      releasedAt,
      pricePts,
      ttfEligible,
      ttfReadyAt,
      previewFreePages: number <= 3 ? 3 : 0,
    };
  });
}

async function run() {
  const count = await prisma.series.count();
  if (count > 0) {
    console.log("[seed] series already present, skip.");
    return;
  }

  for (const entry of SERIES) {
    await prisma.series.create({
      data: {
        id: entry.id,
        title: entry.title,
        type: entry.type,
        adult: entry.adult,
        genres: entry.genres,
        status: entry.status,
        rating: entry.rating,
        description: entry.description,
        coverTone: entry.coverTone,
        badge: entry.badge,
        badges: entry.badges,
        episodePrice: entry.episodePrice,
        ttfEnabled: entry.ttfEnabled,
        ttfIntervalHours: entry.ttfIntervalHours,
        latestEpisodeId: entry.latestEpisodeId,
      },
    });
    const episodes = buildEpisodes(
      entry.id,
      entry.latestCount,
      entry.episodePrice,
      entry.ttfIntervalHours
    );
    await prisma.episode.createMany({ data: episodes });
    const latest = episodes[episodes.length - 1];
    await prisma.series.update({
      where: { id: entry.id },
      data: { latestEpisodeId: latest.id },
    });
  }

  console.log("[seed] done");
}

run()
  .catch((err) => {
    console.error("[seed] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
