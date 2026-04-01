import { access, readFile } from "fs/promises";
import { createHash } from "crypto";
import { CreditRole, CreatorType, PrismaClient } from "@prisma/client";
import { extname, isAbsolute, resolve } from "path";
import { CacheService } from "../src/common/cache/cache.service";
import { buildSeriesContentInvalidationPatterns } from "../src/common/cache/content-cache-invalidation.service";
import {
  inferCreatorTypeFromName,
  isGenericCreatorPlaceholder,
  normalizeCreatorName,
  slugifyCreatorName,
} from "../src/common/creators/creator-identity";
import { disconnectRedisClient } from "../src/common/redis/client";

const envLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

const prisma = new PrismaClient();
const cacheService = new CacheService();
const PROJECT_ROOT = resolve(__dirname, "..");

if (typeof envLoader.loadEnvFile === "function") {
  try {
    envLoader.loadEnvFile(resolve(PROJECT_ROOT, ".env"));
  } catch {
    // Ignore missing local env files. Production should inject env vars directly.
  }
}

const DEFAULT_IMPORT_JSON_PATH = "data/creator-credits.import.json";
const DEFAULT_IMPORT_CSV_PATH = "data/creator-credits.import.csv";
const DEFAULT_IMPORT_SOURCE = "catalog_import";
const VALID_CREDIT_ROLES = new Set<string>(Object.values(CreditRole));
const VALID_CREATOR_TYPES = new Set<string>(Object.values(CreatorType));

type CliOptions = {
  dryRun: boolean;
  filePath?: string;
  syncLegacyAuthor: boolean;
};

type CreditImportSeed = {
  name: string;
  role: CreditRole;
  type?: CreatorType;
  isPrimary?: boolean;
  isPublic?: boolean;
  bio?: string;
  source?: string;
  sortOrder?: number;
  slug?: string;
};

type SeriesImportSeed = {
  id: string;
  title: string;
  credits: CreditImportSeed[];
};

type PreparedCreator = {
  id: string;
  slug: string;
  name: string;
  normalizedName: string;
  type: CreatorType;
  bio: string | null;
  isPublic: boolean;
};

type ImportSummary = {
  importedSeriesIds: string[];
  importedCredits: number;
  skippedSeriesIds: string[];
};

function createStableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function createStableSuffix(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 6);
}

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeOptionalText(value: unknown): string | undefined {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parseInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, fieldName: string, context: string): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`${context}: missing required field "${fieldName}"`);
  }
  return normalized;
}

function parseCreditRole(value: unknown, context: string): CreditRole {
  const normalized = normalizeText(value).toUpperCase().replace(/\s+/g, "_");
  if (VALID_CREDIT_ROLES.has(normalized)) {
    return normalized as CreditRole;
  }
  throw new Error(`${context}: unsupported credit role "${value}"`);
}

function parseCreatorType(value: unknown, name: string): CreatorType {
  const normalized = normalizeText(value).toUpperCase().replace(/\s+/g, "_");
  if (VALID_CREATOR_TYPES.has(normalized)) {
    return normalized as CreatorType;
  }

  const inferred = inferCreatorTypeFromName(name);
  if (inferred === "team") {
    return CreatorType.TEAM;
  }
  if (inferred === "studio") {
    return CreatorType.STUDIO;
  }
  return CreatorType.PERSON;
}

function buildCreatorSlug(name: string, explicitSlug?: string): string {
  const normalizedExplicitSlug = normalizeText(explicitSlug)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalizedExplicitSlug) {
    return normalizedExplicitSlug.slice(0, 72);
  }

  const normalizedKey = name.toLowerCase();
  const slugBase = slugifyCreatorName(name) || "creator";
  return `${slugBase}-${createStableSuffix(normalizedKey)}`;
}

function buildSeriesAuthor(credits: CreditImportSeed[]) {
  const primary = credits.find((credit) => credit.isPrimary && credit.isPublic !== false);
  if (primary) {
    return primary.name;
  }

  return credits.find((credit) => credit.isPublic !== false)?.name || credits[0]?.name || "";
}

function finalizeSeriesCredits(credits: CreditImportSeed[]): CreditImportSeed[] {
  const normalizedCredits = credits.map((credit, index) => ({
    ...credit,
    sortOrder: credit.sortOrder ?? index,
    isPublic: credit.isPublic !== false,
  }));
  const hasExplicitPrimary = normalizedCredits.some(
    (credit) => credit.isPrimary && credit.isPublic !== false,
  );

  return normalizedCredits.map((credit, index) => ({
    ...credit,
    isPrimary: hasExplicitPrimary
      ? Boolean(credit.isPrimary) && credit.isPublic !== false
      : index === 0 && credit.isPublic !== false,
  }));
}

function normalizeCreditSeed(
  rawCredit: unknown,
  context: string,
  fallbackSortOrder: number,
): CreditImportSeed {
  if (!isRecord(rawCredit)) {
    throw new Error(`${context}: credit entry must be an object`);
  }

  const name = requireNonEmptyString(
    rawCredit.name ?? rawCredit.creatorName,
    "name",
    context,
  );
  if (isGenericCreatorPlaceholder(name)) {
    throw new Error(`${context}: "${name}" is not valid public-facing creator data`);
  }

  return {
    name,
    role: parseCreditRole(rawCredit.role, context),
    type: parseCreatorType(rawCredit.type, name),
    isPrimary: parseBoolean(rawCredit.isPrimary, false),
    isPublic: parseBoolean(rawCredit.isPublic, true),
    bio: normalizeOptionalText(rawCredit.bio),
    source: normalizeOptionalText(rawCredit.source) || DEFAULT_IMPORT_SOURCE,
    sortOrder: parseInteger(rawCredit.sortOrder, fallbackSortOrder),
    slug: normalizeOptionalText(rawCredit.slug ?? rawCredit.creatorSlug),
  };
}

function normalizeSeriesSeed(rawSeries: unknown, index: number): SeriesImportSeed {
  if (!isRecord(rawSeries)) {
    throw new Error(`series[${index}]: series entry must be an object`);
  }

  const id = requireNonEmptyString(
    rawSeries.id ?? rawSeries.seriesId,
    "id",
    `series[${index}]`,
  );
  const title = normalizeText(rawSeries.title ?? rawSeries.seriesTitle) || id;
  const rawCredits = Array.isArray(rawSeries.credits) ? rawSeries.credits : [];
  if (rawCredits.length === 0) {
    throw new Error(`series[${index}] (${id}): at least one credit is required`);
  }

  const credits = finalizeSeriesCredits(rawCredits.map((credit, creditIndex) =>
    normalizeCreditSeed(
      credit,
      `series[${index}] (${id}) credit[${creditIndex}]`,
      creditIndex,
    ),
  ));

  return {
    id,
    title,
    credits,
  };
}

function parseJsonSeriesSeeds(fileContent: string, filePath: string): SeriesImportSeed[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`${filePath}: invalid JSON - ${(error as Error).message}`);
  }

  const rawSeriesList = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.series)
      ? parsed.series
      : null;

  if (!rawSeriesList) {
    throw new Error(
      `${filePath}: JSON must be an array of series entries or an object with a "series" array`,
    );
  }

  return rawSeriesList.map((entry, index) => normalizeSeriesSeed(entry, index));
}

function parseCsvTable(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (inQuotes) {
      if (character === "\"") {
        const nextCharacter = content[index + 1];
        if (nextCharacter === "\"") {
          currentField += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += character;
      }
      continue;
    }

    if (character === "\"") {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (character === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    if (character === "\r") {
      continue;
    }

    currentField += character;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((field) => normalizeText(field)));
}

function parseCsvSeriesSeeds(fileContent: string, filePath: string): SeriesImportSeed[] {
  const rows = parseCsvTable(fileContent);
  if (rows.length < 2) {
    throw new Error(`${filePath}: CSV must include a header row and at least one data row`);
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => normalizeText(header));

  const requiredHeaders = ["seriesId", "creatorName", "role"];
  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(`${filePath}: missing required CSV column "${requiredHeader}"`);
    }
  }

  const groupedSeries = new Map<string, SeriesImportSeed>();

  dataRows.forEach((row, rowIndex) => {
    const record = headers.reduce<Record<string, string>>((accumulator, header, columnIndex) => {
      accumulator[header] = row[columnIndex] ?? "";
      return accumulator;
    }, {});

    const seriesId = requireNonEmptyString(record.seriesId, "seriesId", `csv row ${rowIndex + 2}`);
    const seriesTitle = normalizeText(record.seriesTitle || record.title) || seriesId;
    const credit = normalizeCreditSeed(
      {
        creatorName: record.creatorName,
        role: record.role,
        type: record.type,
        isPrimary: record.isPrimary,
        isPublic: record.isPublic,
        bio: record.bio,
        source: record.source,
        sortOrder: record.sortOrder,
        creatorSlug: record.creatorSlug,
      },
      `csv row ${rowIndex + 2} (${seriesId})`,
      rowIndex,
    );

    const existingSeries = groupedSeries.get(seriesId);
    if (existingSeries) {
      existingSeries.credits.push(credit);
      if (!existingSeries.title && seriesTitle) {
        existingSeries.title = seriesTitle;
      }
      return;
    }

    groupedSeries.set(seriesId, {
      id: seriesId,
      title: seriesTitle,
      credits: [credit],
    });
  });

  return Array.from(groupedSeries.values()).map((series) => ({
    ...series,
    credits: finalizeSeriesCredits(series.credits),
  }));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    filePath: undefined,
    syncLegacyAuthor: parseBoolean(process.env.CREATOR_IMPORT_SYNC_LEGACY_AUTHOR, true),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = String(argv[index] || "").trim();
    if (!argument) {
      continue;
    }

    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (argument === "--sync-legacy-author") {
      options.syncLegacyAuthor = true;
      continue;
    }

    if (argument === "--no-sync-legacy-author") {
      options.syncLegacyAuthor = false;
      continue;
    }

    if (argument === "--file") {
      const nextValue = String(argv[index + 1] || "").trim();
      if (!nextValue) {
        throw new Error("--file requires a path");
      }
      options.filePath = nextValue;
      index += 1;
      continue;
    }

    if (argument.startsWith("--file=")) {
      options.filePath = argument.slice("--file=".length).trim();
      continue;
    }

    throw new Error(`Unsupported argument "${argument}"`);
  }

  if (!options.filePath) {
    const envPath = normalizeOptionalText(process.env.CREATOR_CREDITS_FILE);
    if (envPath) {
      options.filePath = envPath;
    }
  }

  return options;
}

async function resolveImportFilePath(options: CliOptions): Promise<string> {
  if (options.filePath) {
    const candidatePaths = [
      isAbsolute(options.filePath)
        ? options.filePath
        : resolve(process.cwd(), options.filePath),
      isAbsolute(options.filePath)
        ? options.filePath
        : resolve(PROJECT_ROOT, options.filePath),
    ];

    for (const candidatePath of [...new Set(candidatePaths)]) {
      if (await fileExists(candidatePath)) {
        return candidatePath;
      }
    }

    throw new Error(`Creator credit file not found: ${options.filePath}`);
  }

  const defaultJsonPath = resolve(PROJECT_ROOT, DEFAULT_IMPORT_JSON_PATH);
  if (await fileExists(defaultJsonPath)) {
    return defaultJsonPath;
  }

  const defaultCsvPath = resolve(PROJECT_ROOT, DEFAULT_IMPORT_CSV_PATH);
  if (await fileExists(defaultCsvPath)) {
    return defaultCsvPath;
  }

  throw new Error(
    `No creator credit import file found. Create "${DEFAULT_IMPORT_JSON_PATH}" or pass --file. Start from data/creator-credits.template.json or data/creator-credits.template.csv.`,
  );
}

async function loadSeriesSeeds(filePath: string): Promise<SeriesImportSeed[]> {
  const extension = extname(filePath).toLowerCase();
  const fileContent = await readFile(filePath, "utf8");

  if (extension === ".json") {
    return parseJsonSeriesSeeds(fileContent, filePath);
  }

  if (extension === ".csv") {
    return parseCsvSeriesSeeds(fileContent, filePath);
  }

  throw new Error(`${filePath}: unsupported file format "${extension}". Use JSON or CSV.`);
}

function prepareCreators(seeds: SeriesImportSeed[]): Map<string, PreparedCreator> {
  const creators = new Map<string, PreparedCreator>();

  for (const series of seeds) {
    for (const credit of series.credits) {
      const normalizedName = normalizeCreatorName(credit.name);
      const normalizedKey = normalizedName.toLowerCase();
      const existing = creators.get(normalizedKey);
      const nextType = credit.type || parseCreatorType(undefined, normalizedName);
      const nextSlug = buildCreatorSlug(normalizedName, credit.slug);

      if (existing) {
        creators.set(normalizedKey, {
          ...existing,
          type:
            existing.type === CreatorType.PERSON && nextType !== CreatorType.PERSON
              ? nextType
              : existing.type,
          bio: existing.bio || credit.bio || null,
          isPublic: existing.isPublic || credit.isPublic !== false,
        });
        continue;
      }

      creators.set(normalizedKey, {
        id: createStableId("creator", normalizedKey),
        slug: nextSlug,
        name: normalizedName,
        normalizedName: normalizedKey,
        type: nextType,
        bio: credit.bio || null,
        isPublic: credit.isPublic !== false,
      });
    }
  }

  return creators;
}

async function upsertCreator(creator: PreparedCreator): Promise<void> {
  await prisma.creator.upsert({
    where: { normalizedName: creator.normalizedName },
    update: {
      name: creator.name,
      slug: creator.slug,
      type: creator.type,
      bio: creator.bio,
      isPublic: creator.isPublic,
    },
    create: {
      id: creator.id,
      slug: creator.slug,
      name: creator.name,
      normalizedName: creator.normalizedName,
      type: creator.type,
      bio: creator.bio,
      isPublic: creator.isPublic,
    },
  });
}

async function importSeriesCredits(
  seriesSeeds: SeriesImportSeed[],
  options: CliOptions,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    importedSeriesIds: [],
    importedCredits: 0,
    skippedSeriesIds: [],
  };

  const existingSeries = await prisma.series.findMany({
    where: {
      id: {
        in: seriesSeeds.map((series) => series.id),
      },
    },
    select: {
      id: true,
      title: true,
    },
  });

  const existingSeriesMap = new Map(
    existingSeries.map((series) => [String(series.id), series]),
  );

  const preparedCreators = prepareCreators(seriesSeeds);
  if (!options.dryRun) {
    for (const creator of preparedCreators.values()) {
      await upsertCreator(creator);
    }
  }

  for (const series of seriesSeeds) {
    const existing = existingSeriesMap.get(series.id);
    if (!existing) {
      console.warn(`[creator-import] skip ${series.id}: series not found in database`);
      summary.skippedSeriesIds.push(series.id);
      continue;
    }

    if (series.title && normalizeText(existing.title) && normalizeText(existing.title) !== normalizeText(series.title)) {
      console.warn(
        `[creator-import] title mismatch for ${series.id}: database="${existing.title}" file="${series.title}"`,
      );
    }

    if (!options.dryRun) {
      const author = buildSeriesAuthor(series.credits);
      const nextCredits = series.credits.map((credit, index) => {
        const normalizedName = normalizeCreatorName(credit.name).toLowerCase();
        const preparedCreator = preparedCreators.get(normalizedName);
        if (!preparedCreator) {
          throw new Error(`Prepared creator missing for "${credit.name}"`);
        }

        return {
          id: createStableId("credit", `${series.id}:${preparedCreator.id}:${credit.role}`),
          seriesId: series.id,
          creatorId: preparedCreator.id,
          role: credit.role,
          source: credit.source || DEFAULT_IMPORT_SOURCE,
          sortOrder: credit.sortOrder ?? index,
          isPrimary: credit.isPrimary ?? index === 0,
          isPublic: credit.isPublic !== false,
        };
      });

      await prisma.$transaction(async (tx) => {
        if (options.syncLegacyAuthor) {
          await tx.series.update({
            where: { id: series.id },
            data: {
              author,
            },
          });
        }

        await tx.seriesCredit.deleteMany({
          where: {
            seriesId: series.id,
            isPublic: true,
          },
        });

        if (nextCredits.length > 0) {
          await tx.seriesCredit.createMany({
            data: nextCredits,
          });
        }
      });
    }

    summary.importedCredits += series.credits.length;
    summary.importedSeriesIds.push(series.id);
    console.log(
      `[creator-import] ${options.dryRun ? "validated" : "imported"} ${series.id} (${existing.title}) with ${series.credits.length} credit(s)`,
    );
  }

  if (summary.importedSeriesIds.length === 0) {
    throw new Error("No matching series IDs were found in the database for this import.");
  }

  return summary;
}

async function invalidateImportedSeriesCaches(seriesIds: string[]) {
  const patterns = buildSeriesContentInvalidationPatterns(seriesIds);
  if (patterns.length === 0) {
    return;
  }

  await cacheService.deletePatterns(patterns);
  console.log(`[creator-import] invalidated storefront caches for ${seriesIds.length} series`);
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const filePath = await resolveImportFilePath(options);
  if (!options.dryRun && filePath.includes(".template.")) {
    throw new Error(
      `Refusing to write from template file "${filePath}". Copy it to ${DEFAULT_IMPORT_JSON_PATH} or ${DEFAULT_IMPORT_CSV_PATH} first.`,
    );
  }
  const seriesSeeds = await loadSeriesSeeds(filePath);

  console.log(
    `[creator-import] loaded ${seriesSeeds.length} series entr${seriesSeeds.length === 1 ? "y" : "ies"} from ${filePath}`,
  );
  console.log(
    `[creator-import] mode: ${options.dryRun ? "dry-run" : "write"} | syncLegacyAuthor=${options.syncLegacyAuthor ? "on" : "off"}`,
  );

  const summary = await importSeriesCredits(seriesSeeds, options);
  if (!options.dryRun) {
    await invalidateImportedSeriesCaches(summary.importedSeriesIds);
  }

  console.log(
    `[creator-import] done: series=${summary.importedSeriesIds.length}, credits=${summary.importedCredits}, skipped=${summary.skippedSeriesIds.length}`,
  );
}

main()
  .catch((error) => {
    console.error(`[creator-import] failed: ${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await disconnectRedisClient().catch(() => undefined);
  });
