import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type OrderField = "createdAt" | "updatedAt" | "title" | "rating" | "ratingCount";
type OrderDirection = "asc" | "desc";

type SeriesCompatOptions = {
  adult?: boolean | null;
  excludeIds?: string[];
  ids?: string[];
  limit?: number;
  onlyPublished?: boolean;
  orderBy?: Array<{ direction: OrderDirection; field: OrderField }>;
  select?: string[];
  statusNot?: string;
  type?: string;
};

type SeriesCompatRow = {
  adult: boolean;
  badge: string;
  badges: string[];
  coverTone: string;
  coverUrl: string;
  createdAt?: Date | null;
  description: string;
  episodePrice: number;
  genres: string[];
  id: string;
  isPublished: boolean;
  latestEpisodeId: string;
  rating: number;
  ratingCount: number;
  status: string;
  title: string;
  ttfEnabled: boolean;
  ttfIntervalHours: number;
  type: string;
  updatedAt?: Date | null;
};

const DEFAULT_SELECT = [
  "id",
  "title",
  "type",
  "adult",
  "isPublished",
  "coverTone",
  "coverUrl",
  "badge",
  "badges",
  "latestEpisodeId",
  "genres",
  "status",
  "rating",
  "ratingCount",
  "description",
  "episodePrice",
  "ttfEnabled",
  "ttfIntervalHours",
  "createdAt",
  "updatedAt",
];

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value !== "string") {
    return [];
  }

  const raw = value.trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }

  if (raw.startsWith("{") && raw.endsWith("}")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((item) => item.replace(/^"+|"+$/g, "").trim())
      .filter(Boolean);
  }

  return [raw];
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "t", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "f", "0", "no"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSeriesVisibilitySchemaDrift(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021" || error.code === "P2022";
  }

  const message = String((error as { message?: string }).message || "");
  return message.includes("isPublished") || message.includes("does not exist") || message.includes("Unknown column");
}

export function normalizeSeriesVisibilityRow(row: Record<string, any>): SeriesCompatRow {
  return {
    id: String(row.id || ""),
    title: String(row.title || ""),
    type: String(row.type || "comic"),
    adult: toBoolean(row.adult, false),
    isPublished: row.isPublished === undefined ? true : toBoolean(row.isPublished, true),
    coverTone: String(row.coverTone || ""),
    coverUrl: String(row.coverUrl || ""),
    badge: String(row.badge || ""),
    badges: toStringArray(row.badges),
    latestEpisodeId: String(row.latestEpisodeId || ""),
    genres: toStringArray(row.genres),
    status: String(row.status || "Ongoing"),
    rating: toNumber(row.rating, 0),
    ratingCount: Math.max(0, Math.floor(toNumber(row.ratingCount, 0))),
    description: String(row.description || ""),
    episodePrice: Math.max(0, Math.floor(toNumber(row.episodePrice, 0))),
    ttfEnabled: toBoolean(row.ttfEnabled, false),
    ttfIntervalHours: Math.max(1, Math.floor(toNumber(row.ttfIntervalHours, 24))),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

async function getAvailableSeriesColumns(prisma: PrismaService): Promise<Set<string>> {
  const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'series'`,
  );

  return new Set(
    columns
      .map((item) => String(item?.column_name || "").trim())
      .filter(Boolean),
  );
}

function appendInClause(
  clauses: string[],
  params: Array<string | boolean | number>,
  column: string,
  values: string[],
  negated = false,
) {
  if (!values.length) {
    return;
  }
  const placeholders = values.map((_value, index) => `$${params.length + index + 1}`).join(", ");
  clauses.push(`"${column}" ${negated ? "NOT IN" : "IN"} (${placeholders})`);
  params.push(...values);
}

export async function querySeriesVisibilityCompat(
  prisma: PrismaService,
  options: SeriesCompatOptions = {},
): Promise<SeriesCompatRow[]> {
  const available = await getAvailableSeriesColumns(prisma);
  const requested = Array.isArray(options.select) && options.select.length ? options.select : DEFAULT_SELECT;
  const selected = requested.filter((column) => available.has(column));
  if (!selected.includes("id")) {
    selected.unshift("id");
  }

  const selectClause = selected
    .map((column) => `"${column.replace(/"/g, "\"\"")}"`)
    .join(", ");

  const clauses: string[] = [];
  const params: Array<string | boolean | number> = [];

  if (options.onlyPublished !== false && available.has("isPublished")) {
    clauses.push(`"isPublished" = true`);
  }
  if (typeof options.adult === "boolean" && available.has("adult")) {
    clauses.push(`"adult" = $${params.length + 1}`);
    params.push(options.adult);
  }
  if (options.type && available.has("type")) {
    clauses.push(`"type" = $${params.length + 1}`);
    params.push(options.type);
  }
  if (options.statusNot && available.has("status")) {
    clauses.push(`"status" <> $${params.length + 1}`);
    params.push(options.statusNot);
  }
  appendInClause(clauses, params, "id", options.ids || []);
  appendInClause(clauses, params, "id", options.excludeIds || [], true);

  const whereClause = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const orderBy = Array.isArray(options.orderBy) ? options.orderBy : [];
  const orderTerms = orderBy
    .filter((item) => available.has(item.field))
    .map((item) => `"${item.field}" ${item.direction.toUpperCase()}`);
  const orderClause = orderTerms.length ? ` ORDER BY ${orderTerms.join(", ")}` : "";
  const limitClause = typeof options.limit === "number" && options.limit > 0
    ? ` LIMIT ${Math.max(1, Math.floor(options.limit))}`
    : "";

  const rows = await prisma.$queryRawUnsafe<Array<Record<string, any>>>(
    `SELECT ${selectClause} FROM "series"${whereClause}${orderClause}${limitClause}`,
    ...params,
  );

  return rows.map((row) => normalizeSeriesVisibilityRow(row));
}

export async function findSeriesVisibilityCompat(
  prisma: PrismaService,
  seriesId: string,
  select?: string[],
): Promise<SeriesCompatRow | null> {
  const rows = await querySeriesVisibilityCompat(prisma, {
    ids: [seriesId],
    limit: 1,
    onlyPublished: false,
    select,
  });
  return rows[0] || null;
}