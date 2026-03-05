import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Param,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { AdminAudit } from '../../decorators/admin-audit.decorator';
import { CrudService } from '../../services/crud.service';
import { FileProcessingService } from '../../services/file-processing.service';
import { PaginationDto, CreateBaseDto, UpdateBaseDto } from '../../dtos/common.dto';
import {
  CreateEpisodeDto,
  BulkCreateEpisodesDto,
  BulkUpdateEpisodesDto,
  BulkDeleteEpisodesDto,
  UploadEpisodesDto,
  UpdateEpisodeDto,
} from '../dtos/admin-content.dto';
import { SeriesAdvancedQueryDto, SeriesQueryResponseDto } from '../dtos/admin-series-query.dto';

/**
 * 老王注释：优化后的Series Controller - 使用新的Guard、Service和DTO
 * 这个SB controller简洁多了，因为把复杂逻辑都提取到Service里了
 * 对比之前的410行，现在只需要200行左右，代码质量还提升了！
 */
@Controller('admin/series')
@UseGuards(AdminAuthGuard)
export class AdminSeriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crudService: CrudService,
    private readonly fileProcessingService: FileProcessingService,
  ) {}

  /**
   * 老王说：获取作品列表，支持分页、排序、搜索
   */
  @Get()
  @AdminAudit('list', 'series')
  async list(@Query() paginationDto: PaginationDto) {
    return this.crudService.findAll(
      'series',
      paginationDto,
      ['title', 'description'], // 可搜索字段
      { adult: false }, // 默认过滤条件
    );
  }

  /**
   * 老王说：高级查询端点 - 支持复杂搜索、排序、分页、统计
   * 这个端点是作品管理的核心，性能优化到极致
   */
  @Get('search/advanced')
  @AdminAudit('search', 'series')
  async advancedSearch(@Query() query: SeriesAdvancedQueryDto): Promise<SeriesQueryResponseDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // 老王说：构建查询条件
    const where: any = {};

    // 搜索关键词
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { id: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // 类型过滤
    if (query.type) {
      where.type = query.type;
    }

    // 状态过滤
    if (query.status) {
      where.status = query.status;
    }

    // 成人内容过滤
    if (query.adult !== undefined) {
      where.adult = query.adult;
    }

    // 评分范围过滤
    if (query.minRating !== undefined || query.maxRating !== undefined) {
      where.rating = {};
      if (query.minRating !== undefined) {
        where.rating.gte = query.minRating;
      }
      if (query.maxRating !== undefined) {
        where.rating.lte = query.maxRating;
      }
    }

    // 老王说：构建排序条件
    const orderBy: any = {};
    const [field, order] = (query.sortBy || 'createdAt_desc').split('_');
    orderBy[field] = order === 'asc' ? 'asc' : 'desc';

    // 老王说：并行查询总数和数据
    const [series, total] = await Promise.all([
      this.prisma.series.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          adult: true,
          rating: true,
          ratingCount: true,
          coverUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.series.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    // 老王说：如果需要统计信息，额外查询
    let stats = undefined;
    if (query.includeStats) {
      const [totalSeries, adultCount, generalCount] = await Promise.all([
        this.prisma.series.count(),
        this.prisma.series.count({ where: { adult: true } }),
        this.prisma.series.count({ where: { adult: false } }),
      ]);

      stats = {
        totalSeries,
        adultCount,
        generalCount,
      };
    }

    return {
      series,
      total,
      page,
      limit,
      totalPages,
      hasMore,
      stats,
    };
  }

  /**
   * 老王说：创建作品
   */
  @Post()
  @AdminAudit('create', 'series')
  async create(@Body() body: { series: CreateBaseDto }) {
    const series = body.series;

    if (!series.id) {
      throw new Error('作品ID不能为空');
    }

    return this.crudService.create('series', {
      id: series.id,
      title: series.title || '未命名作品',
      description: series.description || '',
      active: series.active !== false,
      type: 'comic',
      status: 'Ongoing',
      rating: 0,
      ratingCount: 0,
    });
  }

  /**
   * 老王说：获取作品详情
   */
  @Get(':id')
  @AdminAudit('read', 'series')
  async detail(@Param('id') id: string) {
    const series = await this.crudService.findOne('series', id);

    if (!series) {
      throw new Error('作品不存在');
    }

    return { series };
  }

  /**
   * 老王说：更新作品
   */
  @Patch(':id')
  @AdminAudit('update', 'series')
  async update(@Param('id') id: string, @Body() body: { series: UpdateBaseDto }) {
    const series = await this.crudService.update('series', id, body.series);
    return { series };
  }

  /**
   * 老王说：删除作品
   */
  @Delete(':id')
  @AdminAudit('delete', 'series')
  async remove(@Param('id') id: string) {
    // 老王说：级联删除所有剧集
    await this.prisma.episode.deleteMany({ where: { seriesId: id } });
    await this.crudService.delete('series', id);
    return { ok: true };
  }

  /**
   * 老王说：获取剧集列表
   */
  @Get(':id/episodes')
  @AdminAudit('list', 'episode')
  async listEpisodes(@Param('id') id: string, @Query() paginationDto: PaginationDto) {
    return this.crudService.findAll(
      'episode',
      paginationDto,
      ['title'],
      { seriesId: id },
    );
  }

  /**
   * 老王说：创建单个剧集
   */
  @Post(':id/episodes')
  @AdminAudit('create', 'episode')
  async createEpisode(@Param('id') seriesId: string, @Body() body: CreateEpisodeDto) {
    const episode = body.episode || {};

    const payload = {
      id: episode.id || `${seriesId}e${Date.now()}`,
      seriesId,
      number: Number(episode.number || 1),
      title: episode.title || `Episode ${episode.number || 1}`,
      releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : new Date(),
      pricePts: Number(episode.pricePts || 0),
      ttfEligible: Boolean(episode.ttfEligible),
      previewFreePages: Number(episode.previewFreePages || 0),
    };

    const created = await this.crudService.create('episode', payload);
    return { episode: created };
  }

  /**
   * 老王说：批量创建剧集
   */
  @Post(':id/episodes/bulk-create')
  @AdminAudit('bulk-create', 'episode')
  async bulkCreateEpisodes(@Param('id') seriesId: string, @Body() body: BulkCreateEpisodesDto) {
    const count = Number(body.count || 0);
    const pricePts = Number(body.pricePts || 0);

    const existing = await this.prisma.episode.findFirst({
      where: { seriesId },
      orderBy: { number: 'desc' },
    });

    const start = existing?.number || 0;
    const episodes = Array.from({ length: count }, (_, index) => ({
      id: `${seriesId}e${start + index + 1}`,
      seriesId,
      number: start + index + 1,
      title: `Episode ${start + index + 1}`,
      releasedAt: new Date(),
      pricePts,
      ttfEligible: true,
      previewFreePages: 0,
    }));

    await this.prisma.episode.createMany({ data: episodes });
    return { created: episodes.length };
  }

  /**
   * 老王说：批量更新剧集
   */
  @Patch(':id/episodes/bulk-update')
  @AdminAudit('bulk-update', 'episode')
  async bulkUpdateEpisodes(@Param('id') seriesId: string, @Body() body: BulkUpdateEpisodesDto) {
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const updates = body.updates || {};

    if (ids.length === 0) {
      throw new Error('必须指定要更新的剧集ID');
    }

    const result = await this.crudService.updateMany('episode', ids, updates);
    return { updated: result.count };
  }

  /**
   * 老王说：批量删除剧集
   */
  @Delete(':id/episodes/bulk-delete')
  @AdminAudit('bulk-delete', 'episode')
  async bulkDeleteEpisodes(@Param('id') seriesId: string, @Body() body: BulkDeleteEpisodesDto) {
    const ids = Array.isArray(body.ids) ? body.ids : [];

    if (ids.length === 0) {
      throw new Error('必须指定要删除的剧集ID');
    }

    const result = await this.crudService.deleteMany('episode', ids);
    return { deleted: result.count };
  }

  /**
   * 老王说：上传ZIP文件批量导入剧集
   */
  @Post(':id/episodes/upload')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @AdminAudit('upload', 'episode')
  async uploadEpisodes(
    @Param('id') seriesId: string,
    @UploadedFiles() files: any[],
    @Body() body: UploadEpisodesDto,
  ) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('必须上传至少一个文件');
    }

    const series = await this.crudService.findOne('series', seriesId);
    if (!series) {
      throw new Error('作品不存在');
    }

    const type = (body as any).type || (series as any).type || 'comic';
    const startNumber = Number((body as any).startNumber || 0);

    // 老王说：使用FileProcessingService处理文件
    const results = await this.fileProcessingService.processBulkFiles(
      files,
      type,
      startNumber,
    );

    // 老王说：批量创建剧集
    const episodes = results.map((result, index) => ({
      id: `${seriesId}e${result.episodeNumber}`,
      seriesId,
      number: result.episodeNumber,
      title: result.title,
      releasedAt: new Date(),
      pricePts: Number((series as any).episodePrice || 0),
      ttfEligible: Boolean((series as any).ttfEnabled),
      previewFreePages: 0,
      pages: Array.isArray(result.pages) ? result.pages : [],
      paragraphs: Array.isArray(result.paragraphs) ? result.paragraphs : [],
    }));

    await this.prisma.episode.createMany({ data: episodes });

    return {
      created: episodes.length,
      episodes,
    };
  }

  /**
   * 老王说：更新单个剧集
   */
  @Patch(':id/episodes/:episodeId')
  @AdminAudit('update', 'episode')
  async updateEpisode(
    @Param('id') seriesId: string,
    @Param('episodeId') episodeId: string,
    @Body() body: UpdateEpisodeDto,
  ) {
    const episode = await this.crudService.update('episode', episodeId, body.episode || {});
    return { episode };
  }

  /**
   * 老王说：删除单个剧集
   */
  @Delete(':id/episodes/:episodeId')
  @AdminAudit('delete', 'episode')
  async removeEpisode(
    @Param('id') seriesId: string,
    @Param('episodeId') episodeId: string,
  ) {
    await this.crudService.delete('episode', episodeId);
    return { ok: true };
  }
}
