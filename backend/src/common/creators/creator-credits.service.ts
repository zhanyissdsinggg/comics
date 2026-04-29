import {
  CreditRole,
  CreatorType,
  Prisma,
  type Creator,
} from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildCreatorIdentityFromCredits,
  buildPublicCreatorCredits,
  inferCreatorTypeFromName,
  isGenericCreatorPlaceholder,
  normalizeCreatorName,
  slugifyCreatorName,
  type PublicCreatorCredit,
  type PublicCreatorIdentity,
} from "./creator-identity";
import {
  buildPublicSeriesVisibilityWhere,
  filterBlockedPublicCreators,
  filterBlockedPublicSeries,
  isBlockedPublicCreatorRecord,
} from "../utils/public-catalog-visibility";

export type AdminSeriesCreditRecord = {
  id: string;
  creatorId: string;
  slug: string;
  name: string;
  normalizedName: string;
  type: "person" | "team" | "studio";
  role: string;
  source: string;
  sortOrder: number;
  isPrimary: boolean;
  isPublic: boolean;
};

export type ReplaceSeriesCreditInput = {
  creatorId?: unknown;
  name?: unknown;
  role?: unknown;
  type?: unknown;
  sortOrder?: unknown;
  isPrimary?: unknown;
  isPublic?: unknown;
};

type NormalizedReplaceSeriesCreditInput = {
  creatorId: string;
  name: string;
  normalizedName: string;
  role: CreditRole;
  type: CreatorType;
  sortOrder: number;
  isPrimary: boolean;
  isPublic: boolean;
};

function toCreatorType(name: string): CreatorType {
  const inferred = inferCreatorTypeFromName(name);
  if (inferred === "team") {
    return CreatorType.TEAM;
  }
  if (inferred === "studio") {
    return CreatorType.STUDIO;
  }
  return CreatorType.PERSON;
}

function toCreditRole(name: string): CreditRole {
  const inferred = inferCreatorTypeFromName(name);
  if (inferred === "team") {
    return CreditRole.TEAM;
  }
  if (inferred === "studio") {
    return CreditRole.STUDIO;
  }
  return CreditRole.AUTHOR;
}

function mapCreatorTypeToPublic(type: CreatorType): "person" | "team" | "studio" {
  if (type === CreatorType.TEAM) {
    return "team";
  }
  if (type === CreatorType.STUDIO) {
    return "studio";
  }
  return "person";
}

function normalizeRoleInput(value: unknown, name: string): CreditRole {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  switch (normalized) {
    case CreditRole.CREATOR:
      return CreditRole.CREATOR;
    case CreditRole.WRITER:
      return CreditRole.WRITER;
    case CreditRole.ARTIST:
      return CreditRole.ARTIST;
    case CreditRole.AUTHOR:
      return CreditRole.AUTHOR;
    case CreditRole.ADAPTER:
      return CreditRole.ADAPTER;
    case CreditRole.STUDIO:
      return CreditRole.STUDIO;
    case CreditRole.TEAM:
      return CreditRole.TEAM;
    default:
      return toCreditRole(name);
  }
}

function normalizeCreatorTypeInput(value: unknown, name: string): CreatorType {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (normalized === CreatorType.TEAM) {
    return CreatorType.TEAM;
  }
  if (normalized === CreatorType.STUDIO) {
    return CreatorType.STUDIO;
  }
  if (normalized === CreatorType.PERSON) {
    return CreatorType.PERSON;
  }
  return toCreatorType(name);
}

@Injectable()
export class CreatorCreditsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildPublicSeriesVisibilityWhere(adult: boolean) {
    return buildPublicSeriesVisibilityWhere(
      adult
        ? {
            isPublished: true,
          }
        : {
            isPublished: true,
            adult: false,
          },
    );
  }

  private async reserveSlug(
    client: PrismaService | Prisma.TransactionClient,
    baseSlug: string,
    creatorId?: string,
  ): Promise<string> {
    const fallbackBase = baseSlug || "creator";
    let nextSlug = fallbackBase;
    let attempt = 1;

    while (attempt < 100) {
      const existing = await client.creator.findUnique({
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

  private normalizeReplaceInputs(
    inputs: ReplaceSeriesCreditInput[],
  ): NormalizedReplaceSeriesCreditInput[] {
    const prepared = (Array.isArray(inputs) ? inputs : [])
      .map((input, index) => {
        const name = normalizeCreatorName(input?.name);
        if (!name || isGenericCreatorPlaceholder(name)) {
          return null;
        }

        return {
          creatorId: String(input?.creatorId || "").trim(),
          name,
          normalizedName: name.toLowerCase(),
          role: normalizeRoleInput(input?.role, name),
          type: normalizeCreatorTypeInput(input?.type, name),
          sortOrder: Math.max(0, Number(input?.sortOrder ?? index) || index),
          isPrimary: Boolean(input?.isPrimary),
          isPublic: input?.isPublic !== false,
        } satisfies NormalizedReplaceSeriesCreditInput;
      })
      .filter(
        (entry): entry is NormalizedReplaceSeriesCreditInput => Boolean(entry),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);

    if (prepared.length === 0) {
      return [];
    }

    const hasExplicitPrimary = prepared.some(
      (entry) => entry.isPrimary && entry.isPublic,
    );

    return prepared.map((entry, index) => ({
      ...entry,
      isPrimary: hasExplicitPrimary
        ? entry.isPrimary && entry.isPublic
        : index === 0 && entry.isPublic,
    }));
  }

  private async resolveCreatorForCredit(
    client: PrismaService | Prisma.TransactionClient,
    input: NormalizedReplaceSeriesCreditInput,
  ): Promise<Creator> {
    if (input.creatorId) {
      const existingById = await client.creator.findUnique({
        where: { id: input.creatorId },
      });
      if (existingById && existingById.normalizedName === input.normalizedName) {
        const slug = await this.reserveSlug(
          client,
          slugifyCreatorName(input.name),
          existingById.id,
        );
        return client.creator.update({
          where: { id: existingById.id },
          data: {
            slug,
            name: input.name,
            type: input.type,
            isPublic: true,
          },
        });
      }
    }

    const existingByName = await client.creator.findUnique({
      where: { normalizedName: input.normalizedName },
    });

    if (existingByName) {
      const slug = await this.reserveSlug(
        client,
        slugifyCreatorName(input.name),
        existingByName.id,
      );
      return client.creator.update({
        where: { id: existingByName.id },
        data: {
          slug,
          name: input.name,
          type: input.type,
          isPublic: true,
        },
      });
    }

    const slug = await this.reserveSlug(client, slugifyCreatorName(input.name));
    return client.creator.create({
      data: {
        slug,
        name: input.name,
        normalizedName: input.normalizedName,
        type: input.type,
        isPublic: true,
      },
    });
  }

  async getCreditsMap(seriesIds: string[]): Promise<Map<string, PublicCreatorCredit[]>> {
    const normalizedSeriesIds = [
      ...new Set(
        seriesIds.map((item) => String(item || "").trim()).filter(Boolean),
      ),
    ];
    const result = new Map<string, PublicCreatorCredit[]>();
    if (normalizedSeriesIds.length === 0) {
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
        rows.filter(
          (row) => row.seriesId === seriesId && row.creator?.isPublic !== false,
        ),
      );
      result.set(seriesId, credits);
    }

    return result;
  }

  async getCreditsForSeries(seriesId: string): Promise<PublicCreatorCredit[]> {
    const map = await this.getCreditsMap([seriesId]);
    return map.get(seriesId) || [];
  }

  async getAdminCreditsForSeries(
    seriesId: string,
  ): Promise<AdminSeriesCreditRecord[]> {
    const normalizedSeriesId = String(seriesId || "").trim();
    if (!normalizedSeriesId) {
      return [];
    }

    const rows = await this.prisma.seriesCredit.findMany({
      where: {
        seriesId: normalizedSeriesId,
      },
      include: {
        creator: true,
      },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return rows
      .filter(
        (row) =>
          row.creator &&
          !isGenericCreatorPlaceholder(row.creator.name),
      )
      .map((row) => ({
        id: row.id,
        creatorId: row.creatorId,
        slug: row.creator.slug,
        name: row.creator.name,
        normalizedName: row.creator.normalizedName,
        type: mapCreatorTypeToPublic(row.creator.type),
        role: String(row.role || "").toLowerCase(),
        source: String(row.source || "").trim(),
        sortOrder: Number(row.sortOrder || 0),
        isPrimary: Boolean(row.isPrimary),
        isPublic: Boolean(row.isPublic),
      }));
  }

  buildIdentity(
    credits: PublicCreatorCredit[],
    fallbackLabel?: unknown,
  ): PublicCreatorIdentity {
    return buildCreatorIdentityFromCredits(credits, fallbackLabel);
  }

  async replaceSeriesCredits(
    seriesId: string,
    inputs: ReplaceSeriesCreditInput[],
  ): Promise<{
    credits: AdminSeriesCreditRecord[];
    publicCredits: PublicCreatorCredit[];
    creator: PublicCreatorIdentity;
    author: string;
  }> {
    const normalizedSeriesId = String(seriesId || "").trim();
    if (!normalizedSeriesId) {
      return {
        credits: [],
        publicCredits: [],
        creator: this.buildIdentity([]),
        author: "",
      };
    }

    const normalizedInputs = this.normalizeReplaceInputs(inputs);

    await this.prisma.$transaction(async (tx) => {
      await tx.seriesCredit.deleteMany({
        where: {
          seriesId: normalizedSeriesId,
        },
      });

      for (const [index, input] of normalizedInputs.entries()) {
        const creator = await this.resolveCreatorForCredit(tx, input);
        await tx.seriesCredit.create({
          data: {
            seriesId: normalizedSeriesId,
            creatorId: creator.id,
            role: input.role,
            source: "admin_credit_editor",
            sortOrder: input.sortOrder ?? index,
            isPrimary: input.isPrimary,
            isPublic: input.isPublic,
          },
        });
      }

      const primaryPublicCredit =
        normalizedInputs.find((entry) => entry.isPrimary && entry.isPublic) ||
        normalizedInputs.find((entry) => entry.isPublic) ||
        null;

      await tx.series.update({
        where: { id: normalizedSeriesId },
        data: {
          author: primaryPublicCredit?.name || "",
        },
      });
    });

    const [credits, publicCredits, series] = await Promise.all([
      this.getAdminCreditsForSeries(normalizedSeriesId),
      this.getCreditsForSeries(normalizedSeriesId),
      this.prisma.series.findUnique({
        where: { id: normalizedSeriesId },
        select: { author: true },
      }),
    ]);
    const author = String(series?.author || "").trim();

    return {
      credits,
      publicCredits,
      creator: this.buildIdentity(publicCredits, author),
      author,
    };
  }

  async syncPrimaryCreditFromAuthorField(seriesId: string, author: unknown): Promise<void> {
    const normalizedSeriesId = String(seriesId || "").trim();
    const normalizedAuthor = normalizeCreatorName(author);
    if (!normalizedSeriesId) {
      return;
    }

    if (!normalizedAuthor || isGenericCreatorPlaceholder(normalizedAuthor)) {
      await this.prisma.seriesCredit.deleteMany({
        where: {
          seriesId: normalizedSeriesId,
          source: "admin_author_input",
        },
      });
      return;
    }

    const hasNonAdminCredits =
      (await this.prisma.seriesCredit.count({
        where: {
          seriesId: normalizedSeriesId,
          isPublic: true,
          source: {
            not: "admin_author_input",
          },
        },
      })) > 0;

    if (hasNonAdminCredits) {
      await this.prisma.seriesCredit.deleteMany({
        where: {
          seriesId: normalizedSeriesId,
          source: "admin_author_input",
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
      const slug = await this.reserveSlug(
        this.prisma,
        slugifyCreatorName(normalizedAuthor),
      );
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
      const slug = await this.reserveSlug(
        this.prisma,
        slugifyCreatorName(normalizedAuthor),
        creator.id,
      );
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
        source: "admin_author_input",
      },
    });

    await this.prisma.seriesCredit.create({
      data: {
        seriesId: normalizedSeriesId,
        creatorId: creator.id,
        role,
        source: "admin_author_input",
        sortOrder: 0,
        isPrimary: true,
        isPublic: true,
      },
    });
  }

  async listPublicCreators(limit = 100, adult = false) {
    const publicSeriesWhere = this.buildPublicSeriesVisibilityWhere(adult);
    const creators = await this.prisma.creator.findMany({
      where: {
        isPublic: true,
        seriesCredits: {
          some: {
            isPublic: true,
            series: publicSeriesWhere,
          },
        },
      },
      orderBy: [{ name: "asc" }],
      take: Math.max(1, limit),
      include: {
        seriesCredits: {
          where: {
            isPublic: true,
            series: publicSeriesWhere,
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

    return filterBlockedPublicCreators(
      creators
      .filter((creator) => !isGenericCreatorPlaceholder(creator.name))
      .map((creator) => {
        const titles = filterBlockedPublicSeries(
          creator.seriesCredits
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
          })),
        );

        return {
          id: creator.id,
          slug: creator.slug,
          name: creator.name,
          type: creator.type.toLowerCase(),
          titleCount: titles.length,
          roles: [
            ...new Set(
              creator.seriesCredits
                .map((credit) => String(credit.role || "").toLowerCase())
                .filter(Boolean),
            ),
          ],
          series: titles,
          spotlightSeries: titles[0] || null,
        };
      })
      .filter((creator) => creator.titleCount > 0),
    );
  }

  async getPublicCreatorBySlug(slug: string, adult = false) {
    const normalizedSlug = String(slug || "").trim();
    if (!normalizedSlug) {
      return null;
    }

    const publicSeriesWhere = this.buildPublicSeriesVisibilityWhere(adult);

    const creator = await this.prisma.creator.findUnique({
      where: { slug: normalizedSlug },
      include: {
        seriesCredits: {
          where: {
            isPublic: true,
            series: publicSeriesWhere,
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

    if (
      !creator ||
      creator.isPublic === false ||
      isGenericCreatorPlaceholder(creator.name) ||
      isBlockedPublicCreatorRecord(creator)
    ) {
      return null;
    }

    const series = filterBlockedPublicSeries(
      creator.seriesCredits.map((credit) => ({
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
      })),
    );

    if (series.length === 0) {
      return null;
    }

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
