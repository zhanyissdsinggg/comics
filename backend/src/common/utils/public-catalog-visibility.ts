import { Prisma } from "@prisma/client";

const BLOCKED_PUBLIC_TEXT_PATTERNS = [
  "demo series",
  "gush demo studio",
  "smoke test",
  "reader qa",
  "demo action",
  "demo genre",
  "platform smoke tests",
  "fixture",
  "placeholder",
];

const BLOCKED_PUBLIC_TOKEN_PATTERNS = [
  "demo",
  "fixture",
  "placeholder",
  "qa",
];

const BLOCKED_PUBLIC_IDS = new Set([
  "demo-series",
  "fixture-series",
]);

function normalizeValue(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function containsBlockedText(value: unknown) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return false;
  }

  return BLOCKED_PUBLIC_TEXT_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

function containsBlockedToken(value: unknown) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return false;
  }

  return BLOCKED_PUBLIC_TOKEN_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

function arrayContainsBlockedText(values: unknown) {
  if (!Array.isArray(values)) {
    return false;
  }
  return values.some((value) => containsBlockedText(value));
}

export function isBlockedPublicSeriesRecord(value: {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  genres?: unknown;
  author?: unknown;
} | null | undefined) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const seriesId = normalizeValue(value.id);
  if (BLOCKED_PUBLIC_IDS.has(seriesId) || containsBlockedToken(seriesId)) {
    return true;
  }

  return (
    containsBlockedText(value.title) ||
    containsBlockedText(value.description) ||
    containsBlockedText(value.author) ||
    arrayContainsBlockedText(value.genres)
  );
}

export function isBlockedPublicCreatorRecord(value: {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  bio?: unknown;
} | null | undefined) {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    containsBlockedToken(value.id) ||
    containsBlockedToken(value.slug) ||
    containsBlockedText(value.name) ||
    containsBlockedText(value.bio)
  );
}

export function filterBlockedPublicSeries<T extends {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  genres?: unknown;
  author?: unknown;
}>(items: T[]) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => !isBlockedPublicSeriesRecord(item),
  );
}

export function filterBlockedPublicCreators<T extends {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  bio?: unknown;
}>(items: T[]) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => !isBlockedPublicCreatorRecord(item),
  );
}

export function buildPublicSeriesVisibilityWhere(
  baseWhere: Prisma.SeriesWhereInput = {},
): Prisma.SeriesWhereInput {
  return {
    AND: [
      baseWhere,
      {
        NOT: [
          {
            id: {
              in: Array.from(BLOCKED_PUBLIC_IDS),
            },
          },
          ...BLOCKED_PUBLIC_TOKEN_PATTERNS.map((pattern) => ({
            id: {
              contains: pattern,
              mode: "insensitive" as const,
            },
          })),
          ...BLOCKED_PUBLIC_TEXT_PATTERNS.flatMap((pattern) => [
            {
              title: {
                contains: pattern,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: pattern,
                mode: "insensitive" as const,
              },
            },
            {
              author: {
                contains: pattern,
                mode: "insensitive" as const,
              },
            },
          ]),
        ],
      },
    ],
  };
}
