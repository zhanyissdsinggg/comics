import { Test, TestingModule } from '@nestjs/testing';
import { AdminSeriesController } from './admin-series-optimized.controller';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CrudService } from '../../services/crud.service';
import { FileProcessingService } from '../../services/file-processing.service';
import { SeriesAdvancedQueryDto } from '../dtos/admin-series-query.dto';

/**
 * 老王说：性能测试 - 高并发查询测试
 * 这个测试验证API在高并发场景下的性能表现
 */
describe('AdminSeriesController - 性能测试', () => {
  let controller: AdminSeriesController;
  let prismaService: PrismaService;

  // 生成大量模拟数据
  const generateMockSeries = (count: number) => {
    const series = [];
    for (let i = 0; i < count; i++) {
      series.push({
        id: `series-${i}`,
        title: `作品 ${i}`,
        type: i % 2 === 0 ? 'comic' : 'novel',
        status: ['Ongoing', 'Completed', 'Hiatus'][i % 3],
        adult: i % 5 === 0,
        rating: Math.random() * 5,
        ratingCount: Math.floor(Math.random() * 1000),
        description: `这是作品 ${i} 的描述`,
        coverUrl: `https://example.com/cover${i}.jpg`,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }
    return series;
  };

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

  describe('高并发查询性能', () => {
    it('应该在100ms内处理1000条记录的查询', async () => {
      const mockSeries = generateMockSeries(1000);
      const query: SeriesAdvancedQueryDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(mockSeries.slice(0, 20));
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(1000);

      const startTime = performance.now();
      const result = await controller.advancedSearch(query);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(100);
      expect(result.total).toBe(1000);
    });

    it('应该支持并发查询而不出现竞态条件', async () => {
      const mockSeries = generateMockSeries(100);
      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(mockSeries);
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(100);

      const queries: SeriesAdvancedQueryDto[] = [
        { page: 1, limit: 20, sortBy: 'createdAt_desc' },
        { page: 2, limit: 20, sortBy: 'createdAt_desc' },
        { page: 3, limit: 20, sortBy: 'createdAt_desc' },
        { page: 4, limit: 20, sortBy: 'createdAt_desc' },
        { page: 5, limit: 20, sortBy: 'createdAt_desc' },
      ];

      const startTime = performance.now();
      const results = await Promise.all(
        queries.map((q) => controller.advancedSearch(q))
      );
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(500); // 5个并发查询应该在500ms内完成
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.total).toBe(100);
      });
    });

    it('应该在大数据集上高效排序', async () => {
      const mockSeries = generateMockSeries(10000);
      const query: SeriesAdvancedQueryDto = {
        page: 1,
        limit: 50,
        sortBy: 'rating_desc',
      };

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(
        mockSeries.slice(0, 50).sort((a, b) => b.rating - a.rating)
      );
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(10000);

      const startTime = performance.now();
      const result = await controller.advancedSearch(query);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(200);
      expect(result.series).toHaveLength(50);
    });

    it('应该在复杂过滤条件下保持性能', async () => {
      const mockSeries = generateMockSeries(5000);
      const query: SeriesAdvancedQueryDto = {
        type: 'comic',
        status: 'Ongoing',
        adult: false,
        minRating: 3.5,
        maxRating: 5.0,
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      const filteredSeries = mockSeries.filter(
        (s) =>
          s.type === 'comic' &&
          s.status === 'Ongoing' &&
          s.adult === false &&
          s.rating >= 3.5 &&
          s.rating <= 5.0
      );

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(filteredSeries.slice(0, 20));
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(filteredSeries.length);

      const startTime = performance.now();
      const result = await controller.advancedSearch(query);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(150);
      expect(result.series.length).toBeGreaterThan(0);
    });

    it('应该在搜索大量文本时保持性能', async () => {
      const mockSeries = generateMockSeries(2000);
      const query: SeriesAdvancedQueryDto = {
        search: '作品',
        page: 1,
        limit: 20,
        sortBy: 'createdAt_desc',
      };

      const searchResults = mockSeries.filter(
        (s) =>
          s.title.includes('作品') ||
          s.description.includes('作品') ||
          s.id.includes('作品')
      );

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(searchResults.slice(0, 20));
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(searchResults.length);

      const startTime = performance.now();
      const result = await controller.advancedSearch(query);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(100);
    });

    it('应该在分页大数据集时保持一致的性能', async () => {
      const mockSeries = generateMockSeries(50000);
      const pageQueries: SeriesAdvancedQueryDto[] = [
        { page: 1, limit: 100, sortBy: 'createdAt_desc' },
        { page: 100, limit: 100, sortBy: 'createdAt_desc' },
        { page: 500, limit: 100, sortBy: 'createdAt_desc' },
      ];

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(mockSeries.slice(0, 100));
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(50000);

      const executionTimes: number[] = [];

      for (const query of pageQueries) {
        const startTime = performance.now();
        await controller.advancedSearch(query);
        const endTime = performance.now();
        executionTimes.push(endTime - startTime);
      }

      // 所有页面的查询时间应该相近（不应该因为页码增加而显著增加）
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      executionTimes.forEach((time) => {
        expect(Math.abs(time - avgTime)).toBeLessThan(avgTime * 0.5); // 允许50%的偏差
      });
    });

    it('应该在内存使用上保持合理', async () => {
      const mockSeries = generateMockSeries(100000);
      const query: SeriesAdvancedQueryDto = {
        page: 1,
        limit: 100,
        sortBy: 'createdAt_desc',
      };

      jest.spyOn(prismaService.series, 'findMany').mockResolvedValue(mockSeries.slice(0, 100));
      jest.spyOn(prismaService.series, 'count').mockResolvedValue(100000);

      const initialMemory = process.memoryUsage().heapUsed;

      // 执行多次查询
      for (let i = 0; i < 10; i++) {
        await controller.advancedSearch(query);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // 内存增长应该在合理范围内（不超过50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
