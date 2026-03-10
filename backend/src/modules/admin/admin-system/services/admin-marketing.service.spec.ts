import { Test, TestingModule } from '@nestjs/testing';
import { AdminMarketingService } from './admin-marketing.service';
import { PrismaService } from '../../../../common/prisma/prisma.service';

describe('AdminMarketingService', () => {
  let service: AdminMarketingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMarketingService,
        {
          provide: PrismaService,
          useValue: {
            marketingCampaign: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'campaign-1',
                  name: 'Summer Sale',
                  description: 'Summer promotion',
                  type: 'email',
                  status: 'active',
                  targetSegment: 'vip',
                  budget: 1000,
                  spent: 500,
                  startDate: new Date('2024-06-01'),
                  endDate: new Date('2024-06-30'),
                  createdAt: new Date(),
                  analytics: [{ dateKey: '2024-06-01', revenue: 100, converted: 10 }],
                },
              ]),
              count: jest.fn().mockResolvedValue(1),
              create: jest.fn().mockResolvedValue({
                id: 'campaign-1',
                name: 'Summer Sale',
                status: 'draft',
                targetSegment: 'all',
                budget: 1000,
                spent: 0,
              }),
              update: jest.fn().mockResolvedValue({
                id: 'campaign-1',
                name: 'Updated Campaign',
                budget: 1500,
              }),
              delete: jest.fn().mockResolvedValue({ id: 'campaign-1' }),
              findUnique: jest.fn().mockResolvedValue({
                id: 'campaign-1',
                name: 'Summer Sale',
                budget: 1000,
                spent: 500,
                analytics: [
                  { dateKey: '2024-06-01', revenue: 100, converted: 10 },
                  { dateKey: '2024-06-02', revenue: 150, converted: 15 },
                ],
              }),
            },
            marketingBudget: {
              create: jest.fn().mockResolvedValue({
                campaignId: 'campaign-1',
                totalBudget: 1000,
                emailBudget: 500,
                pushBudget: 300,
                bannerBudget: 200,
                discountBudget: 0,
              }),
              findUnique: jest.fn().mockResolvedValue({
                campaignId: 'campaign-1',
                totalBudget: 1000,
                emailBudget: 500,
                pushBudget: 300,
                bannerBudget: 200,
                discountBudget: 0,
              }),
              upsert: jest.fn().mockResolvedValue({
                campaignId: 'campaign-1',
                totalBudget: 1500,
              }),
            },
            marketingCampaignTarget: {
              count: jest.fn().mockResolvedValue(2),
              createMany: jest.fn().mockResolvedValue({ count: 50 }),
              findMany: jest.fn().mockResolvedValue([
                { campaignId: 'campaign-1', userId: 'user-1', target: 'user-1', createdAt: new Date() },
                { campaignId: 'campaign-1', userId: 'user-2', target: 'user-2', createdAt: new Date() },
              ]),
              update: jest.fn().mockResolvedValue({
                campaignId: 'campaign-1',
                userId: 'user-1',
                status: 'sent',
              }),
            },
            marketingAnalytics: {
              findMany: jest.fn().mockResolvedValue([
                {
                  campaignId: 'campaign-1',
                  dateKey: '2024-06-01',
                  sent: 1000,
                  opened: 300,
                  clicked: 100,
                  converted: 10,
                  revenue: 500,
                  openRate: 30,
                  clickRate: 10,
                  conversionRate: 1,
                  cac: 50,
                  roi: 50,
                },
              ]),
              count: jest.fn().mockResolvedValue(1),
              findUnique: jest.fn().mockResolvedValue({
                campaignId: 'campaign-1',
                dateKey: '2024-06-01',
                sent: 1000,
              }),
              update: jest.fn().mockResolvedValue({
                campaignId: 'campaign-1',
                dateKey: '2024-06-01',
                sent: 1000,
              }),
              create: jest.fn().mockResolvedValue({
                campaignId: 'campaign-1',
                dateKey: '2024-06-01',
                sent: 1000,
              }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminMarketingService>(AdminMarketingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCampaigns', () => {
    it('应该成功获取营销活动列表', async () => {
      const result = await service.getCampaigns({ limit: 100, offset: 0 });

      expect(result).toHaveProperty('campaigns');
      expect(result).toHaveProperty('total', 1);
      expect(Array.isArray(result.campaigns)).toBe(true);
    });

    it('应该支持按status过滤', async () => {
      await service.getCampaigns({ status: 'active' });

      expect(prisma.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        })
      );
    });

    it('应该支持按targetSegment过滤', async () => {
      await service.getCampaigns({ targetSegment: 'vip' });

      expect(prisma.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetSegment: 'vip' }),
        })
      );
    });
  });

  describe('createCampaign', () => {
    it('应该成功创建营销活动', async () => {
      const data = {
        name: 'Summer Sale',
        description: 'Summer promotion',
        type: 'email',
        budget: 1000,
        emailBudget: 500,
        pushBudget: 300,
        bannerBudget: 200,
      };

      const result = await service.createCampaign(data);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'Summer Sale');
      expect(prisma.marketingCampaign.create).toHaveBeenCalled();
    });

    it('应该使用默认值填充缺失的字段', async () => {
      const data = { name: 'Test Campaign' };

      await service.createCampaign(data);

      expect(prisma.marketingCampaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'draft',
            targetSegment: 'all',
            budget: 0,
            spent: 0,
          }),
        })
      );
    });

    it('应该在budget大于0时创建预算记录', async () => {
      const data = {
        name: 'Test Campaign',
        budget: 1000,
        emailBudget: 500,
      };

      await service.createCampaign(data);

      expect(prisma.marketingBudget.create).toHaveBeenCalled();
    });

    it('应该在budget为0时不创建预算记录', async () => {
      const data = { name: 'Test Campaign', budget: 0 };

      await service.createCampaign(data);

      expect(prisma.marketingBudget.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCampaign', () => {
    it('应该成功更新营销活动', async () => {
      const result = await service.updateCampaign('campaign-1', {
        name: 'Updated Campaign',
        budget: 1500,
      });

      expect(result).toHaveProperty('id', 'campaign-1');
      expect(prisma.marketingCampaign.update).toHaveBeenCalled();
    });

    it('应该在更新budget时同时更新预算记录', async () => {
      await service.updateCampaign('campaign-1', { budget: 1500 });

      expect(prisma.marketingBudget.upsert).toHaveBeenCalled();
    });

    it('应该在不更新budget时不更新预算记录', async () => {
      await service.updateCampaign('campaign-1', { name: 'Updated' });

      expect(prisma.marketingBudget.upsert).not.toHaveBeenCalled();
    });
    it('should persist spent when updating a campaign', async () => {
      await service.updateCampaign('campaign-1', { spent: 700 });

      expect(prisma.marketingCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'campaign-1' },
          data: expect.objectContaining({ spent: 700 }),
        })
      );
    });

    it('should clear nullable schedule fields when null or empty string is provided', async () => {
      await service.updateCampaign('campaign-1', { startDate: null, endDate: '' });

      expect(prisma.marketingCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: null,
            endDate: null,
          }),
        })
      );
    });
  });

  describe('deleteCampaign', () => {
    it('应该成功删除营销活动', async () => {
      const result = await service.deleteCampaign('campaign-1');

      expect(result).toHaveProperty('id', 'campaign-1');
      expect(prisma.marketingCampaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
      });
    });
  });

  describe('getCampaignDetail', () => {
    it('应该成功获取营销活动详情', async () => {
      const result = await service.getCampaignDetail('campaign-1');

      expect(result).toHaveProperty('campaign');
      expect(result).toHaveProperty('budget');
      expect(result).toHaveProperty('targetCount', 2);
    });
  });

  describe('getCampaignAnalytics', () => {
    it('应该成功获取营销活动效果分析', async () => {
      const result = await service.getCampaignAnalytics('campaign-1');

      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('summary');
    });

    it('应该正确计算汇总数据', async () => {
      const result = await service.getCampaignAnalytics('campaign-1');

      expect(result.summary).toHaveProperty('totalSent', 1000);
      expect(result.summary).toHaveProperty('totalOpened', 300);
      expect(result.summary).toHaveProperty('totalClicked', 100);
      expect(result.summary).toHaveProperty('totalConverted', 10);
      expect(result.summary).toHaveProperty('totalRevenue', 500);
    });

    it('应该在没有数据时返回0', async () => {
      jest.spyOn(prisma.marketingAnalytics, 'findMany').mockResolvedValueOnce([]);

      const result = await service.getCampaignAnalytics('campaign-1');

      expect(result.summary.totalSent).toBe(0);
      expect(result.summary.avgOpenRate).toBe(0);
    });

    it('应该支持按日期范围过滤', async () => {
      const startDate = '2024-06-01';
      const endDate = '2024-06-30';

      await service.getCampaignAnalytics('campaign-1', { startDate, endDate });

      expect(prisma.marketingAnalytics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateKey: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('saveMarketingAnalytics', () => {
    it('应该成功保存营销活动效果数据', async () => {
      const result = await service.saveMarketingAnalytics('campaign-1', '2024-06-01', {
        sent: 1000,
        opened: 300,
      });

      expect(result).toHaveProperty('campaignId', 'campaign-1');
      expect(result).toHaveProperty('dateKey', '2024-06-01');
    });

    it('应该在数据存在时更新', async () => {
      jest.spyOn(prisma.marketingAnalytics, 'findUnique').mockResolvedValueOnce({
        sent: 1000,
        id: 'analytics-1',
        createdAt: new Date(),
        dateKey: '2024-06-01',
        campaignId: 'campaign-1',
        metric: null,
        value: 100,
        date: new Date(),
        opened: 300,
        clicked: 50,
        converted: 10,
        roi: 1.5,
      } as any);

      await service.saveMarketingAnalytics('campaign-1', '2024-06-01', { sent: 1000 });

      expect(prisma.marketingAnalytics.update).toHaveBeenCalled();
    });

    it('应该在数据不存在时创建', async () => {
      jest.spyOn(prisma.marketingAnalytics, 'findUnique').mockResolvedValueOnce(null);

      await service.saveMarketingAnalytics('campaign-1', '2024-06-01', { sent: 1000 });

      expect(prisma.marketingAnalytics.create).toHaveBeenCalled();
    });
  });

  describe('addTargetUsers', () => {
    it('应该成功添加目标用户到活动', async () => {
      const result = await service.addTargetUsers('campaign-1', ['user-1', 'user-2', 'user-3']);

      expect(result).toHaveProperty('count', 50);
      expect(prisma.marketingCampaignTarget.createMany).toHaveBeenCalled();
    });

    it('应该正确格式化目标用户数据', async () => {
      await service.addTargetUsers('campaign-1', ['user-1', 'user-2']);

      expect(prisma.marketingCampaignTarget.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              campaignId: 'campaign-1',
              userId: 'user-1',
              target: 'user-1',
            }),
          ]),
          skipDuplicates: true,
        })
      );
    });
  });

  describe('getTargetUsers', () => {
    it('应该成功获取活动目标用户', async () => {
      const result = await service.getTargetUsers('campaign-1');

      expect(result).toHaveProperty('targets');
      expect(result).toHaveProperty('total', 2);
      expect(Array.isArray(result.targets)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      await service.getTargetUsers('campaign-1', { limit: 50, offset: 10 });

      expect(prisma.marketingCampaignTarget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 10,
        })
      );
    });
  });

  describe('updateTargetUserStatus', () => {
    it('应该成功更新目标用户状态', async () => {
      const result = await service.updateTargetUserStatus('campaign-1', 'user-1', {
        status: 'sent',
      });

      expect(result).toHaveProperty('status', 'sent');
      expect(prisma.marketingCampaignTarget.update).toHaveBeenCalled();
    });
  });

  describe('getCampaignBudget', () => {
    it('应该成功获取营销活动预算', async () => {
      const result = await service.getCampaignBudget('campaign-1');

      expect(result).toHaveProperty('campaignId', 'campaign-1');
      expect(result).toHaveProperty('totalBudget', 1000);
    });
  });

  describe('updateCampaignBudget', () => {
    it('应该成功更新营销活动预算', async () => {
      const result = await service.updateCampaignBudget('campaign-1', {
        totalBudget: 1500,
        emailBudget: 750,
      });

      expect(result).toHaveProperty('campaignId', 'campaign-1');
      expect(prisma.marketingBudget.upsert).toHaveBeenCalled();
    });

    it('应该在预算不存在时创建', async () => {
      await service.updateCampaignBudget('campaign-1', {
        totalBudget: 1500,
      });

      expect(prisma.marketingBudget.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.any(Object),
        })
      );
    });
  });

  describe('getMarketingStats', () => {
    it('应该成功获取营销活动统计', async () => {
      const result = await service.getMarketingStats();

      expect(result).toHaveProperty('totalCampaigns');
      expect(result).toHaveProperty('activeCampaigns');
      expect(result).toHaveProperty('totalBudget');
      expect(result).toHaveProperty('totalSpent');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('avgRoi');
    });

    it('应该支持按日期范围过滤', async () => {
      const startDate = '2024-06-01';
      const endDate = '2024-06-30';

      await service.getMarketingStats({ startDate, endDate });

      expect(prisma.marketingCampaign.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        })
      );
    });

    it('应该正确计算ROI', async () => {
      const result = await service.getMarketingStats();

      expect(result.avgRoi).toBeDefined();
      expect(typeof result.avgRoi).toBe('string');
    });
  });

  describe('getCampaignsBySegment', () => {
    it('应该成功获取按目标受众分组的活动统计', async () => {
      const result = await service.getCampaignsBySegment();

      expect(Array.isArray(result)).toBe(true);
    });

    it('应该包含正确的分组数据', async () => {
      const result = await service.getCampaignsBySegment();

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('segment');
        expect(result[0]).toHaveProperty('count');
        expect(result[0]).toHaveProperty('budget');
        expect(result[0]).toHaveProperty('spent');
        expect(result[0]).toHaveProperty('revenue');
      }
    });
  });

  describe('getCampaignsByType', () => {
    it('应该成功获取按活动类型分组的活动统计', async () => {
      const result = await service.getCampaignsByType();

      expect(Array.isArray(result)).toBe(true);
    });

    it('应该包含正确的分组数据', async () => {
      const result = await service.getCampaignsByType();

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('type');
        expect(result[0]).toHaveProperty('count');
        expect(result[0]).toHaveProperty('budget');
        expect(result[0]).toHaveProperty('spent');
      }
    });
  });
});
