import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsService } from './admin-analytics.service';
import { PrismaService } from '../../../../common/prisma/prisma.service';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: jest.fn().mockResolvedValue([
                { id: 'order-1', userId: 'user-1', amount: 100, status: 'paid', createdAt: new Date('2024-01-01') },
                { id: 'order-2', userId: 'user-1', amount: 200, status: 'paid', createdAt: new Date('2024-02-01') },
              ]),
              aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 } }),
            },
            userBehavior: {
              findUnique: jest.fn().mockResolvedValue({
                userId: 'user-1',
                lastActiveAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10天前
                readingTime: 120,
                seriesViewed: 10,
                commentsCount: 5,
                ratingsCount: 3,
                bookmarksCount: 2,
              }),
              count: jest.fn().mockResolvedValue(100),
            },
            user: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'user-1',
                wallet: { paidPts: 1000, bonusPts: 500 },
                userTags: [],
                userMetrics: { ltv: 450, churnRisk: 'low' },
                userBehavior: { lastActiveAt: new Date() },
              }),
              findMany: jest.fn().mockResolvedValue([
                { id: 'user-1', wallet: { paidPts: 1000 }, userMetrics: { ltv: 450 } },
              ]),
              count: jest.fn().mockResolvedValue(1000),
            },
            userTag: {
              deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
            userMetrics: {
              findUnique: jest.fn().mockResolvedValue({
                userId: 'user-1',
                ltv: 450,
                churnRisk: 'low',
              }),
              update: jest.fn().mockResolvedValue({
                userId: 'user-1',
                ltv: 500,
              }),
              create: jest.fn().mockResolvedValue({
                userId: 'user-1',
                ltv: 500,
              }),
              count: jest.fn().mockResolvedValue(50),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateUserLTV', () => {
    it('应该成功计算用户LTV', async () => {
      const result = await service.calculateUserLTV('user-1');

      expect(result).toHaveProperty('totalSpent', 300);
      expect(result).toHaveProperty('totalOrders', 2);
      expect(result).toHaveProperty('avgOrderValue', 150);
      expect(result).toHaveProperty('ltv', 450); // 300 * 1.5
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'paid' },
      });
    });

    it('应该在没有订单时返回0', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([]);

      const result = await service.calculateUserLTV('user-1');

      expect(result.totalSpent).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.avgOrderValue).toBe(0);
      expect(result.ltv).toBe(0);
    });
  });

  describe('assessChurnRisk', () => {
    it('应该返回低风险（30天内活跃）', async () => {
      const result = await service.assessChurnRisk('user-1');

      expect(result).toBe('low');
    });

    it('应该返回中风险（30-90天未活跃）', async () => {
      jest.spyOn(prisma.userBehavior, 'findUnique').mockResolvedValueOnce({
        id: 'behavior-1',
        userId: 'user-1',
        createdAt: new Date(),
        action: 'view',
        details: null,
        lastActiveAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60天前
        readingTime: 120,
        seriesViewed: 10,
        commentsCount: 5,
        ratingsCount: 3,
        bookmarksCount: 2,
      });

      const result = await service.assessChurnRisk('user-1');

      expect(result).toBe('medium');
    });

    it('应该返回高风险（90天以上未活跃）', async () => {
      jest.spyOn(prisma.userBehavior, 'findUnique').mockResolvedValueOnce({
        id: 'behavior-1',
        userId: 'user-1',
        createdAt: new Date(),
        action: 'view',
        details: null,
        lastActiveAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120天前
        readingTime: 120,
        seriesViewed: 10,
        commentsCount: 5,
        ratingsCount: 3,
        bookmarksCount: 2,
      });

      const result = await service.assessChurnRisk('user-1');

      expect(result).toBe('high');
    });

    it('应该在用户行为不存在时返回unknown', async () => {
      jest.spyOn(prisma.userBehavior, 'findUnique').mockResolvedValueOnce(null);

      const result = await service.assessChurnRisk('user-1');

      expect(result).toBe('unknown');
    });

    it('应该在从未活跃时返回高风险', async () => {
      jest.spyOn(prisma.userBehavior, 'findUnique').mockResolvedValueOnce({
        id: 'behavior-1',
        userId: 'user-1',
        createdAt: new Date(),
        action: 'view',
        details: null,
        lastActiveAt: null,
        readingTime: 0,
        seriesViewed: 0,
        commentsCount: 0,
        ratingsCount: 0,
        bookmarksCount: 0,
      });

      const result = await service.assessChurnRisk('user-1');

      expect(result).toBe('high');
    });
  });

  describe('getUserAnalytics', () => {
    it('应该成功获取用户分析数据', async () => {
      const result = await service.getUserAnalytics('user-1');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('ltv');
      expect(result).toHaveProperty('churnRisk');
      expect(result!.ltv).toHaveProperty('totalSpent');
      expect(result!.churnRisk).toBe('low');
    });

    it('应该在用户不存在时返回null', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);

      const result = await service.getUserAnalytics('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('getUserSegments', () => {
    it('应该成功获取用户分层列表', async () => {
      const result = await service.getUserSegments({ segment: 'all', limit: 100, offset: 0 });

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('total', 1000);
      expect(result).toHaveProperty('limit', 100);
      expect(result).toHaveProperty('offset', 0);
      expect(Array.isArray(result.users)).toBe(true);
    });

    it('应该支持VIP分层过滤', async () => {
      await service.getUserSegments({ segment: 'vip' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userTags: expect.any(Object),
          }),
        })
      );
    });

    it('应该支持高价值用户分层过滤', async () => {
      await service.getUserSegments({ segment: 'high-value' });

      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('应该支持风险用户分层过滤', async () => {
      await service.getUserSegments({ segment: 'at-risk' });

      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe('getUserBehaviorAnalytics', () => {
    it('应该成功获取用户行为分析', async () => {
      const result = await service.getUserBehaviorAnalytics('user-1');

      expect(result).toHaveProperty('activityScore');
      expect(result!.activityScore).toBeGreaterThanOrEqual(0);
      expect(result!.activityScore).toBeLessThanOrEqual(100);
    });

    it('应该在用户行为不存在时返回null', async () => {
      jest.spyOn(prisma.userBehavior, 'findUnique').mockResolvedValueOnce(null);

      const result = await service.getUserBehaviorAnalytics('user-1');

      expect(result).toBeNull();
    });

    it('应该正确计算活跃度评分', async () => {
      jest.spyOn(prisma.userBehavior, 'findUnique').mockResolvedValueOnce({
        id: 'behavior-1',
        userId: 'user-1',
        createdAt: new Date(),
        action: 'read',
        details: 'reading activity',
        lastActiveAt: new Date(),
        readingTime: 600, // 10小时
        seriesViewed: 20,
        commentsCount: 10,
        ratingsCount: 5,
        bookmarksCount: 3,
      } as any);

      const result = await service.getUserBehaviorAnalytics('user-1');

      expect(result!.activityScore).toBeGreaterThan(0);
    });
  });

  describe('updateUserTags', () => {
    it('应该成功更新用户标签', async () => {
      const tags = [
        { tagType: 'vip_level', tagValue: 'gold' },
        { tagType: 'interest', tagValue: 'romance' },
      ];

      const result = await service.updateUserTags('user-1', tags);

      expect(prisma.userTag.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.userTag.createMany).toHaveBeenCalled();
    });

    it('应该正确格式化标签数据', async () => {
      const tags = [{ tagType: 'vip_level', tagValue: 'gold' }];

      await service.updateUserTags('user-1', tags);

      expect(prisma.userTag.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-1',
              tag: 'vip_level:gold',
              tagType: 'vip_level',
              tagValue: 'gold',
            }),
          ]),
        })
      );
    });
  });

  describe('updateUserMetrics', () => {
    it('应该成功更新现有用户指标', async () => {
      const metrics = { ltv: 500, churnRisk: 'medium' };

      const result = await service.updateUserMetrics('user-1', metrics);

      expect(prisma.userMetrics.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: metrics,
      });
    });

    it('应该在指标不存在时创建新指标', async () => {
      jest.spyOn(prisma.userMetrics, 'findUnique').mockResolvedValueOnce(null);

      const metrics = { ltv: 500, churnRisk: 'medium' };

      await service.updateUserMetrics('user-1', metrics);

      expect(prisma.userMetrics.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          ...metrics,
        },
      });
    });
  });

  describe('getAnalyticsStats', () => {
    it('应该成功获取分析统计数据', async () => {
      const result = await service.getAnalyticsStats();

      expect(result).toHaveProperty('totalUsers', 1000);
      expect(result).toHaveProperty('activeUsers', 100);
      expect(result).toHaveProperty('activeRate');
      expect(result).toHaveProperty('highValueUsers', 50);
      expect(result).toHaveProperty('atRiskUsers', 50);
      expect(result).toHaveProperty('totalRevenue', 1000);
    });

    it('应该正确计算活跃率百分比', async () => {
      const result = await service.getAnalyticsStats();

      expect(result.activeRate).toContain('%');
    });

    it('应该在没有收入时返回0', async () => {
      jest.spyOn(prisma.order, 'aggregate').mockResolvedValueOnce({
        _sum: { amount: null },
        _count: 0,
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as any);

      const result = await service.getAnalyticsStats();

      expect(result.totalRevenue).toBe(0);
    });
  });
});
