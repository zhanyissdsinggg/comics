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
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { Request, Response } from "express";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import AdmZip from "adm-zip";
import { PrismaService } from "../../common/prisma/prisma.service";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

function extractNumber(name: string) {
  const match = name.match(/(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function sortByName(a: string, b: string) {
  const aNum = extractNumber(a);
  const bNum = extractNumber(b);
  if (aNum !== bNum) {
    return aNum - bNum;
  }
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

function toChapterTitle(filename: string) {
  return filename.replace(/\.zip$/i, "").trim();
}

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
    }
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
    const created = await this.prisma.series.create({ data: payload });
    return { series: created };
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

  @Get(":id/episodes")
  async listEpisodes(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = String(req.params.id || "");
    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "asc" },
    });
    return { episodes };
  }

  @Post(":id/episodes")
  async createEpisode(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = String(req.params.id || "");
    if (body?.bulk) {
      const count = Number(body.bulk.count || 0);
      const pricePts = Number(body.bulk.pricePts || 0);
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
      return { episodes };
    }
    if (!body?.episode) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
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

  @Post(":id/episodes/bulk")
  async bulkUpdateEpisodes(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = String(req.params.id || "");
    const updates = body?.updates || {};
    const ids = Array.isArray(body?.ids) ? body.ids : [];
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
    return { episodes };
  }

  @Post(":id/episodes/upload")
  @UseInterceptors(
    FilesInterceptor("files", 50, {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    })
  )
  async uploadEpisodes(
    @UploadedFiles() files: any[],
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = String(req.params.id || "");
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) {
      res.status(404);
      return buildError(ERROR_CODES.NOT_FOUND);
    }
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }

    const type = body?.type || series.type || "comic";
    const sortedFiles = [...files].sort((a, b) =>
      sortByName(a.originalname, b.originalname)
    );
    const existing = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "desc" },
      take: 1,
    });
    const maxNumber = existing[0]?.number || 0;
    const startNumber = Number(body?.startNumber || body?.episodeNumber || 0);
    let currentNumber = startNumber > 0 ? startNumber - 1 : maxNumber;
    const created = [];

    for (const file of sortedFiles) {
      currentNumber += 1;
      const chapterTitle = toChapterTitle(file.originalname);
      const zip = new AdmZip(file.buffer);
      const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
      entries.sort((a, b) => sortByName(a.entryName, b.entryName));

      if (type === "novel") {
        const textParts = entries
          .filter((entry) => entry.entryName.toLowerCase().endsWith(".txt"))
          .map((entry) => entry.getData().toString("utf8"));
        const combined = textParts.join("\n");
        const paragraphs = combined
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        const episode = {
          id: `${seriesId}e${currentNumber}`,
          number: currentNumber,
          title: chapterTitle || `Episode ${currentNumber}`,
          releasedAt: new Date().toISOString(),
          pricePts: Number(series?.episodePrice || 0),
          ttfEligible: Boolean(series?.ttfEnabled),
          previewFreePages: 0,
          paragraphs,
        };
        await this.prisma.episode.upsert({
          where: { id: episode.id },
          update: episode as any,
          create: episode as any,
        });
        created.push(episode);
      } else {
        const imageEntries = entries.filter((entry) =>
          /\.(png|jpe?g|webp)$/i.test(entry.entryName)
        );
        const pages = (imageEntries.length ? imageEntries : entries).map((entry, index) => ({
          url: `https://placehold.co/800x1200?text=${encodeURIComponent(
            `${chapterTitle || "Episode"}-${index + 1}`
          )}`,
          w: 800,
          h: 1200,
        }));
        const episode = {
          id: `${seriesId}e${currentNumber}`,
          number: currentNumber,
          title: chapterTitle || `Episode ${currentNumber}`,
          releasedAt: new Date().toISOString(),
          pricePts: Number(series?.episodePrice || 0),
          ttfEligible: Boolean(series?.ttfEnabled),
          previewFreePages: 0,
          pages,
        };
        await this.prisma.episode.upsert({
          where: { id: episode.id },
          update: episode as any,
          create: episode as any,
        });
        created.push(episode);
      }
    }

    await this.syncLatest(seriesId);
    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "asc" },
    });
    return { episodes, created: created.length };
  }

  @Patch(":id/episodes/:episodeId")
  async updateEpisode(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = String(req.params.id || "");
    const episodeId = String(req.params.episodeId || "");
    const episode = body?.episode || {};
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
    return { episode: updated };
  }

  @Delete(":id/episodes/:episodeId")
  async removeEpisode(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const seriesId = String(req.params.id || "");
    const episodeId = String(req.params.episodeId || "");
    await this.prisma.episode.deleteMany({ where: { id: episodeId, seriesId } });
    await this.syncLatest(seriesId);
    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "asc" },
    });
    return { episodes };
  }
}
