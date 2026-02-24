import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { isAdminAuthorized } from "../../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../../common/utils/errors";

/**
 * 作品管理Controller - 处理Series的CRUD操作
 */
@Controller("admin/series")
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
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const series = await this.prisma.series.findMany({ orderBy: { title: "asc" } });
    return { series };
  }

  @Post()
  async create(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const series = body?.series;
    if (!series?.id) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const payload = this.toSeriesPayload(series);

    try {
      const created = await this.prisma.series.create({ data: payload });
      return { series: created };
    } catch (error) {
      // 老王新增：处理Prisma唯一约束错误（重复ID）
      if (error.code === 'P2002') {
        console.warn(`[AdminSeriesController] 作品ID重复: ${series.id}`);
        res.status(409);
        return buildError('DUPLICATE_ID', { message: '作品ID已存在，请使用其他ID' });
      }
      // 其他错误继续抛出
      throw error;
    }
  }

  @Get(":id")
  async detail(@Query("key") _key: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = String(req.params.id || "");
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }
    return { series };
  }

  @Patch(":id")
  async update(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = String(req.params.id || "");
    const series = body?.series || {};
    const existing = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!existing) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }
    const payload = this.toSeriesPayload({ ...series, id: seriesId }, existing);
    const updated = await this.prisma.series.update({
      where: { id: seriesId },
      data: payload,
    });
    return { series: updated };
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = String(req.params.id || "");
    await this.prisma.episode.deleteMany({ where: { seriesId } });
    await this.prisma.series.deleteMany({ where: { id: seriesId } });
    return { ok: true };
  }
}
