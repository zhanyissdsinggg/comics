import { PrismaClient } from "@prisma/client";
import { resolve } from "path";

const envLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

if (typeof envLoader.loadEnvFile === "function") {
  try {
    envLoader.loadEnvFile(resolve(__dirname, "../.env"));
  } catch {
    // Ignore missing local env files. CI and production should inject env vars directly.
  }
}

const prisma = new PrismaClient();

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
  episodeNumber: number;
  pageNumber: number;
  tone: string;
}) {
  const { title, episodeNumber, pageNumber, tone } = options;
  const safeTitle = escapeXml(title);
  const episodeLabel = `Episode ${episodeNumber}`;
  const pageLabel = `Page ${pageNumber}`;
  const layoutLabel =
    pageNumber === 1
      ? "Page preview"
      : pageNumber === 2
        ? "Reader fallback"
        : "Page unavailable";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" fill="none">
      <rect width="800" height="1200" fill="#070b14" />
      <rect width="800" height="1200" fill="url(#bg)" />
      <circle cx="640" cy="200" r="220" fill="${tone}" opacity="0.18" />
      <circle cx="170" cy="1040" r="280" fill="${tone}" opacity="0.12" />
      <rect x="48" y="48" width="704" height="1104" rx="40" fill="#0b1020" fill-opacity="0.84" stroke="${tone}" stroke-opacity="0.45" />
      <rect x="80" y="88" width="186" height="34" rx="17" fill="${tone}" fill-opacity="0.22" />
      <text x="102" y="111" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1.8">CHAPTER</text>
      <text x="80" y="182" fill="#E5E7EB" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">${safeTitle}</text>
      <text x="80" y="226" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="24">${escapeXml(episodeLabel)} | ${escapeXml(pageLabel)}</text>

      <rect x="80" y="286" width="640" height="246" rx="28" fill="#101a31" stroke="${tone}" stroke-opacity="0.36" />
      <rect x="104" y="310" width="180" height="14" rx="7" fill="${tone}" fill-opacity="0.9" />
      <rect x="104" y="346" width="392" height="18" rx="9" fill="#E5E7EB" fill-opacity="0.92" />
      <rect x="104" y="380" width="510" height="14" rx="7" fill="#CBD5E1" fill-opacity="0.45" />
      <rect x="104" y="408" width="474" height="14" rx="7" fill="#CBD5E1" fill-opacity="0.34" />
      <rect x="104" y="452" width="234" height="40" rx="20" fill="#F8FAFC" />
      <text x="140" y="478" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">${escapeXml(layoutLabel)}</text>

      <rect x="80" y="572" width="306" height="256" rx="26" fill="#0f172a" stroke="#1e293b" />
      <rect x="414" y="572" width="306" height="256" rx="26" fill="#0f172a" stroke="#1e293b" />
      <rect x="80" y="856" width="640" height="196" rx="26" fill="#0f172a" stroke="#1e293b" />

      <rect x="108" y="602" width="250" height="94" rx="20" fill="${tone}" fill-opacity="0.12" />
      <rect x="130" y="626" width="138" height="12" rx="6" fill="${tone}" />
      <rect x="130" y="656" width="174" height="14" rx="7" fill="#E2E8F0" fill-opacity="0.72" />
      <rect x="130" y="684" width="142" height="12" rx="6" fill="#94A3B8" fill-opacity="0.56" />

      <rect x="442" y="602" width="250" height="156" rx="20" fill="#111827" />
      <path d="M470 720 C510 626 596 618 650 684" stroke="${tone}" stroke-width="14" stroke-linecap="round" opacity="0.9" />
      <circle cx="564" cy="660" r="38" fill="${tone}" fill-opacity="0.26" />
      <circle cx="620" cy="690" r="18" fill="#F8FAFC" fill-opacity="0.22" />

      <rect x="108" y="884" width="584" height="138" rx="22" fill="#111827" />
      <rect x="132" y="914" width="220" height="12" rx="6" fill="${tone}" />
      <rect x="132" y="946" width="466" height="16" rx="8" fill="#E2E8F0" fill-opacity="0.76" />
      <rect x="132" y="978" width="422" height="12" rx="6" fill="#94A3B8" fill-opacity="0.56" />

      <text x="80" y="1112" fill="#64748B" font-family="Arial, Helvetica, sans-serif" font-size="18">Story preview artwork.</text>

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

function buildEpisodePages(
  series: { title: string; coverTone: string | null },
  episodeNumber: number,
) {
  return [1, 2, 3].map((pageNumber) => ({
    url: buildReaderPageDataUrl({
      title: series.title,
      episodeNumber,
      pageNumber,
      tone: series.coverTone || "#22c55e",
    }),
    w: 800,
    h: 1200,
  }));
}

async function refreshReaderMockPages() {
  const targetSeries = await prisma.series.findMany({
    where: {
      type: "comic",
      coverUrl: {
        contains: "/mock-covers/",
      },
    },
    select: {
      id: true,
      title: true,
      coverTone: true,
      episodes: {
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          number: true,
        },
        orderBy: {
          number: "asc",
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  let updatedEpisodes = 0;

  for (const series of targetSeries) {
    for (const episode of series.episodes) {
      await prisma.episode.update({
        where: { id: episode.id },
        data: {
          pages: buildEpisodePages(series, episode.number),
        },
      });
      updatedEpisodes += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `refresh-reader-mock-pages complete: ${targetSeries.length} series, ${updatedEpisodes} episodes updated.`,
  );
}

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_SEED !== "1"
  ) {
    console.error(
      [
        "Refusing to refresh reader mock pages in production without explicit override.",
        "Set ALLOW_PROD_SEED=1 and rerun if you really intend to update production seed content.",
      ].join("\n"),
    );
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log("refreshing seeded comic reader mock pages...");
  await refreshReaderMockPages();
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("refresh reader mock pages failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
