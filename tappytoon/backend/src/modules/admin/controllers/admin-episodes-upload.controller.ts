import {
  Controller,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { Request, Response } from "express";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import AdmZip from "adm-zip";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { isAdminAuthorized } from "../../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../../common/utils/errors";

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

/**
 * 剧集上传Controller - 处理批量文件上传和解析
 */
@Controller("admin/series/:id/episodes")
export class AdminEpisodesUploadController {
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
    }
  }

  @Post("upload")
  @UseInterceptors(
    FilesInterceptor("files", 50, {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    })
  )
  async uploadEpisodes(
    @UploadedFiles() files: any[],
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
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
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }

    const type = req.body?.type || series.type || "comic";
    const sortedFiles = [...files].sort((a, b) =>
      sortByName(a.originalname, b.originalname)
    );
    const existing = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "desc" },
      take: 1,
    });
    const maxNumber = existing[0]?.number || 0;
    const startNumber = Number(req.body?.startNumber || req.body?.episodeNumber || 0);
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
}
