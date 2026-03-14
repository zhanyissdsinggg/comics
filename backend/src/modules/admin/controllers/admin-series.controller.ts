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
import { logger } from "../../../common/logger/winston.init";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";

@Controller("admin/series")
@UseGuards(AdminAuthGuard)
export class AdminSeriesController {
  constructor(private readonly prisma: PrismaService) {}

  private mapSeriesSummary(series: any) {
    if (!series) {
      return series;
    }

    return {
      ...series,
      episodeCount: Number(series?._count?.episodes ?? 0),
    };
  }

  private toSeriesPayload(input: any, existing?: any) {
    const pricing = input?.pricing || {};
    const ttf = input?.ttf || {};
    const genres = Array.isArray(input?.genres) ? input.genres : existing?.genres || [];
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
      episodePrice: pricing.episodePrice ?? input.episodePrice ?? existing?.episodePrice ?? 0,
      ttfEnabled: ttf.enabled ?? input.ttfEnabled ?? existing?.ttfEnabled ?? false,
      ttfIntervalHours: ttf.intervalHours ?? input.ttfIntervalHours ?? existing?.ttfIntervalHours ?? 24,
      latestEpisodeId: input.latestEpisodeId ?? existing?.latestEpisodeId ?? "",
    };
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
    return { series: series.map((item) => this.mapSeriesSummary(item)) };
  }

  @Get("search/advanced")
  async advancedSearch(@Query() query: Record<string, string>) {
    const page = Math.max(1, Number.parseInt(String(query?.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(query?.limit || "20"), 10) || 20));
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
    const allowedSortFields = new Set(["createdAt", "updatedAt", "title", "rating", "ratingCount"]);
    const finalSortField = allowedSortFields.has(sortField) ? sortField : "createdAt";
    const finalSortDirection: "asc" | "desc" = sortDirectionRaw === "asc" ? "asc" : "desc";

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
      series: series.map((item) => this.mapSeriesSummary(item)),
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
      const created = await this.prisma.series.create({ data: this.toSeriesPayload(series) });
      return { series: created };
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
    return { series: this.mapSeriesSummary(series) };
  }

  @Patch(":id")
  async update(@Body() body: Record<string, any>, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const series = body?.series || {};
    const existing = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!existing) {
      throw new NotFoundException("Series not found.");
    }

    const updated = await this.prisma.series.update({
      where: { id: seriesId },
      data: this.toSeriesPayload({ ...series, id: seriesId }, existing),
    });
    return { series: updated };
  }

  @Delete(":id")
  async remove(@Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const existing = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!existing) {
      throw new NotFoundException("Series not found.");
    }

    await this.prisma.episode.deleteMany({ where: { seriesId } });
    await this.prisma.series.delete({ where: { id: seriesId } });
    return { ok: true };
  }
}
