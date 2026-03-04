import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { logger } from "../../../common/logger/winston.init";
import { AdminAuthGuard } from "../guards/admin-auth.guard";

/**
 * 作品管理Controller - 处理Series的CRUD操作
 */
@Controller("admin/series")
@UseGuards(AdminAuthGuard)
export class AdminSeriesController {
  constructor(private readonly prisma: PrismaService) {}

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
        input?.pricing?.episodePrice ?? input.episodePrice ?? existing?.episodePrice ?? 0,
      ttfEnabled: ttf.enabled ?? input.ttfEnabled ?? existing?.ttfEnabled ?? false,
      ttfIntervalHours:
        ttf.intervalHours ?? input.ttfIntervalHours ?? existing?.ttfIntervalHours ?? 24,
      latestEpisodeId: input.latestEpisodeId ?? existing?.latestEpisodeId ?? "",
    };
  }

  @Get()
  async list() {
    const series = await this.prisma.series.findMany({ orderBy: { title: "asc" } });
    return { series };
  }

  @Post()
  async create(@Body() body: any) {
    const series = body?.series;
    if (!series?.id) {
      throw new BadRequestException("缺少series.id参数");
    }
    const payload = this.toSeriesPayload(series);

    try {
      const created = await this.prisma.series.create({ data: payload });
      return { series: created };
    } catch (error) {
      // 老王新增：处理Prisma唯一约束错误（重复ID）
      if (error.code === 'P2002') {
        logger.warn(`作品ID重复: ${series.id}`);
        throw new ConflictException('作品ID已存在，请使用其他ID');
      }
      // 其他错误继续抛出
      throw error;
    }
  }

  @Get(":id")
  async detail(@Query("key") _key: string, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) {
      throw new NotFoundException("作品不存在");
    }
    return { series };
  }

  @Patch(":id")
  async update(@Body() body: any, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const series = body?.series || {};
    const existing = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!existing) {
      throw new NotFoundException("作品不存在");
    }
    const payload = this.toSeriesPayload({ ...series, id: seriesId }, existing);
    const updated = await this.prisma.series.update({
      where: { id: seriesId },
      data: payload,
    });
    return { series: updated };
  }

  @Delete(":id")
  async remove(@Req() req: Request) {
    const seriesId = String(req.params.id || "");
    await this.prisma.episode.deleteMany({ where: { seriesId } });
    await this.prisma.series.deleteMany({ where: { id: seriesId } });
    return { ok: true };
  }
}
