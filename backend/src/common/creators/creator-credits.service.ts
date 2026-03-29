import { Injectable } from "@nestjs/common";
import { logger } from "../logger/winston.init";
import { PrismaService } from "../prisma/prisma.service";
import { SchemaCapabilitiesService } from "../prisma/schema-capabilities.service";
import {
  buildCreatorIdentityFromCredits,
  buildPublicCreatorCredits,
  inferCreatorTypeFromName,
  normalizeCreatorName,
  slugifyCreatorName,
  type PublicCreatorCredit,
  type PublicCreatorIdentity,
} from "./creator-identity";

type CreatorRecord = {
  id: string;
  slug: string;
  name: string;
  normalizedName: string;
  type: "PERSON" | "TEAM" | "STUDIO";
  isPublic: boolean;
};

type SeriesCreditRecord = {
  seriesId: string;
  source: string;
  role: string;
  sortOrder: number;
  isPrimary: boolean;
  isPublic: boolean;
  creator: CreatorRecord;
};

function toCreatorType(name: string): "PERSON" | "TEAM" | "STUDIO" {
  const inferred = inferCreatorTypeFromName(name);
  if (inferred === "team") {
    return "TEAM";
  }
  if (inferred === "studio") {
    return "STUDIO";
  }
  return "PERSON";
}

function toCreditRole(name: string): "AUTHOR" | "TEAM" | "STUDIO" {
  const inferred = inferCreatorTypeFromName(name);
  if (inferred === "team") {
    return "TEAM";
  }
  if (inferred === "studio") {
    return "STUDIO";
  }
  return "AUTHOR";
}

@Injectable()
export class CreatorCreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schemaCapabilitiesService: SchemaCapabilitiesService,
  ) {}

  private async reserveSlug(baseSlug: string, creatorId?: string): Promise<string> {
    const fallbackBase = baseSlug || "creator";
    let nextSlug = fallbackBase;
    let attempt = 1;

    while (attempt < 100) {
      const existing = await this.prisma.creator.findUnique({
        where: { slug: nextSlug },
        select: { id: true },
      });
      if (!existing || existing.id === creatorId) {
        return nextSlug;
      }
      attempt += 1;
      nextSlug = `${fallbackBase}-${attempt}`;
    }

    return `${fallbackBase}-${Date.now()}`;
  }

  async getCreditsMap(seriesIds: string[]): Promise<Map<string, PublicCreatorCredit[]>> {
    const normalizedSeriesIds = [...new Set(seriesIds.map((item) => String(item || "").trim()).filter(Boolean))];
    const result = new Map<string, PublicCreatorCredit[]>();
    if (normalizedSeriesIds.length === 0) {
      return result;
    }

    if (!(await this.schemaCapabilitiesService.supportsCreatorCredits())) {
      return result;
    }

    const rows = await this.prisma.seriesCredit.findMany({
      where: {
        seriesId: { in: normalizedSeriesIds },
        isPublic: true,
      },
      include: {
        creator: true,
      },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    for (const seriesId of normalizedSeriesIds) {
      const credits = buildPublicCreatorCredits(
        rows.filter((row) => row.seriesId === seriesId && row.creator?.isPublic !== false),
      );
      result.set(seriesId, credits);
    }

    return result;
  }

  async getCreditsForSeries(seriesId: string): Promise<PublicCreatorCredit[]> {
    const map = await this.getCreditsMap([seriesId]);
    return map.get(seriesId) || [];
  }

  async getLegacyAuthorMap(seriesIds: string[]): Promise<Map<string, string>> {
    const normalizedSeriesIds = [...new Set(seriesIds.map((item) => String(item || "").trim()).filter(Boolean))];
    const result = new Map<string, string>();
    if (normalizedSeriesIds.length === 0) {
      return result;
    }

    if (!(await this.schemaCapabilitiesService.supportsLegacySeriesAuthor())) {
      return result;
    }

    try {
      const placeholders = normalizedSeriesIds.map((_item, index) => `$${index + 1}`).join(", ");
      const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string; author?: string | null }>>(
        `SELECT "id", "author" FROM "series" WHERE "id" IN (${placeholders})`,
        ...normalizedSeriesIds,
      );

      rows.forEach((row) => {
        const seriesId = String(row?.id || "").trim();
        const author = normalizeCreatorName(row?.author);
        if (seriesId && author) {
          result.set(seriesId, author);
        }
      });
    } catch (error) {
      logger.warn("[creator-credits] failed to load legacy author map", {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  buildIdentity(credits: PublicCreatorCredit[], legacyAuthor?: unknown): PublicCreatorIdentity {
    return buildCreatorIdentityFromCredits(credits, legacyAuthor);
  }

  async syncLegacyAuthorCredit(seriesId: string, author: unknown): Promise<void> {
    const normalizedSeriesId = String(seriesId || "").trim();
    const normalizedAuthor = normalizeCreatorName(author);
    if (!normalizedSeriesId) {
      return;
    }

    if (!(await this.schemaCapabilitiesService.supportsCreatorCredits())) {
      return;
    }

    if (!normalizedAuthor) {
      await this.prisma.seriesCredit.deleteMany({
        where: {
          seriesId: normalizedSeriesId,
          source: "legacy_author",
        },
      });
      return;
    }

    const normalizedName = normalizedAuthor.toLowerCase();
    const creatorType = toCreatorType(normalizedAuthor);
    const role = toCreditRole(normalizedAuthor);

    let creator = await this.prisma.creator.findUnique({
      where: { normalizedName },
    });

    if (!creator) {
      const slug = await this.reserveSlug(slugifyCreatorName(normalizedAuthor));
      creator = await this.prisma.creator.create({
        data: {
          slug,
          name: normalizedAuthor,
          normalizedName,
          type: creatorType,
          isPublic: true,
        },
      });
    } else {
      const slug = await this.reserveSlug(slugifyCreatorName(normalizedAuthor), creator.id);
      creator = await this.prisma.creator.update({
        where: { id: creator.id },
        data: {
          slug,
          name: normalizedAuthor,
          type: creatorType,
          isPublic: true,
        },
      });
    }

    await this.prisma.seriesCredit.deleteMany({
      where: {
        seriesId: normalizedSeriesId,
        source: "legacy_author",
      },
    });

    await this.prisma.seriesCredit.create({
      data: {
        seriesId: normalizedSeriesId,
        creatorId: creator.id,
        role,
        source: "legacy_author",
        sortOrder: 0,
        isPrimary: true,
        isPublic: true,
      },
    });
  }

  async listPublicCreators(limit = 100) {
    if (!(await this.schemaCapabilitiesService.supportsCreatorCredits())) {
      return [];
    }

    const creators = await this.prisma.creator.findMany({
      where: {
        isPublic: true,
        seriesCredits: {
          some: {
            isPublic: true,
            series: {
              isPublished: true,
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
      take: Math.max(1, limit),
      include: {
        seriesCredits: {
          where: {
            isPublic: true,
            series: {
              isPublished: true,
            },
          },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          include: {
            series: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
                genres: true,
                coverTone: true,
                coverUrl: true,
                description: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    return creators.map((creator) => {
      const titles = creator.seriesCredits
        .map((credit) => credit.series)
        .filter(Boolean)
        .map((series) => ({
          id: series.id,
          title: series.title,
          type: series.type,
          status: series.status,
          genres: Array.isArray(series.genres) ? series.genres : [],
          coverTone: series.coverTone || "",
          coverUrl: series.coverUrl || "",
          description: series.description || "",
          updatedAt: series.updatedAt,
        }));

      return {
        id: creator.id,
        slug: creator.slug,
        name: creator.name,
        type: creator.type.toLowerCase(),
        titleCount: titles.length,
        roles: [...new Set(creator.seriesCredits.map((credit) => String(credit.role || "").toLowerCase()).filter(Boolean))],
        series: titles,
        spotlightSeries: titles[0] || null,
      };
    });
  }

  async getPublicCreatorBySlug(slug: string) {
    const normalizedSlug = String(slug || "").trim();
    if (!normalizedSlug) {
      return null;
    }

    if (!(await this.schemaCapabilitiesService.supportsCreatorCredits())) {
      return null;
    }

    const creator = await this.prisma.creator.findUnique({
      where: { slug: normalizedSlug },
      include: {
        seriesCredits: {
          where: {
            isPublic: true,
            series: {
              isPublished: true,
            },
          },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          include: {
            series: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
                genres: true,
                coverTone: true,
                coverUrl: true,
                description: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!creator || creator.isPublic === false) {
      return null;
    }

    const series = creator.seriesCredits.map((credit) => ({
      id: credit.series.id,
      title: credit.series.title,
      type: credit.series.type,
      status: credit.series.status,
      genres: Array.isArray(credit.series.genres) ? credit.series.genres : [],
      coverTone: credit.series.coverTone || "",
      coverUrl: credit.series.coverUrl || "",
      description: credit.series.description || "",
      updatedAt: credit.series.updatedAt,
      role: String(credit.role || "").toLowerCase(),
      isPrimary: Boolean(credit.isPrimary),
    }));

    return {
      id: creator.id,
      slug: creator.slug,
      name: creator.name,
      type: creator.type.toLowerCase(),
      bio: creator.bio || "",
      series,
      spotlightSeries: series[0] || null,
    };
  }
}
