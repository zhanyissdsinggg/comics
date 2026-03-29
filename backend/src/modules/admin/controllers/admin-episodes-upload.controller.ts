import {
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import type { Request } from "express";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import AdmZip = require("adm-zip");
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { extname, join } from "path";
import { CacheService } from "../../../common/cache/cache.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { buildPublicAssetUrl } from "../../../common/utils/public-asset-url";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { readIntLike } from "../utils/param-parsing";

const episodeUploadsDir = join(process.cwd(), "public", "uploads", "episodes");

function ensureDirectory(directory: string) {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

function sanitizePathSegment(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
  const collapsed = normalized.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return collapsed || "episode";
}

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

function createEpisodeAssetPath(seriesId: string, chapterTitle: string, index: number, entryName: string): string {
  const safeSeriesId = sanitizePathSegment(seriesId);
  const safeChapter = sanitizePathSegment(chapterTitle || "episode");
  const extension = extname(entryName).toLowerCase() || ".bin";
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const fileName = `${safeChapter}-${String(index + 1).padStart(2, "0")}-${Date.now()}-${randomSuffix}${extension}`;
  const seriesDirectory = join(episodeUploadsDir, safeSeriesId);
  ensureDirectory(seriesDirectory);
  return join(seriesDirectory, fileName);
}

@Controller("admin/series/:id/episodes")
@UseGuards(AdminAuthGuard)
export class AdminEpisodesUploadController {
  private readonly logger = new Logger(AdminEpisodesUploadController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    ensureDirectory(episodeUploadsDir);
  }

  private async invalidateReadCaches(seriesId: string) {
    await this.cacheService.deletePatterns([
      `series:detail:${seriesId}`,
      `episode:detail:${seriesId}:*`,
      "series:list:*",
      "search:*",
      "rankings:*",
      "creators:*",
      "recommendations:*",
    ]);
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
      this.logger.log(`Synced latest episode for series ${seriesId}: ${latest.id}`);
    }
  }

  @Post("upload")
  @UseInterceptors(
    FilesInterceptor("files", 50, {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadEpisodes(@UploadedFiles() files: Array<{ originalname: string; buffer: Buffer }>, @Req() req: Request) {
    const seriesId = String(req.params.id || "");

    this.logger.log(`Starting episode upload for series: ${seriesId}, files: ${files?.length || 0}`);

    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) {
      throw new NotFoundException("作品不存在");
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException("请至少上传一个文件");
    }

    if (files.length > 50) {
      throw new BadRequestException("单次最多上传 50 个文件");
    }

    const requestedType = String(req.body?.type ?? series.type ?? "comic").trim().toLowerCase();
    if (requestedType !== "comic" && requestedType !== "novel") {
      throw new BadRequestException("Invalid episode type.");
    }

    const type = requestedType;
    const sortedFiles = [...files].sort((a, b) => sortByName(a.originalname, b.originalname));

    const existing = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "desc" },
      take: 1,
    });

    const maxNumber = existing[0]?.number ?? 0;
    const startNumber = readIntLike(req.body?.startNumber ?? req.body?.episodeNumber, 0, 0);
    let currentNumber = startNumber > 0 ? startNumber - 1 : maxNumber;
    const created: Array<{ id: string; number: number }> = [];

    for (const file of sortedFiles) {
      currentNumber += 1;
      const chapterTitle = toChapterTitle(file.originalname);

      try {
        const zip = new AdmZip(file.buffer);
        const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
        entries.sort((a, b) => sortByName(a.entryName, b.entryName));

        if (type === "novel") {
          const textEntries = entries.filter((entry) => entry.entryName.toLowerCase().endsWith(".txt"));
          if (textEntries.length === 0) {
            throw new BadRequestException(`No text files found in ${file.originalname}.`);
          }

          const textParts = textEntries.map((entry) => entry.getData().toString("utf8"));
          const combined = textParts.join("\n").trim();
          const paragraphs = combined
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

          if (paragraphs.length === 0) {
            throw new BadRequestException(`No readable text content found in ${file.originalname}.`);
          }

          const episode = {
            id: `${seriesId}e${currentNumber}`,
            seriesId,
            number: currentNumber,
            title: chapterTitle || `Episode ${currentNumber}`,
            releasedAt: new Date(),
            pricePts: Number(series.episodePrice ?? 0),
            ttfEligible: Boolean(series.ttfEnabled),
            previewFreePages: 0,
            paragraphs,
            text: combined,
          };

          await this.prisma.episode.upsert({
            where: { id: episode.id },
            update: episode,
            create: episode,
          });

          created.push({ id: episode.id, number: episode.number });
          this.logger.log(`Created novel episode: ${episode.id}, paragraphs: ${paragraphs.length}`);
          continue;
        }

        const imageEntries = entries.filter((entry) => /\.(png|jpe?g|webp|gif)$/i.test(entry.entryName));
        if (imageEntries.length === 0) {
          throw new BadRequestException(`No image files found in ${file.originalname}.`);
        }

        const pages = imageEntries.map((entry, index) => {
          const absolutePath = createEpisodeAssetPath(seriesId, chapterTitle || `episode-${currentNumber}`, index, entry.entryName);
          writeFileSync(absolutePath, entry.getData());

          const relativePath = absolutePath
            .replace(join(process.cwd(), "public"), "")
            .replace(/\\/g, "/");

          return {
            url: buildPublicAssetUrl(req, relativePath),
            w: 800,
            h: 1200,
          };
        });

        const episode = {
          id: `${seriesId}e${currentNumber}`,
          seriesId,
          number: currentNumber,
          title: chapterTitle || `Episode ${currentNumber}`,
          releasedAt: new Date(),
          pricePts: Number(series.episodePrice ?? 0),
          ttfEligible: Boolean(series.ttfEnabled),
          previewFreePages: 0,
          pages,
        };

        await this.prisma.episode.upsert({
          where: { id: episode.id },
          update: episode,
          create: episode,
        });

        created.push({ id: episode.id, number: episode.number });
        this.logger.log(`Created comic episode: ${episode.id}, pages: ${pages.length}`);
      } catch (error) {
        this.logger.error(`Failed to process file ${file.originalname}:`, error as Error);
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(`处理文件失败: ${file.originalname}`);
      }
    }

    await this.syncLatest(seriesId);

    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: { number: "asc" },
    });

    this.logger.log(`Successfully uploaded ${created.length} episodes for series: ${seriesId}`);
    await this.invalidateReadCaches(seriesId);
    return { episodes, created: created.length };
  }
}
