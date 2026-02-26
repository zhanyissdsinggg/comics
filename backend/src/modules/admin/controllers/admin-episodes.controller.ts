import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
  Req,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";

/**
 * 剧集管理Controller - 处理Episodes的CRUD操作
 */
@Controller("admin/series/:id/episodes")
@UseGuards(AdminAuthGuard)
export class AdminEpisodesController {
  private readonly logger = new Logger(AdminEpisodesController.name);

  constructor(private readonly prisma: PrismaService) {}

  private async syncLatest(seriesId: string) {
    const latest = await this.prisma.episode.findFirst({
      where: { seriesId },
      orderBy: { number: "desc" },
    });
    if (latest) {
      await this.prisma.series.update({
        where: { id: seriesId },
        data: { latestEpisodeId: latest.id },
      });
      this.logger.log(`Synced latest episode for series ${seriesId}: ${latest.id}`);
    }
  }

  @Get()
  async listEpisodes(@Req() req: Request) {
    const seriesId = String(req.params.id || "");
    this.logger.log(`Listing episodes for series: ${seriesId}`);

    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "asc" },
    });

    return { episodes };
  }

  @Post()
  async createEpisode(@Body() body: any, @Req() req: Request) {
    const seriesId = String(req.params.id || "");

    // 批量创建
    if (body?.bulk) {
      const count = Number(body.bulk.count || 0);
      const pricePts = Number(body.bulk.pricePts || 0);

      if (count <= 0 || count > 100) {
        throw new BadRequestException("批量创建数量必须在1-100之间");
      }

      this.logger.log(`Bulk creating ${count} episodes for series: ${seriesId}`);

      const existing = await this.prisma.episode.findMany({
        where: { seriesId },
        orderBy: { number: "desc" },
        take: 1,
      });

      const start = existing[0]?.number || 0;
      const list = Array.from({ length: count }, (_, index) => {
        const number = start + index + 1;
        return {
          id: `${seriesId}e${number}`,
          seriesId,
          number,
          title: `Episode ${number}`,
          releasedAt: new Date(),
          pricePts,
          ttfEligible: true,
          previewFreePages: 0,
        };
      });

      await this.prisma.episode.createMany({ data: list });
      await this.syncLatest(seriesId);

      const episodes = await this.prisma.episode.findMany({
        where: { seriesId },
        orderBy: { number: "asc" },
      });

      this.logger.log(`Successfully created ${count} episodes for series: ${seriesId}`);
      return { episodes };
    }

    // 单个创建
    if (!body?.episode) {
      throw new BadRequestException("缺少episode参数");
    }

    const episode = body.episode;
    const payload = {
      id: episode.id || `${seriesId}e${episode.number || Date.now()}`,
      seriesId,
      number: Number(episode.number || 1),
      title: episode.title || `Episode ${episode.number || 1}`,
      releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : new Date(),
      pricePts: Number(episode.pricePts || 0),
      ttfEligible: Boolean(episode.ttfEligible),
      ttfReadyAt: episode.ttfReadyAt ? new Date(episode.ttfReadyAt) : null,
      previewFreePages: Number(episode.previewFreePages || 0),
      pages: episode.pages || null,
      paragraphs: episode.paragraphs || null,
      text: episode.text || null,
    };

    this.logger.log(`Creating/updating episode: ${payload.id}`);

    await this.prisma.episode.upsert({
      where: { id: payload.id },
      update: payload as any,
      create: payload as any,
    });

    await this.syncLatest(seriesId);

    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "asc" },
    });

    return { episodes };
  }

  @Post("bulk")
  async bulkUpdateEpisodes(@Body() body: any, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const updates = body?.updates || {};
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    this.logger.log(`Bulk updating episodes for series: ${seriesId}, count: ${ids.length || 'all'}`);

    const list = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "asc" },
    });

    const intervalHours = Number(body?.intervalHours || 24);
    const updatedList = list.map((episode) => {
      if (ids.length > 0 && !ids.includes(episode.id)) {
        return episode;
      }
      const merged: any = { ...episode, ...updates };
      if (updates?.generateTtfReadyAt) {
        const base = new Date(episode.releasedAt).getTime();
        merged.ttfReadyAt = new Date(base + intervalHours * 3600 * 1000);
      }
      return merged;
    });

    await Promise.all(
      updatedList.map((episode) =>
        this.prisma.episode.update({
          where: { id: episode.id },
          data: {
            title: episode.title,
            releasedAt: episode.releasedAt,
            pricePts: episode.pricePts,
            ttfEligible: episode.ttfEligible,
            ttfReadyAt: episode.ttfReadyAt,
            previewFreePages: episode.previewFreePages,
          },
        })
      )
    );

    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "asc" },
    });

    this.logger.log(`Successfully bulk updated episodes for series: ${seriesId}`);
    return { episodes };
  }

  @Patch(":episodeId")
  async updateEpisode(@Body() body: any, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const episodeId = String(req.params.episodeId || "");
    const episode = body?.episode || {};

    this.logger.log(`Updating episode: ${episodeId}`);

    const payload = {
      id: episodeId,
      seriesId,
      number: Number(episode.number || 1),
      title: episode.title || `Episode ${episode.number || 1}`,
      releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : new Date(),
      pricePts: Number(episode.pricePts || 0),
      ttfEligible: Boolean(episode.ttfEligible),
      ttfReadyAt: episode.ttfReadyAt ? new Date(episode.ttfReadyAt) : null,
      previewFreePages: Number(episode.previewFreePages || 0),
      pages: episode.pages || null,
      paragraphs: episode.paragraphs || null,
      text: episode.text || null,
    };

    const updated = await this.prisma.episode.update({
      where: { id: episodeId },
      data: payload,
    });

    await this.syncLatest(seriesId);

    this.logger.log(`Successfully updated episode: ${episodeId}`);
    return { episode: updated };
  }

  @Delete(":episodeId")
  async removeEpisode(@Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const episodeId = String(req.params.episodeId || "");

    this.logger.log(`Deleting episode: ${episodeId}`);

    await this.prisma.episode.deleteMany({ where: { id: episodeId, seriesId } });
    await this.syncLatest(seriesId);

    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "asc" },
    });

    this.logger.log(`Successfully deleted episode: ${episodeId}`);
    return { episodes };
  }
}
