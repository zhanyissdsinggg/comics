export const CREATOR_FALLBACK_LABEL = "Creator details coming soon";

export type PublicCreatorCredit = {
  creatorId: string;
  slug: string;
  name: string;
  type: "person" | "team" | "studio";
  role: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type PublicCreatorIdentity = {
  label: string;
  type: "person" | "team" | "studio" | "fallback";
  slug?: string;
  creatorId?: string;
  isFallback: boolean;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeCreatorName(value: unknown): string {
  return normalizeText(value);
}

export function slugifyCreatorName(value: unknown): string {
  return normalizeCreatorName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function inferCreatorTypeFromName(value: unknown): "person" | "team" | "studio" {
  const normalized = normalizeCreatorName(value).toLowerCase();
  if (!normalized) {
    return "person";
  }
  if (normalized.includes("studio")) {
    return "studio";
  }
  if (normalized.includes("team")) {
    return "team";
  }
  return "person";
}

export function mapCreatorType(value: unknown): "person" | "team" | "studio" {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "TEAM") {
    return "team";
  }
  if (normalized === "STUDIO") {
    return "studio";
  }
  return "person";
}

export function formatCreditRole(value: unknown): string {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return "creator";
  }
  return normalized.replace(/_/g, " ");
}

export function buildPublicCreatorCredits(
  credits: Array<{
    creatorId?: unknown;
    creator?: { id?: unknown; slug?: unknown; name?: unknown; type?: unknown; isPublic?: unknown } | null;
    role?: unknown;
    isPrimary?: unknown;
    sortOrder?: unknown;
    isPublic?: unknown;
  }>,
): PublicCreatorCredit[] {
  return (Array.isArray(credits) ? credits : [])
    .filter((credit) => credit?.isPublic !== false && credit?.creator?.isPublic !== false)
    .map((credit) => {
      const name = normalizeCreatorName(credit?.creator?.name);
      return {
        creatorId: String(credit?.creator?.id || credit?.creatorId || "").trim(),
        slug: String(credit?.creator?.slug || "").trim(),
        name,
        type: mapCreatorType(credit?.creator?.type),
        role: formatCreditRole(credit?.role),
        isPrimary: Boolean(credit?.isPrimary),
        sortOrder: Number(credit?.sortOrder || 0),
      };
    })
    .filter((credit) => credit.name)
    .sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
    });
}

export function buildCreatorIdentityFromCredits(
  credits: PublicCreatorCredit[],
  legacyAuthor?: unknown,
): PublicCreatorIdentity {
  if (credits.length > 0) {
    const [primary, ...rest] = credits;
    const label =
      rest.length === 0
        ? primary.name
        : rest.length === 1
          ? `${primary.name} and ${rest[0].name}`
          : `${primary.name} and ${rest.length} others`;

    return {
      label,
      type: primary.type,
      slug: primary.slug || undefined,
      creatorId: primary.creatorId || undefined,
      isFallback: false,
    };
  }

  const normalizedLegacyAuthor = normalizeCreatorName(legacyAuthor);
  if (normalizedLegacyAuthor) {
    return {
      label: normalizedLegacyAuthor,
      type: inferCreatorTypeFromName(normalizedLegacyAuthor),
      slug: slugifyCreatorName(normalizedLegacyAuthor) || undefined,
      isFallback: false,
    };
  }

  return {
    label: CREATOR_FALLBACK_LABEL,
    type: "fallback",
    isFallback: true,
  };
}
