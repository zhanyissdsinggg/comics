import { createHash } from "crypto";
import { CreditRole, CreatorType, PrismaClient } from "@prisma/client";
import { resolve } from "path";

const envLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

// Best-effort local env support. Railway/CI should inject env vars.
if (typeof envLoader.loadEnvFile === "function") {
  try {
    envLoader.loadEnvFile(resolve(__dirname, "../.env"));
  } catch {
    // Ignore missing local env files.
  }
}

const prisma = new PrismaClient();

const DEMO_SERIES_ID = "demo-series";
const DEMO_EPISODE_ID = "demo-episode";

function normalizeCreatorName(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function createStableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function createStableSuffix(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 6);
}

function slugifyCreatorName(value: string) {
  return normalizeCreatorName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildReaderPageDataUrl(options: {
  title: string;
  episodeLabel: string;
  pageLabel: string;
  tone: string;
}) {
  const { title, episodeLabel, pageLabel, tone } = options;
  const safeTitle = escapeXml(title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" fill="none">
      <rect width="800" height="1200" fill="#070b14" />
      <rect width="800" height="1200" fill="url(#bg)" />
      <circle cx="640" cy="200" r="220" fill="${tone}" opacity="0.18" />
      <circle cx="170" cy="1040" r="280" fill="${tone}" opacity="0.12" />
      <rect x="48" y="48" width="704" height="1104" rx="40" fill="#0b1020" fill-opacity="0.86" stroke="${tone}" stroke-opacity="0.45" />
      <rect x="80" y="88" width="186" height="34" rx="17" fill="${tone}" fill-opacity="0.22" />
      <text x="102" y="111" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1.8">DEMO</text>
      <text x="80" y="182" fill="#E5E7EB" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">${safeTitle}</text>
      <text x="80" y="226" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="24">${escapeXml(episodeLabel)} | ${escapeXml(pageLabel)}</text>
      <rect x="80" y="286" width="640" height="766" rx="28" fill="#101a31" stroke="${tone}" stroke-opacity="0.26" />
      <text x="112" y="352" fill="#E2E8F0" font-family="Arial, Helvetica, sans-serif" font-size="22">This demo chapter exists for production smoke checks.</text>
      <text x="112" y="392" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="18">It should load fast, open the drawer, and never 404.</text>
      <defs>
        <linearGradient id="bg" x1="96" y1="72" x2="704" y2="1128" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0F172A" />
          <stop offset="1" stop-color="#020617" />
        </linearGradient>
      </defs>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildDemoPages(seriesTitle: string, tone: string) {
  return [1, 2, 3].map((pageNumber) => ({
    url: buildReaderPageDataUrl({
      title: seriesTitle,
      episodeLabel: "Demo Episode",
      pageLabel: `Page ${pageNumber}`,
      tone,
    }),
    w: 800,
    h: 1200,
  }));
}

async function seedDemo() {
  const creatorName = "Gush Demo Studio";
  const normalizedName = normalizeCreatorName(creatorName).toLowerCase();
  const creatorSlugBase = slugifyCreatorName(creatorName);
  const creatorSlug = `${creatorSlugBase}-${createStableSuffix(normalizedName)}`;
  const creatorId = createStableId("creator", normalizedName);
  const coverTone = "#0ea5e9";

  await prisma.creator.upsert({
    where: { normalizedName },
    update: {
      id: creatorId,
      slug: creatorSlug,
      name: creatorName,
      type: CreatorType.STUDIO,
      bio: "Demo creator used for smoke checks.",
      isPublic: true,
    },
    create: {
      id: creatorId,
      slug: creatorSlug,
      name: creatorName,
      normalizedName,
      type: CreatorType.STUDIO,
      bio: "Demo creator used for smoke checks.",
      isPublic: true,
    },
  });

  await prisma.series.upsert({
    where: { id: DEMO_SERIES_ID },
    update: {
      title: "Demo Series",
      author: creatorName,
      type: "comic",
      adult: false,
      isPublished: true,
      genres: ["Demo", "Action"],
      coverTone,
      coverUrl: "/mock-covers/series-001.jpg",
      status: "Ongoing",
      description: "A lightweight demo series used for platform smoke tests and reader QA.",
      episodePrice: 0,
      ttfEnabled: false,
      ttfIntervalHours: 24,
      latestEpisodeId: DEMO_EPISODE_ID,
    },
    create: {
      id: DEMO_SERIES_ID,
      title: "Demo Series",
      author: creatorName,
      type: "comic",
      adult: false,
      isPublished: true,
      genres: ["Demo", "Action"],
      coverTone,
      coverUrl: "/mock-covers/series-001.jpg",
      status: "Ongoing",
      description: "A lightweight demo series used for platform smoke tests and reader QA.",
      episodePrice: 0,
      ttfEnabled: false,
      ttfIntervalHours: 24,
      latestEpisodeId: DEMO_EPISODE_ID,
    },
  });

  await prisma.seriesCredit.upsert({
    where: {
      seriesId_creatorId_role: {
        seriesId: DEMO_SERIES_ID,
        creatorId,
        role: CreditRole.STUDIO,
      },
    },
    update: {
      source: "seed-demo",
      sortOrder: 0,
      isPrimary: true,
      isPublic: true,
    },
    create: {
      id: createStableId("credit", `${DEMO_SERIES_ID}:${creatorId}:studio`),
      seriesId: DEMO_SERIES_ID,
      creatorId,
      role: CreditRole.STUDIO,
      source: "seed-demo",
      sortOrder: 0,
      isPrimary: true,
      isPublic: true,
    },
  });

  const releasedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await prisma.episode.upsert({
    where: { id: DEMO_EPISODE_ID },
    update: {
      seriesId: DEMO_SERIES_ID,
      number: 1,
      title: "Demo Episode",
      releasedAt,
      pricePts: 0,
      ttfEligible: false,
      ttfReadyAt: null,
      previewFreePages: 3,
      pages: buildDemoPages("Demo Series", coverTone),
      paragraphs: [],
      text: null,
      isDeleted: false,
    },
    create: {
      id: DEMO_EPISODE_ID,
      seriesId: DEMO_SERIES_ID,
      number: 1,
      title: "Demo Episode",
      releasedAt,
      pricePts: 0,
      ttfEligible: false,
      ttfReadyAt: null,
      previewFreePages: 3,
      pages: buildDemoPages("Demo Series", coverTone),
      paragraphs: [],
      text: null,
      isDeleted: false,
    },
  });

  await prisma.series.update({
    where: { id: DEMO_SERIES_ID },
    data: { latestEpisodeId: DEMO_EPISODE_ID },
  });

  // eslint-disable-next-line no-console
  console.log(`seed-demo complete: ${DEMO_SERIES_ID} / ${DEMO_EPISODE_ID}`);
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("seeding demo fixtures only...");
  await seedDemo();
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("seed-demo failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

