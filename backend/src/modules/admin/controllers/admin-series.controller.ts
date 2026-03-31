import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { ContentCacheInvalidationService } from "../../../common/cache/content-cache-invalidation.service";
import { logger } from "../../../common/logger/winston.init";
import { CreatorCreditsService } from "../../../common/creators/creator-credits.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminCreatorsService } from "../admin-content/services/admin-creators.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import {
  enrichSeriesWithStorefrontFields,
  syncSeriesAuthorField,
} from "../../../common/utils/series-storefront-fields";

@Controller("admin/series")
@UseGuards(AdminAuthGuard)
export class AdminSeriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentCacheInvalidation: ContentCacheInvalidationService,
    private readonly creatorCreditsService: CreatorCreditsService,
    private readonly adminCreatorsService: AdminCreatorsService,
  ) {}

  private async invalidateReadCaches(seriesId?: string) {
    if (!seriesId) {
      await this.contentCacheInvalidation.invalidateDiscoveryConfiguration(
        "admin-series-list-change",
      );
      return;
    }
    await this.contentCacheInvalidation.invalidateSeriesContent(
      seriesId,
      "admin-series-change",
    );
  }

  private mapSeriesSummary(series: any) {
    if (!series) {
      return series;
    }

    return {
      ...series,
      episodeCount: Number(series?._count?.episodes ?? 0),
    };
  }

  private async enrichSeriesSummaryList(series: any[]) {
    const enrichedSeries = await enrichSeriesWithStorefrontFields(
      this.prisma,
      series.map((item) => this.mapSeriesSummary(item)),
    );
    return this.attachCreatorFields(enrichedSeries);
  }

  private async enrichSeriesSummary(series: any) {
    if (!series) {
      return null;
    }

    const [nextSeries] = await enrichSeriesWithStorefrontFields(this.prisma, [
      this.mapSeriesSummary(series),
    ]);
    const [nextSummary] = await this.attachCreatorFields([
      nextSeries || this.mapSeriesSummary(series),
    ]);
    return nextSummary || nextSeries || this.mapSeriesSummary(series);
  }

  private async attachCreatorFields(seriesList: any[]) {
    const seriesIds = (Array.isArray(seriesList) ? seriesList : [])
      .map((item) => String(item?.id || "").trim())
      .filter(Boolean);
    const creditsMap = await this.creatorCreditsService.getCreditsMap(seriesIds);

    return (Array.isArray(seriesList) ? seriesList : []).map((series) => {
      const credits = creditsMap.get(String(series?.id || "")) || [];
      return {
        ...series,
        creatorCredits: credits,
        creator: this.creatorCreditsService.buildIdentity(credits, series?.author),
      };
    });
  }

  private toSeriesPayload(input: any, existing?: any) {
    const pricing = input?.pricing || {};
    const ttf = input?.ttf || {};
    const genres = Array.isArray(input?.genres)
      ? input.genres
      : existing?.genres || [];
    const badges = Array.isArray(input?.badges)
      ? input.badges
      : input?.badge
        ? [input.badge]
        : existing?.badges || [];

    return {
      id: input.id || existing?.id,
      title: input.title ?? existing?.title ?? "",
      type: input.type ?? existing?.type ?? "comic",
      adult: input.adult ?? existing?.adult ?? false,
      isPublished: input.isPublished ?? existing?.isPublished ?? true,
      genres,
      coverTone: input.coverTone ?? existing?.coverTone ?? "",
      coverUrl: input.coverUrl ?? existing?.coverUrl ?? "",
      badge: input.badge ?? existing?.badge ?? "",
      badges,
      status: input.status ?? existing?.status ?? "Ongoing",
      rating: input.rating ?? existing?.rating ?? 0,
      ratingCount: input.ratingCount ?? existing?.ratingCount ?? 0,
      description: input.description ?? existing?.description ?? "",
      episodePrice:
        pricing.episodePrice ??
        input.episodePrice ??
        existing?.episodePrice ??
        0,
      ttfEnabled:
        ttf.enabled ?? input.ttfEnabled ?? existing?.ttfEnabled ?? false,
      ttfIntervalHours:
        ttf.intervalHours ??
        input.ttfIntervalHours ??
        existing?.ttfIntervalHours ??
        24,
      latestEpisodeId: input.latestEpisodeId ?? existing?.latestEpisodeId ?? "",
    };
  }

  private async applyStorefrontMetadata(seriesId: string, input: any) {
    if (!input || !Object.prototype.hasOwnProperty.call(input, "author")) {
      return;
    }

    await Promise.all([
      syncSeriesAuthorField(this.prisma, seriesId, input?.author),
      this.creatorCreditsService.syncPrimaryCreditFromAuthorField(
        seriesId,
        input?.author,
      ),
    ]);
  }

  @Get()
  async list() {
    const series = await this.prisma.series.findMany({
      orderBy: { title: "asc" },
      include: {
        _count: {
          select: {
            episodes: true,
          },
        },
      },
    });
    return { series: await this.enrichSeriesSummaryList(series) };
  }

  @Get("search/advanced")
  async advancedSearch(@Query() query: Record<string, string>) {
    const page = Math.max(
      1,
      Number.parseInt(String(query?.page || "1"), 10) || 1,
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(query?.limit || "20"), 10) || 20),
    );
    const search = String(query?.search || "").trim();
    const type = String(query?.type || "").trim();
    const status = String(query?.status || "").trim();
    const adult = String(query?.adult || "").trim();
    const publishStatus = String(query?.publishStatus || "").trim();
    const sortBy = String(query?.sortBy || "createdAt_desc").trim();

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }
    if (type && type !== "all") {
      where.type = type;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (adult === "true") {
      where.adult = true;
    } else if (adult === "false") {
      where.adult = false;
    }
    if (publishStatus === "published") {
      where.isPublished = true;
    } else if (publishStatus === "unpublished") {
      where.isPublished = false;
    }

    const [sortField, sortDirectionRaw] = sortBy.split("_");
    const allowedSortFields = new Set([
      "createdAt",
      "updatedAt",
      "title",
      "rating",
      "ratingCount",
    ]);
    const finalSortField = allowedSortFields.has(sortField)
      ? sortField
      : "createdAt";
    const finalSortDirection: "asc" | "desc" =
      sortDirectionRaw === "asc" ? "asc" : "desc";

    const [series, total] = await Promise.all([
      this.prisma.series.findMany({
        where,
        orderBy: { [finalSortField]: finalSortDirection },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              episodes: true,
            },
          },
        },
      }),
      this.prisma.series.count({ where }),
    ]);

    return {
      series: await this.enrichSeriesSummaryList(series),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Post()
  async create(@Body() body: Record<string, any>) {
    const series = body?.series;
    if (!series?.id) {
      throw new BadRequestException("series.id is required.");
    }

    try {
      const created = await this.prisma.series.create({
        data: this.toSeriesPayload(series),
      });
      await this.applyStorefrontMetadata(created.id, series);
      const nextSeries = await this.prisma.series.findUnique({
        where: { id: created.id },
        include: {
          _count: {
            select: {
              episodes: true,
            },
          },
        },
      });
      await this.invalidateReadCaches(created.id);
      return { series: await this.enrichSeriesSummary(nextSeries || created) };
    } catch (error: any) {
      if (error?.code === "P2002") {
        logger.warn(`series id already exists: ${series.id}`);
        throw new ConflictException("Series id already exists.");
      }
      throw error;
    }
  }

  @Get(":id")
  async detail(@Query("key") _key: string, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        _count: {
          select: {
            episodes: true,
          },
        },
      },
    });
    if (!series) {
      throw new NotFoundException("Series not found.");
    }
    return { series: await this.enrichSeriesSummary(series) };
  }

  @Get(":id/credits")
  async detailCredits(@Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const existing = await this.prisma.series.findUnique({
      where: { id: seriesId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Series not found.");
    }

    return await this.adminCreatorsService.getSeriesCredits(seriesId);
  }

  @Patch(":id")
  async update(@Body() body: Record<string, any>, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const series = body?.series || {};
    const existing = await this.prisma.series.findUnique({
      where: { id: seriesId },
    });
    if (!existing) {
      throw new NotFoundException("Series not found.");
    }

    const updated = await this.prisma.series.update({
      where: { id: seriesId },
      data: this.toSeriesPayload({ ...series, id: seriesId }, existing),
    });
    await this.applyStorefrontMetadata(seriesId, series);
    const nextSeries = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        _count: {
          select: {
            episodes: true,
          },
        },
      },
    });
    await this.invalidateReadCaches(seriesId);
    return { series: await this.enrichSeriesSummary(nextSeries || updated) };
  }

  @Patch(":id/credits")
  async updateCredits(@Body() body: Record<string, any>, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const existing = await this.prisma.series.findUnique({
      where: { id: seriesId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Series not found.");
    }

    const credits = Array.isArray(body?.credits) ? body.credits : [];
    return await this.adminCreatorsService.updateSeriesCredits(seriesId, credits);
  }

  @Delete(":id")
  async remove(@Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const existing = await this.prisma.series.findUnique({
      where: { id: seriesId },
    });
    if (!existing) {
      throw new NotFoundException("Series not found.");
    }

    await this.prisma.episode.deleteMany({ where: { seriesId } });
    await this.prisma.series.delete({ where: { id: seriesId } });
    await this.invalidateReadCaches(seriesId);
    return { ok: true };
  }
}
