import { Injectable } from "@nestjs/common";
import { ContentCacheInvalidationService } from "../../../../common/cache/content-cache-invalidation.service";
import {
  CreatorCreditsService,
  type ReplaceSeriesCreditInput,
} from "../../../../common/creators/creator-credits.service";
import {
  inferCreatorTypeFromName,
  isGenericCreatorPlaceholder,
  normalizeCreatorName,
  slugifyCreatorName,
} from "../../../../common/creators/creator-identity";
import { PrismaService } from "../../../../common/prisma/prisma.service";

type AuditSeriesItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  adult: boolean;
  isPublished: boolean;
  coverUrl: string;
  description: string;
  genres: string[];
  updatedAt: Date | null;
  episodeCount: number;
  author: string;
  creatorCredits: Awaited<
    ReturnType<CreatorCreditsService["getCreditsForSeries"]>
  >;
  creatorSource: "normalized" | "legacy_author" | "missing";
};

function buildCreatorPath(slug: string): string {
  const normalizedSlug = slugifyCreatorName(slug);
  return normalizedSlug ? `/creators/${encodeURIComponent(normalizedSlug)}` : "/creators";
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function hasText(value: unknown): boolean {
  return String(value || "").trim().length > 0;
}

function normalizeIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

function getSeriesMetadataReadiness(series: AuditSeriesItem) {
  return {
    hasCover: hasText(series.coverUrl),
    hasDescription: hasText(series.description),
    hasGenres: Array.isArray(series.genres) && series.genres.length > 0,
    hasEpisodes: toNumber(series.episodeCount) > 0,
  };
}

function getSeriesMetadataScore(series: AuditSeriesItem) {
  let score = 0;

  if (series.isPublished) {
    score += 6;
  }
  if (hasText(series.coverUrl)) {
    score += 4;
  }
  if (hasText(series.description)) {
    score += 3;
  }
  if ((Array.isArray(series.genres) ? series.genres : []).length > 0) {
    score += 2;
  }
  score += Math.min(toNumber(series.episodeCount), 5);

  return score;
}

function sortSeriesByPriority(items: AuditSeriesItem[]) {
  return [...items].sort((left, right) => {
    if (Boolean(left?.isPublished) !== Boolean(right?.isPublished)) {
      return left?.isPublished ? -1 : 1;
    }

    const metadataDelta = getSeriesMetadataScore(right) - getSeriesMetadataScore(left);
    if (metadataDelta !== 0) {
      return metadataDelta;
    }

    const updatedDelta =
      Date.parse(String(right?.updatedAt || 0)) - Date.parse(String(left?.updatedAt || 0));
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return String(left?.title || "").localeCompare(String(right?.title || ""));
  });
}

@Injectable()
export class AdminCreatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorCreditsService: CreatorCreditsService,
    private readonly contentCacheInvalidation: ContentCacheInvalidationService,
  ) {}

  private buildFallbackIdentity(series: { author: string }) {
    const author = normalizeCreatorName(series.author);
    if (!author || isGenericCreatorPlaceholder(author)) {
      return null;
    }

    const slug = slugifyCreatorName(author);
    const type = inferCreatorTypeFromName(author);
    return {
      label: author,
      slug,
      path: buildCreatorPath(slug),
      type,
    };
  }

  async getSeriesCredits(seriesId: string) {
    const normalizedSeriesId = String(seriesId || "").trim();
    if (!normalizedSeriesId) {
      return {
        credits: [],
        creator: this.creatorCreditsService.buildIdentity([]),
        author: "",
      };
    }

    const [series, credits, publicCredits] = await Promise.all([
      this.prisma.series.findUnique({
        where: { id: normalizedSeriesId },
        select: { author: true },
      }),
      this.creatorCreditsService.getAdminCreditsForSeries(normalizedSeriesId),
      this.creatorCreditsService.getCreditsForSeries(normalizedSeriesId),
    ]);

    const author = String(series?.author || "").trim();
    return {
      credits,
      creator: this.creatorCreditsService.buildIdentity(publicCredits, author),
      author,
    };
  }

  async updateSeriesCredits(seriesId: string, credits: ReplaceSeriesCreditInput[]) {
    const normalizedSeriesId = String(seriesId || "").trim();
    await this.prisma.series.findUniqueOrThrow({
      where: { id: normalizedSeriesId },
      select: { id: true },
    });

    const nextState = await this.creatorCreditsService.replaceSeriesCredits(
      normalizedSeriesId,
      credits,
    );

    await this.contentCacheInvalidation.invalidateSeriesContent(
      normalizedSeriesId,
      "admin-series-credit-change",
    );

    return nextState;
  }

  async getAudit() {
    const series = await this.prisma.series.findMany({
      orderBy: [{ title: "asc" }],
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        adult: true,
        isPublished: true,
        coverUrl: true,
        description: true,
        genres: true,
        updatedAt: true,
        author: true,
        _count: {
          select: {
            episodes: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
    });

    const creditsMap = await this.creatorCreditsService.getCreditsMap(
      series.map((item) => item.id),
    );

    const structuredCreatorsMap = new Map<
      string,
      {
        slug: string;
        name: string;
        path: string;
        type: "person" | "team" | "studio";
        titleCount: number;
        publishedCount: number;
        unpublishedCount: number;
        completedCount: number;
        adultCount: number;
        coverReadyCount: number;
        descriptionReadyCount: number;
        genreReadyCount: number;
        episodicCount: number;
        latestUpdatedAt: string | null;
        spotlightSeries: AuditSeriesItem | null;
        topGenres: string[];
        variants: Set<string>;
        series: AuditSeriesItem[];
        structuredSeriesCount: number;
        legacyAuthorOnlyCount: number;
      }
    >();

    const legacyAuthorOnlySeries: AuditSeriesItem[] = [];
    const missingAuthorSeries: AuditSeriesItem[] = [];

    for (const item of series) {
      const creatorCredits = creditsMap.get(item.id) || [];
      const structuredIdentity = this.creatorCreditsService.buildIdentity(
        creatorCredits,
      );
      const fallbackIdentity = this.buildFallbackIdentity({ author: item.author || "" });

      const normalizedSeries = {
        id: item.id,
        title: item.title,
        type: String(item.type || "comic"),
        status: String(item.status || "Ongoing"),
        adult: Boolean(item.adult),
        isPublished: Boolean(item.isPublished),
        coverUrl: String(item.coverUrl || ""),
        description: String(item.description || ""),
        genres: Array.isArray(item.genres) ? item.genres.filter(Boolean) : [],
        updatedAt: item.updatedAt || null,
        episodeCount: toNumber(item?._count?.episodes),
        author: String(item.author || ""),
        creatorCredits,
        creatorSource:
          creatorCredits.length > 0 && !structuredIdentity.isFallback
            ? "normalized"
            : fallbackIdentity
              ? "legacy_author"
              : "missing",
      } satisfies AuditSeriesItem;

      if (normalizedSeries.creatorSource === "missing") {
        missingAuthorSeries.push(normalizedSeries);
        continue;
      }

      if (normalizedSeries.creatorSource === "legacy_author") {
        legacyAuthorOnlySeries.push(normalizedSeries);
        continue;
      }

      const primaryCredit = creatorCredits[0];
      if (!primaryCredit?.name || !primaryCredit?.slug) {
        missingAuthorSeries.push({ ...normalizedSeries, creatorSource: "missing" });
        continue;
      }

      const slug = primaryCredit.slug;
      const current = structuredCreatorsMap.get(slug) || {
        slug,
        name: primaryCredit.name,
        path: buildCreatorPath(slug),
        type: primaryCredit.type,
        titleCount: 0,
        publishedCount: 0,
        unpublishedCount: 0,
        completedCount: 0,
        adultCount: 0,
        coverReadyCount: 0,
        descriptionReadyCount: 0,
        genreReadyCount: 0,
        episodicCount: 0,
        latestUpdatedAt: null,
        spotlightSeries: null,
        topGenres: [],
        variants: new Set<string>(),
        series: [],
        structuredSeriesCount: 0,
        legacyAuthorOnlyCount: 0,
      };

      current.titleCount += 1;
      current.structuredSeriesCount += 1;
      current.series.push(normalizedSeries);

      if (normalizedSeries.isPublished) {
        current.publishedCount += 1;
      } else {
        current.unpublishedCount += 1;
      }

      if (normalizedSeries.status.toLowerCase() === "completed") {
        current.completedCount += 1;
      }

      if (normalizedSeries.adult) {
        current.adultCount += 1;
      }

      const readiness = getSeriesMetadataReadiness(normalizedSeries);
      if (readiness.hasCover) {
        current.coverReadyCount += 1;
      }
      if (readiness.hasDescription) {
        current.descriptionReadyCount += 1;
      }
      if (readiness.hasGenres) {
        current.genreReadyCount += 1;
      }
      if (readiness.hasEpisodes) {
        current.episodicCount += 1;
      }

      const updatedAt = normalizeIsoDate(normalizedSeries.updatedAt);
      if (
        updatedAt &&
        (!current.latestUpdatedAt ||
          Date.parse(updatedAt) > Date.parse(current.latestUpdatedAt))
      ) {
        current.latestUpdatedAt = updatedAt;
      }

      current.variants.add(primaryCredit.name);
      const authorAlias = normalizeCreatorName(normalizedSeries.author);
      if (
        authorAlias &&
        !isGenericCreatorPlaceholder(authorAlias) &&
        authorAlias.toLowerCase() !== primaryCredit.name.toLowerCase()
      ) {
        current.variants.add(authorAlias);
      }

      structuredCreatorsMap.set(slug, current);
    }

    const creators = Array.from(structuredCreatorsMap.values())
      .map((creator) => {
        const sortedSeries = sortSeriesByPriority(creator.series);
        const genreCounts = new Map<string, number>();

        sortedSeries.forEach((seriesItem) => {
          seriesItem.genres.forEach((genre) => {
            const key = String(genre || "").trim();
            if (!key) {
              return;
            }
            genreCounts.set(key, (genreCounts.get(key) || 0) + 1);
          });
        });

        return {
          ...creator,
          spotlightSeries: sortedSeries[0] || null,
          metadataCoverageScore:
            creator.titleCount > 0
              ? Math.round(
                  ((creator.publishedCount +
                    creator.coverReadyCount +
                    creator.descriptionReadyCount +
                    creator.genreReadyCount) /
                    (creator.titleCount * 4)) *
                    100,
                )
              : 0,
          readySeriesCount: sortedSeries.filter((seriesItem) => {
            const readiness = getSeriesMetadataReadiness(seriesItem);
            return (
              Boolean(seriesItem.isPublished) &&
              readiness.hasCover &&
              readiness.hasDescription &&
              readiness.hasGenres
            );
          }).length,
          topGenres: Array.from(genreCounts.entries())
            .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
            .map(([genre]) => genre)
            .slice(0, 3),
          variants: Array.from(creator.variants).sort((left, right) =>
            left.localeCompare(right),
          ),
          hasNamingRisk: creator.variants.size > 1,
          series: sortedSeries,
        };
      })
      .sort((left, right) => {
        if (right.hasNamingRisk !== left.hasNamingRisk) {
          return right.hasNamingRisk ? 1 : -1;
        }

        if (right.titleCount !== left.titleCount) {
          return right.titleCount - left.titleCount;
        }

        if (right.metadataCoverageScore !== left.metadataCoverageScore) {
          return right.metadataCoverageScore - left.metadataCoverageScore;
        }

        const updatedDelta =
          Date.parse(right.latestUpdatedAt || "0") -
          Date.parse(left.latestUpdatedAt || "0");
        if (updatedDelta !== 0) {
          return updatedDelta;
        }

        return left.name.localeCompare(right.name);
      });

    const structuredSeriesCount = creators.reduce(
      (sum, creator) => sum + creator.titleCount,
      0,
    );
    const sortedMissingCreators = sortSeriesByPriority(missingAuthorSeries);
    const sortedLegacyAuthorOnlySeries = sortSeriesByPriority(
      legacyAuthorOnlySeries,
    );

    return {
      creators,
      missingAuthorSeries: sortedMissingCreators,
      legacyAuthorOnlySeries: sortedLegacyAuthorOnlySeries,
      namingRiskCreators: creators.filter((creator) => creator.hasNamingRisk),
      stats: {
        totalSeries: series.length,
        creatorCount: creators.length,
        attributedSeriesCount: structuredSeriesCount,
        structuredCreatorSeriesCount: structuredSeriesCount,
        legacyAuthorOnlySeriesCount: sortedLegacyAuthorOnlySeries.length,
        missingAuthorSeriesCount: sortedMissingCreators.length,
        namingRiskCreatorCount: creators.filter((creator) => creator.hasNamingRisk).length,
        unpublishedSeriesCount: series.filter((item) => !item.isPublished).length,
      },
    };
  }
}
