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
  NotFoundException,
} from "@nestjs/common";
import type { Episode, Prisma } from "@prisma/client";
import type { Request } from "express";
import { CacheService } from "../../../common/cache/cache.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { readBooleanLike, readDateLike, readIntLike } from "../utils/param-parsing";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const EPISODE_SORT_FIELDS = new Set([
  "number",
  "title",
  "pricePts",
  "previewFreePages",
  "releasedAt",
  "createdAt",
  "updatedAt",
]);

type EpisodeInput = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getEpisodeInput(body: Record<string, unknown>): EpisodeInput | null {
  if (isRecord(body.episode)) {
    return body.episode;
  }

  const keys = Object.keys(body).filter((key) => key !== "bulk");
  return keys.length > 0 ? body : null;
}

function readEpisodeDate(value: unknown, fallback: Date | null): Date | null {
  if (value === undefined) {
    return fallback;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const parsed = readDateLike(value as Date | string | null | undefined);
  return parsed ?? fallback;
}

function readEpisodeJson(
  value: unknown,
  fallback: Prisma.InputJsonValue,
): Prisma.InputJsonValue {
  if (value === undefined) {
    return fallback;
  }
  if (value === null) {
    return [];
  }
  return value as Prisma.InputJsonValue;
}

function readEpisodeParagraphs(value: unknown, fallback: string[]): string[] {
  if (value === undefined) {
    return fallback;
  }
  if (value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeEpisodeSortField(value: unknown): keyof Prisma.EpisodeOrderByWithRelationInput {
  const candidate = String(value ?? "").trim();
  return EPISODE_SORT_FIELDS.has(candidate) ? (candidate as keyof Prisma.EpisodeOrderByWithRelationInput) : "number";
}

function normalizeEpisodeSortOrder(value: unknown): Prisma.SortOrder {
  return String(value ?? "").trim().toLowerCase() === "desc" ? "desc" : "asc";
}

function readQueryPrimitive(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return readQueryPrimitive(value[0]);
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

interface EpisodeDraft {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  releasedAt: Date | null;
  pricePts: number;
  ttfEligible: boolean;
  ttfReadyAt: Date | null;
  previewFreePages: number;
  pages: Prisma.InputJsonValue;
  paragraphs: string[];
  text: string | null;
}

function buildEpisodeDraft(seriesId: string, input: EpisodeInput, existing?: Episode | null): EpisodeDraft {
  const fallbackNumber = existing?.number ?? 1;
  const number =
    input.number !== undefined
      ? readIntLike(input.number as number | string | null | undefined, fallbackNumber, 1)
      : fallbackNumber;

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : existing?.id ?? `${seriesId}e${number}`,
    seriesId,
    number,
    title:
      input.title !== undefined
        ? String(input.title)
        : existing?.title ?? `Episode ${number}`,
    releasedAt: readEpisodeDate(input.releasedAt, existing?.releasedAt ?? new Date()),
    pricePts:
      input.pricePts !== undefined
        ? readIntLike(input.pricePts as number | string | null | undefined, existing?.pricePts ?? 0, 0)
        : existing?.pricePts ?? 0,
    ttfEligible:
      input.ttfEligible !== undefined
        ? readBooleanLike(input.ttfEligible as boolean | string | null | undefined, existing?.ttfEligible ?? false)
        : existing?.ttfEligible ?? false,
    ttfReadyAt: readEpisodeDate(input.ttfReadyAt, existing?.ttfReadyAt ?? null),
    previewFreePages:
      input.previewFreePages !== undefined
        ? readIntLike(
            input.previewFreePages as number | string | null | undefined,
            existing?.previewFreePages ?? 0,
            0,
          )
        : existing?.previewFreePages ?? 0,
    pages: readEpisodeJson(input.pages, (existing?.pages as Prisma.InputJsonValue | undefined) ?? []),
    paragraphs: readEpisodeParagraphs(input.paragraphs, existing?.paragraphs ?? []),
    text:
      input.text !== undefined
        ? input.text === null
          ? null
          : String(input.text)
        : existing?.text ?? null,
  };
}

function toEpisodeCreateData(draft: EpisodeDraft): Prisma.EpisodeUncheckedCreateInput {
  return {
    id: draft.id,
    seriesId: draft.seriesId,
    number: draft.number,
    title: draft.title,
    releasedAt: draft.releasedAt,
    pricePts: draft.pricePts,
    ttfEligible: draft.ttfEligible,
    ttfReadyAt: draft.ttfReadyAt,
    previewFreePages: draft.previewFreePages,
    pages: draft.pages,
    paragraphs: draft.paragraphs,
    text: draft.text,
  };
}

function toEpisodeUpdateData(draft: EpisodeDraft): Prisma.EpisodeUncheckedUpdateInput {
  return {
    seriesId: draft.seriesId,
    number: draft.number,
    title: draft.title,
    releasedAt: draft.releasedAt,
    pricePts: draft.pricePts,
    ttfEligible: draft.ttfEligible,
    ttfReadyAt: draft.ttfReadyAt,
    previewFreePages: draft.previewFreePages,
    pages: draft.pages,
    paragraphs: draft.paragraphs,
    text: draft.text,
  };
}

@Controller("admin/series/:id/episodes")
@UseGuards(AdminAuthGuard)
export class AdminEpisodesController {
  private readonly logger = new Logger(AdminEpisodesController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

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
      where: { seriesId, isDeleted: false },
      orderBy: { number: "desc" },
    });
    await this.prisma.series.update({
      where: { id: seriesId },
      data: { latestEpisodeId: latest?.id ?? null },
    });
    this.logger.log(`Synced latest episode for series ${seriesId}: ${latest?.id ?? "none"}`);
  }

  @Get()
  async listEpisodes(@Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const search = String(readQueryPrimitive(req.query.search) || "").trim();
    const page = Math.max(1, readIntLike(readQueryPrimitive(req.query.page), 1, 1));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        readIntLike(readQueryPrimitive(req.query.pageSize) ?? readQueryPrimitive(req.query.limit), DEFAULT_PAGE_SIZE, 1),
      ),
    );
    const sortBy = normalizeEpisodeSortField(readQueryPrimitive(req.query.sortBy));
    const sortOrder = normalizeEpisodeSortOrder(readQueryPrimitive(req.query.sortOrder));
    const priceType = String(readQueryPrimitive(req.query.priceType) || "").trim();
    const previewStatus = String(readQueryPrimitive(req.query.previewStatus) || "").trim();
    const ttfEligibleFilter = String(readQueryPrimitive(req.query.ttfEligible) || "").trim();

    this.logger.log(`Listing episodes for series: ${seriesId}`);

    const where: Prisma.EpisodeWhereInput = {
      seriesId,
      isDeleted: false,
    };

    if (search) {
      const searchNumber = Number.parseInt(search, 10);
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        ...(Number.isFinite(searchNumber) ? [{ number: searchNumber }] : []),
      ];
    }

    if (priceType === "free") {
      where.pricePts = 0;
    } else if (priceType === "paid") {
      where.pricePts = { gt: 0 };
    }

    if (previewStatus === "enabled") {
      where.previewFreePages = { gt: 0 };
    } else if (previewStatus === "disabled") {
      where.previewFreePages = 0;
    }

    if (ttfEligibleFilter === "true") {
      where.ttfEligible = true;
    } else if (ttfEligibleFilter === "false") {
      where.ttfEligible = false;
    }

    const [episodes, total] = await Promise.all([
      this.prisma.episode.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.episode.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      episodes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  @Post()
  async createEpisode(@Body() body: Record<string, unknown>, @Req() req: Request) {
    const seriesId = String(req.params.id || "");

    if (isRecord(body.bulk)) {
      const count = readIntLike(body.bulk.count as number | string | null | undefined, 0, 0, 100);
      const pricePts = readIntLike(body.bulk.pricePts as number | string | null | undefined, 0, 0);

      if (count <= 0 || count > 100) {
        throw new BadRequestException("批量创建数量必须在 1-100 之间");
      }

      this.logger.log(`Bulk creating ${count} episodes for series: ${seriesId}`);

      const existing = await this.prisma.episode.findMany({
        where: { seriesId, isDeleted: false },
        orderBy: { number: "desc" },
        take: 1,
      });

      const start = existing[0]?.number ?? 0;
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
        where: { seriesId, isDeleted: false },
        orderBy: { number: "asc" },
      });

      this.logger.log(`Successfully created ${count} episodes for series: ${seriesId}`);
      await this.invalidateReadCaches(seriesId);
      return { episodes };
    }

    const episodeInput = getEpisodeInput(body);
    if (!episodeInput) {
      throw new BadRequestException("缺少 episode 参数");
    }

    const seedDraft = buildEpisodeDraft(seriesId, episodeInput);
    const existing = await this.prisma.episode.findUnique({ where: { id: seedDraft.id } });
    const draft = buildEpisodeDraft(seriesId, episodeInput, existing);

    this.logger.log(`Creating/updating episode: ${draft.id}`);

    await this.prisma.episode.upsert({
      where: { id: draft.id },
      update: toEpisodeUpdateData(draft),
      create: toEpisodeCreateData(draft),
    });

    await this.syncLatest(seriesId);

    const episodes = await this.prisma.episode.findMany({
      where: { seriesId, isDeleted: false },
      orderBy: { number: "asc" },
    });

    await this.invalidateReadCaches(seriesId);
    return { episodes };
  }

  @Post("bulk")
  async bulkUpdateEpisodes(@Body() body: Record<string, unknown>, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const updates = isRecord(body.updates) ? body.updates : {};
    const ids = Array.isArray(body.ids) ? body.ids : [];

    this.logger.log(`Bulk updating episodes for series: ${seriesId}, count: ${ids.length || "all"}`);

    const list = await this.prisma.episode.findMany({
      where: { seriesId, isDeleted: false },
      orderBy: { number: "asc" },
    });

    const intervalHours = readIntLike(body.intervalHours as number | string | null | undefined, 24, 1);
    const updatedList = list.map((episode) => {
      if (ids.length > 0 && !ids.includes(episode.id)) {
        return buildEpisodeDraft(seriesId, {}, episode);
      }
      const draft = buildEpisodeDraft(seriesId, updates, episode);
      if (updates.generateTtfReadyAt) {
        const base = new Date(episode.releasedAt ?? new Date()).getTime();
        draft.ttfReadyAt = new Date(base + intervalHours * 3600 * 1000);
      }
      return draft;
    });

    await Promise.all(
      updatedList.map((episode) =>
        this.prisma.episode.update({
          where: { id: episode.id },
          data: toEpisodeUpdateData(episode),
        })
      )
    );

    const episodes = await this.prisma.episode.findMany({
      where: { seriesId, isDeleted: false },
      orderBy: { number: "asc" },
    });

    this.logger.log(`Successfully bulk updated episodes for series: ${seriesId}`);
    await this.invalidateReadCaches(seriesId);
    return { episodes };
  }

  @Post("reorder")
  async reorderEpisodes(@Body() body: Record<string, unknown>, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const compact = readBooleanLike(body.compact as boolean | string | null | undefined, false);
    const startNumber = readIntLike(body.startNumber as number | string | null | undefined, 1, 1);

    if (compact) {
      const existingEpisodes = await this.prisma.episode.findMany({
        where: { seriesId, isDeleted: false },
        orderBy: { number: "asc" },
      });

      await this.prisma.$transaction(async (tx) => {
        await Promise.all(
          existingEpisodes.map((episode, index) =>
            tx.episode.update({
              where: { id: episode.id },
              data: { number: -1 * (index + 1) },
            }),
          ),
        );
        await Promise.all(
          existingEpisodes.map((episode, index) =>
            tx.episode.update({
              where: { id: episode.id },
              data: { number: startNumber + index },
            }),
          ),
        );
      });

      await this.syncLatest(seriesId);

      const episodes = await this.prisma.episode.findMany({
        where: { seriesId, isDeleted: false },
        orderBy: { number: "asc" },
      });

      await this.invalidateReadCaches(seriesId);
      return { episodes };
    }

    const items = Array.isArray(body.items) ? body.items.filter(isRecord) : [];

    if (items.length === 0) {
      throw new BadRequestException("缺少要重排的章节。");
    }

    const normalizedItems = items.map((item) => ({
      id: typeof item.id === "string" ? item.id.trim() : "",
      number: readIntLike(item.number as number | string | null | undefined, 0, 1),
    }));

    if (normalizedItems.some((item) => !item.id || item.number < 1)) {
      throw new BadRequestException("章节重排参数无效。");
    }

    const idSet = new Set(normalizedItems.map((item) => item.id));
    const numberSet = new Set(normalizedItems.map((item) => item.number));

    if (idSet.size !== normalizedItems.length || numberSet.size !== normalizedItems.length) {
      throw new BadRequestException("章节编号或章节 ID 重复。");
    }

    const existing = await this.prisma.episode.findMany({
      where: {
        seriesId,
        isDeleted: false,
        id: { in: normalizedItems.map((item) => item.id) },
      },
    });

    if (existing.length !== normalizedItems.length) {
      throw new NotFoundException("部分章节不存在。");
    }

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        normalizedItems.map((item, index) =>
          tx.episode.update({
            where: { id: item.id },
            data: { number: -1 * (index + 1) },
          }),
        ),
      );
      await Promise.all(
        normalizedItems.map((item) =>
          tx.episode.update({
            where: { id: item.id },
            data: { number: item.number },
          }),
        ),
      );
    });

    await this.syncLatest(seriesId);

    const episodes = await this.prisma.episode.findMany({
      where: { seriesId, isDeleted: false },
      orderBy: { number: "asc" },
    });

    await this.invalidateReadCaches(seriesId);
    return { episodes };
  }

  @Patch(":episodeId")
  async updateEpisode(@Body() body: Record<string, unknown>, @Req() req: Request) {
    const seriesId = String(req.params.id || "");
    const episodeId = String(req.params.episodeId || "");
    const episodeInput = getEpisodeInput(body) ?? {};

    this.logger.log(`Updating episode: ${episodeId}`);

    const existing = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!existing || existing.seriesId !== seriesId) {
      throw new NotFoundException("Episode not found.");
    }

    const draft = buildEpisodeDraft(seriesId, { ...episodeInput, id: episodeId }, existing);

    const updated = await this.prisma.episode.update({
      where: { id: episodeId },
      data: toEpisodeUpdateData(draft),
    });

    await this.syncLatest(seriesId);

    this.logger.log(`Successfully updated episode: ${episodeId}`);
    await this.invalidateReadCaches(seriesId);
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
      where: { seriesId, isDeleted: false },
      orderBy: { number: "asc" },
    });

    this.logger.log(`Successfully deleted episode: ${episodeId}`);
    await this.invalidateReadCaches(seriesId);
    return { episodes };
  }
}

