import { createHash } from "crypto";
import { CreditRole, CreatorType, PrismaClient } from "@prisma/client";
import { resolve } from "path";
import { CacheService } from "../src/common/cache/cache.service";
import { buildSeriesContentInvalidationPatterns } from "../src/common/cache/content-cache-invalidation.service";
import { disconnectRedisClient } from "../src/common/redis/client";

const envLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

if (typeof envLoader.loadEnvFile === "function") {
  try {
    envLoader.loadEnvFile(resolve(process.cwd(), ".env"));
  } catch {
    // Ignore missing local env files. Production should inject env vars directly.
  }
}

const prisma = new PrismaClient();
const cacheService = new CacheService();

type CreditSeed = {
  name: string;
  role: CreditRole;
  type?: CreatorType;
  isPrimary?: boolean;
  bio?: string;
};

const seriesCreditData: Array<{
  id: string;
  title: string;
  credits: CreditSeed[];
}> = [
  {
    id: "series-001",
    title: "The Last Kingdom",
    credits: [{ name: "Mira Dane", role: CreditRole.AUTHOR, isPrimary: true }],
  },
  {
    id: "series-002",
    title: "Moonlight Sonata",
    credits: [
      { name: "Jae Park", role: CreditRole.WRITER, isPrimary: true },
      { name: "Soo Min", role: CreditRole.ARTIST },
    ],
  },
  {
    id: "series-003",
    title: "Shadow Protocol",
    credits: [{ name: "Nightglass Studio", role: CreditRole.STUDIO, type: CreatorType.STUDIO, isPrimary: true }],
  },
  {
    id: "series-004",
    title: "Cherry Blossom High",
    credits: [{ name: "Hana Seo", role: CreditRole.AUTHOR, isPrimary: true }],
  },
  {
    id: "series-005",
    title: "Dragon's Oath",
    credits: [
      { name: "Elias North", role: CreditRole.WRITER, isPrimary: true },
      { name: "Aria Kim", role: CreditRole.ARTIST },
    ],
  },
  {
    id: "series-006",
    title: "Neon Nights",
    credits: [{ name: "Cole Mercer", role: CreditRole.AUTHOR, isPrimary: true }],
  },
  {
    id: "series-007",
    title: "The Quiet Storm",
    credits: [{ name: "Lena Brooks", role: CreditRole.AUTHOR, isPrimary: true }],
  },
  {
    id: "series-008",
    title: "Apex Predator",
    credits: [{ name: "Hammerline Team", role: CreditRole.TEAM, type: CreatorType.TEAM, isPrimary: true }],
  },
  {
    id: "series-009",
    title: "Starfall Academy",
    credits: [
      { name: "Naomi Vale", role: CreditRole.WRITER, isPrimary: true },
      { name: "Kei Tan", role: CreditRole.ARTIST },
    ],
  },
  {
    id: "series-010",
    title: "Crimson Tide",
    credits: [{ name: "Rook Hollow Studio", role: CreditRole.STUDIO, type: CreatorType.STUDIO, isPrimary: true }],
  },
  {
    id: "series-011",
    title: "Solar Wind",
    credits: [
      { name: "Tess Calder", role: CreditRole.AUTHOR, isPrimary: true },
      { name: "Orbital Forge Team", role: CreditRole.TEAM, type: CreatorType.TEAM },
    ],
  },
  {
    id: "series-012",
    title: "Wild Hearts",
    credits: [
      { name: "June Holloway", role: CreditRole.WRITER, isPrimary: true },
      { name: "Rafael Cruz", role: CreditRole.ARTIST },
    ],
  },
];

function normalizeCreatorName(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugifyCreatorName(value: string) {
  return normalizeCreatorName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function createStableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function createStableSuffix(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 6);
}

function buildSeriesAuthor(credits: CreditSeed[]) {
  return normalizeCreatorName(credits.find((credit) => credit.isPrimary)?.name || credits[0]?.name || "");
}

function inferCreatorType(name: string): CreatorType {
  const normalized = normalizeCreatorName(name).toLowerCase();
  if (normalized.includes("studio")) {
    return CreatorType.STUDIO;
  }
  if (normalized.includes("team")) {
    return CreatorType.TEAM;
  }
  return CreatorType.PERSON;
}

async function importSeriesCredits() {
  const importedSeriesIds: string[] = [];
  const existingSeries = await prisma.series.findMany({
    where: {
      id: {
        in: seriesCreditData.map((series) => series.id),
      },
    },
    select: {
      id: true,
      title: true,
    },
  });

  const existingSeriesIds = new Set(existingSeries.map((series) => series.id));

  for (const series of seriesCreditData) {
    if (!existingSeriesIds.has(series.id)) {
      console.warn(`skip ${series.id}: series not found in database`);
      continue;
    }

    const author = buildSeriesAuthor(series.credits);
    await prisma.series.update({
      where: { id: series.id },
      data: {
        author,
      },
    });

    for (const [index, credit] of series.credits.entries()) {
      const normalizedName = normalizeCreatorName(credit.name);
      const normalizedKey = normalizedName.toLowerCase();
      const creatorId = createStableId("creator", normalizedKey);
      const slugBase = slugifyCreatorName(normalizedName) || "creator";
      const slug = `${slugBase}-${createStableSuffix(normalizedKey)}`;
      const creatorType = credit.type || inferCreatorType(normalizedName);

      await prisma.creator.upsert({
        where: { normalizedName: normalizedKey },
        update: {
          name: normalizedName,
          slug,
          type: creatorType,
          bio: credit.bio || null,
          isPublic: true,
        },
        create: {
          id: creatorId,
          slug,
          name: normalizedName,
          normalizedName: normalizedKey,
          type: creatorType,
          bio: credit.bio || null,
          isPublic: true,
        },
      });

      await prisma.seriesCredit.upsert({
        where: {
          seriesId_creatorId_role: {
            seriesId: series.id,
            creatorId,
            role: credit.role,
          },
        },
        update: {
          source: "catalog_import",
          sortOrder: index,
          isPrimary: credit.isPrimary ?? index === 0,
          isPublic: true,
        },
        create: {
          id: createStableId("credit", `${series.id}:${creatorId}:${credit.role}`),
          seriesId: series.id,
          creatorId,
          role: credit.role,
          source: "catalog_import",
          sortOrder: index,
          isPrimary: credit.isPrimary ?? index === 0,
          isPublic: true,
        },
      });
    }

    console.log(`imported creator credits for ${series.id} (${series.title})`);
    importedSeriesIds.push(series.id);
  }

  return importedSeriesIds;
}

async function invalidateImportedSeriesCaches(seriesIds: string[]) {
  const patterns = buildSeriesContentInvalidationPatterns(seriesIds);
  if (patterns.length === 0) {
    return;
  }

  await cacheService.deletePatterns(patterns);
  console.log(`invalidated storefront caches for ${seriesIds.length} imported series`);
}

async function main() {
  const importedSeriesIds = await importSeriesCredits();
  await invalidateImportedSeriesCaches(importedSeriesIds);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await disconnectRedisClient().catch(() => undefined);
  });
