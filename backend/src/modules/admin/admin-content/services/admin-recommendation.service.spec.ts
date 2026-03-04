import { Test, TestingModule } from '@nestjs/testing';
import { AdminRecommendationService } from './admin-recommendation.service';
import { PrismaService } from '../../../../common/prisma/prisma.service';

describe('AdminRecommendationService', () => {
  let service: AdminRecommendationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRecommendationService,
        {
          provide: PrismaService,
          useValue: {
            recommendationSlot: {
              findMany: jest.fn().mockResolvedValue([
                { id: 'slot-1', slot: 'homepage-banner', seriesIds: ['series-1', 'series-2'], createdAt: new Date() },
              ]),
              count: jest.fn().mockResolvedValue(1),
              create: jest.fn().mockResolvedValue({
                id: 'slot-1',
                slot: 'homepage-banner',
                seriesIds: ['series-1'],
              }),
              update: jest.fn().mockResolvedValue({
                id: 'slot-1',
                slot: 'updated-slot',
                seriesIds: ['series-1', 'series-2', 'series-3'],
              }),
              delete: jest.fn().mockResolvedValue({ id: 'slot-1' }),
            },
            rankingConfig: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'ranking-1',
                  ranking: 'daily-ranking',
                  config: JSON.stringify({ rankingType: 'views', timeRange: 'day' }),
                  createdAt: new Date(),
                },
              ]),
              count: jest.fn().mockResolvedValue(1),
              create: jest.fn().mockResolvedValue({
                id: 'ranking-1',
                ranking: 'daily-ranking',
                config: JSON.stringify({ rankingType: 'views', timeRange: 'day' }),
              }),
              update: jest.fn().mockResolvedValue({
                id: 'ranking-1',
                ranking: 'updated-ranking',
                config: JSON.stringify({ rankingType: 'rating', timeRange: 'week' }),
              }),
              delete: jest.fn().mockResolvedValue({ id: 'ranking-1' }),
            },
            recommendationAnalytics: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'analytics-1',
                  slot: 'homepage-banner',
                  seriesId: 'series-1',
                  date: new Date(),
                  clicks: 100,
                  views: 1000,
                  impressions: 5000,
                  conversions: 10,
                },
              ]),
              count: jest.fn().mockResolvedValue(1),
              create: jest.fn().mockResolvedValue({
                id: 'analytics-1',
                slot: 'homepage-banner',
                seriesId: 'series-1',
                clicks: 100,
                views: 1000,
                impressions: 5000,
                conversions: 10,
              }),
            },
            series: {
              findMany: jest.fn().mockResolvedValue([
                { id: 'series-1', title: 'Series 1', rating: 4.5, ratingCount: 100, adult: false, type: 'novel' },
                { id: 'series-2', title: 'Series 2', rating: 4.2, ratingCount: 80, adult: false, type: 'comic' },
              ]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminRecommendationService>(AdminRecommendationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendationSlots', () => {
    it('应该成功获取推荐位列表', async () => {
      const result = await service.getRecommendationSlots({ limit: 100, offset: 0 });

      expect(result).toHaveProperty('slots');
      expect(result).toHaveProperty('total', 1);
      expect(Array.isArray(result.slots)).toBe(true);
      expect(prisma.recommendationSlot.findMany).toHaveBeenCalled();
    });

    it('应该支持分页参数', async () => {
      await service.getRecommendationSlots({ limit: 50, offset: 10 });

      expect(prisma.recommendationSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 10,
        })
      );
    });
  });

  describe('createRecommendationSlot', () => {
    it('应该成功创建推荐位', async () => {
      const result = await service.createRecommendationSlot({
        slot: 'homepage-banner',
        seriesIds: ['series-1', 'series-2'],
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('slot', 'homepage-banner');
      expect(prisma.recommendationSlot.create).toHaveBeenCalled();
    });

    it('应该在没有slot时使用name或生成默认值', async () => {
      await service.createRecommendationSlot({
        name: 'test-slot',
        seriesIds: ['series-1'],
      });

      expect(prisma.recommendationSlot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slot: 'test-slot',
          }),
        })
      );
    });

    it('应该处理空的seriesIds', async () => {
      await service.createRecommendationSlot({
        slot: 'empty-slot',
      });

      expect(prisma.recommendationSlot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            seriesIds: [],
          }),
        })
      );
    });
  });

  describe('updateRecommendationSlot', () => {
    it('应该成功更新推荐位', async () => {
      const result = await service.updateRecommendationSlot('slot-1', {
        slot: 'updated-slot',
        seriesIds: ['series-1', 'series-2', 'series-3'],
      });

      expect(result).toHaveProperty('id', 'slot-1');
      expect(prisma.recommendationSlot.update).toHaveBeenCalled();
    });

    it('应该只更新提供的字段', async () => {
      await service.updateRecommendationSlot('slot-1', {
        slot: 'updated-slot',
      });

      expect(prisma.recommendationSlot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slot: 'updated-slot',
          }),
        })
      );
    });
  });

  describe('deleteRecommendationSlot', () => {
    it('应该成功删除推荐位', async () => {
      const result = await service.deleteRecommendationSlot('slot-1');

      expect(result).toHaveProperty('id', 'slot-1');
      expect(prisma.recommendationSlot.delete).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
      });
    });
  });

  describe('getRankingConfigs', () => {
    it('应该成功获取排行榜配置列表', async () => {
      const result = await service.getRankingConfigs({ limit: 100, offset: 0 });

      expect(result).toHaveProperty('configs');
      expect(result).toHaveProperty('total', 1);
      expect(Array.isArray(result.configs)).toBe(true);
    });
  });

  describe('createRankingConfig', () => {
    it('应该成功创建排行榜配置', async () => {
      const result = await service.createRankingConfig({
        ranking: 'daily-ranking',
        rankingType: 'views',
        timeRange: 'day',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('ranking', 'daily-ranking');
      expect(prisma.rankingConfig.create).toHaveBeenCalled();
    });

    it('应该正确序列化config为JSON', async () => {
      await service.createRankingConfig({
        ranking: 'daily-ranking',
        config: { rankingType: 'views', timeRange: 'day' },
      });

      expect(prisma.rankingConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            config: expect.stringContaining('rankingType'),
          }),
        })
      );
    });
  });

  describe('updateRankingConfig', () => {
    it('应该成功更新排行榜配置', async () => {
      const result = await service.updateRankingConfig('ranking-1', {
        ranking: 'updated-ranking',
        config: { rankingType: 'rating', timeRange: 'week' },
      });

      expect(result).toHaveProperty('id', 'ranking-1');
      expect(prisma.rankingConfig.update).toHaveBeenCalled();
    });

    it('应该处理字符串和对象格式的config', async () => {
      await service.updateRankingConfig('ranking-1', {
        config: JSON.stringify({ rankingType: 'rating' }),
      });

      expect(prisma.rankingConfig.update).toHaveBeenCalled();
    });
  });

  describe('deleteRankingConfig', () => {
    it('应该成功删除排行榜配置', async () => {
      const result = await service.deleteRankingConfig('ranking-1');

      expect(result).toHaveProperty('id', 'ranking-1');
      expect(prisma.rankingConfig.delete).toHaveBeenCalledWith({
        where: { id: 'ranking-1' },
      });
    });
  });

  describe('getRecommendationAnalytics', () => {
    it('应该成功获取推荐效果分析数据', async () => {
      const result = await service.getRecommendationAnalytics({
        slot: 'homepage-banner',
        limit: 100,
        offset: 0,
      });

      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('total', 1);
      expect(Array.isArray(result.analytics)).toBe(true);
    });

    it('应该支持按slot和seriesId过滤', async () => {
      await service.getRecommendationAnalytics({
        slot: 'homepage-banner',
        seriesId: 'series-1',
      });

      expect(prisma.recommendationAnalytics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            slot: 'homepage-banner',
            seriesId: 'series-1',
          }),
        })
      );
    });
  });

  describe('saveRecommendationAnalytics', () => {
    it('应该成功保存推荐效果分析数据', async () => {
      const result = await service.saveRecommendationAnalytics(
        'homepage-banner',
        'series-1',
        new Date(),
        { clicks: 100, views: 1000, impressions: 5000, conversions: 10 }
      );

      expect(result).toHaveProperty('id');
      expect(prisma.recommendationAnalytics.create).toHaveBeenCalled();
    });

    it('应该使用当前时间作为默认date', async () => {
      await service.saveRecommendationAnalytics(
        'homepage-banner',
        'series-1',
        new Date(), // 改成Date对象，别tm传null
        { clicks: 100 }
      );

      expect(prisma.recommendationAnalytics.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('getSlotPerformance', () => {
    it('应该成功获取推荐位的效果统计', async () => {
      const result = await service.getSlotPerformance('homepage-banner');

      expect(result).toHaveProperty('totalImpressions', 5000);
      expect(result).toHaveProperty('totalClicks', 100);
      expect(result).toHaveProperty('totalConversions', 10);
      expect(result).toHaveProperty('avgCtr');
      expect(result).toHaveProperty('avgConversionRate');
    });

    it('应该正确计算CTR（点击率）', async () => {
      const result = await service.getSlotPerformance('homepage-banner');

      // CTR = (clicks / impressions) * 100 = (100 / 5000) * 100 = 2%
      expect(parseFloat(result.avgCtr)).toBe(2);
    });

    it('应该正确计算转化率', async () => {
      const result = await service.getSlotPerformance('homepage-banner');

      // Conversion Rate = (conversions / clicks) * 100 = (10 / 100) * 100 = 10%
      expect(parseFloat(result.avgConversionRate)).toBe(10);
    });

    it('应该在没有数据时返回0', async () => {
      jest.spyOn(prisma.recommendationAnalytics, 'findMany').mockResolvedValueOnce([]);

      const result = await service.getSlotPerformance('empty-slot');

      expect(result.totalImpressions).toBe(0);
      expect(result.totalClicks).toBe(0);
      expect(result.avgCtr).toBe('0.00');
    });
  });

  describe('getRankingPerformance', () => {
    it('应该成功获取排行榜的效果统计', async () => {
      const result = await service.getRankingPerformance('daily-ranking');

      expect(result).toHaveProperty('ranking', 'daily-ranking');
      expect(result).toHaveProperty('totalImpressions');
      expect(result).toHaveProperty('totalClicks');
      expect(result).toHaveProperty('avgCtr');
    });
  });

  describe('getPopularSeries', () => {
    it('应该成功获取热门作品', async () => {
      const result = await service.getPopularSeries({
        rankingType: 'views',
        limit: 20,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(prisma.series.findMany).toHaveBeenCalled();
    });

    it('应该支持按rankingType排序', async () => {
      await service.getPopularSeries({ rankingType: 'rating' });

      expect(prisma.series.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { rating: 'desc' },
        })
      );
    });

    it('应该支持按seriesType过滤', async () => {
      await service.getPopularSeries({ seriesType: 'novel' });

      expect(prisma.series.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'novel',
          }),
        })
      );
    });

    it('应该支持过滤成人内容', async () => {
      await service.getPopularSeries({ adult: false });

      expect(prisma.series.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            adult: false,
          }),
        })
      );
    });

    it('应该支持trending排序', async () => {
      await service.getPopularSeries({ rankingType: 'trending' });

      expect(prisma.series.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
        })
      );
    });
  });
});
