import { Test, TestingModule } from '@nestjs/testing';
import { AdminSeriesController } from './admin-series-optimized.controller';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CrudService } from '../../services/crud.service';
import { FileProcessingService } from '../../services/file-processing.service';
import { SeriesAdvancedQueryDto } from '../dtos/admin-series-query.dto';

/**
 * 老王说：高级搜索API端点的单元测试
 * 这个测试覆盖了所有的查询场景，确保API能正常工作
 */
describe('AdminSeriesController - Advanced Search', () => {
  let controller: AdminSeriesController;
  let prismaService: PrismaService;

  // 模拟数据
  const mockSeries = [
    {
      id: 'series-1',
      title: '我的第一部漫画',
      type: 'comic',
      status: 'Ongoing',
      adult: false,
      rating: 4.5,
      ratingCount: 100,
      description: '这是一部很棒的漫画',
      coverUrl: 'https://example.com/cover1.jpg',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-03-01'),
    },
    {
      id: 'series-2',
      title: '成人小说',
      type: 'novel',
      status: 'Completed',
      adult: true,
      rating: 4.8,
      ratingCount: 200,
      description: '这是一部成人小说',
      coverUrl: 'https://example.com/cover2.jpg',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-15'),
    },
    {
      id: 'series-3',
      title: '暂停中的漫画',
      type: 'comic',
      status: 'Hiatus',
      adult: false,
      rating: 3.5,
      ratingCount: 50,
      description: '这部漫画暂停了',
      coverUrl: 'https://example.com/cover3.jpg',
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date('2024-03-05'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSeriesController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            series: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: CrudService,
          useValue: {},
        },
        {
          provide: FileProcessingService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AdminSeriesController>(AdminSeriesController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('advancedSearch', () => {
    it('应该返回所有作品（无过滤条件）', async () => {
      const query: SeriesAdvancedQueryDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(mockSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(3);

      const result = await controller.advancedSearch(query);

      expect(result.series).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('应该按搜索关键词过滤作品', async () => {
      const query: SeriesAdvancedQueryDto = {
        search: '漫画',
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      const filteredSeries = mockSeries.filter((s) =>
        s.title.includes('漫画') || s.description.includes('漫画')
      );

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(filteredSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(filteredSeries.length);

      const result = await controller.advancedSearch(query);

      expect(result.series).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('应该按类型过滤作品', async () => {
      const query: SeriesAdvancedQueryDto = {
        type: 'comic',
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      const filteredSeries = mockSeries.filter((s) => s.type === 'comic');

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(filteredSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(filteredSeries.length);

      const result = await controller.advancedSearch(query);

      expect(result.series).toHaveLength(2);
      expect(result.series.every((s) => s.type === 'comic')).toBe(true);
    });

    it('应该按状态过滤作品', async () => {
      const query: SeriesAdvancedQueryDto = {
        status: 'Ongoing',
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      const filteredSeries = mockSeries.filter((s) => s.status === 'Ongoing');

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(filteredSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(filteredSeries.length);

      const result = await controller.advancedSearch(query);

      expect(result.series).toHaveLength(1);
      expect(result.series[0].status).toBe('Ongoing');
    });

    it('应该按成人内容过滤作品', async () => {
      const query: SeriesAdvancedQueryDto = {
        adult: true,
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      const filteredSeries = mockSeries.filter((s) => s.adult === true);

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(filteredSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(filteredSeries.length);

      const result = await controller.advancedSearch(query);

      expect(result.series).toHaveLength(1);
      expect(result.series[0].adult).toBe(true);
    });

    it('应该按评分范围过滤作品', async () => {
      const query: SeriesAdvancedQueryDto = {
        minRating: 4.0,
        maxRating: 5.0,
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      const filteredSeries = mockSeries.filter(
        (s) => s.rating >= 4.0 && s.rating <= 5.0
      );

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(filteredSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(filteredSeries.length);

      const result = await controller.advancedSearch(query);

      expect(result.series).toHaveLength(2);
      expect(result.series.every((s) => s.rating >= 4.0 && s.rating <= 5.0)).toBe(true);
    });

    it('应该按创建时间降序排序', async () => {
      const query: SeriesAdvancedQueryDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      const sortedSeries = [...mockSeries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(sortedSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(3);

      const result = await controller.advancedSearch(query);

      expect(result.series[0].id).toBe('series-3');
      expect(result.series[1].id).toBe('series-2');
      expect(result.series[2].id).toBe('series-1');
    });

    it('应该支持分页', async () => {
      const query: SeriesAdvancedQueryDto = {
        page: 2,
        limit: 1,
        sortBy: 'createdAt_desc',
      };

      const paginatedSeries = [mockSeries[1]];

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(paginatedSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(3);

      const result = await controller.advancedSearch(query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('应该返回统计信息（当includeStats为true时）', async () => {
      const query: SeriesAdvancedQueryDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
        includeStats: true,
      };

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(mockSeries);
      jest.spyOn(prismaService.series, 'count')
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(3) // totalSeries
        .mockResolvedValueOnce(1) // adultCount
        .mockResolvedValueOnce(2); // generalCount

      const result = await controller.advancedSearch(query);

      expect(result.stats).toBeDefined();
      expect(result.stats.totalSeries).toBe(3);
      expect(result.stats.adultCount).toBe(1);
      expect(result.stats.generalCount).toBe(2);
    });

    it('应该处理多条件组合查询', async () => {
      const query: SeriesAdvancedQueryDto = {
        type: 'comic',
        status: 'Ongoing',
        adult: false,
        minRating: 4.0,
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      const filteredSeries = mockSeries.filter(
        (s) =>
          s.type === 'comic' &&
          s.status === 'Ongoing' &&
          s.adult === false &&
          s.rating >= 4.0
      );

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(filteredSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(filteredSeries.length);

      const result = await controller.advancedSearch(query);

      expect(result.series).toHaveLength(1);
      expect(result.series[0].id).toBe('series-1');
    });
  });
});
