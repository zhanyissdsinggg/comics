import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 老王说：营销活动管理服务
 * 这个SB服务处理所有营销活动相关的业务逻辑
 * 包括活动创建、效果分析、预算管理等
 */
@Injectable()
export class AdminMarketingService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有营销活动
   */
  async getCampaigns(filters: any = {}) {
    const { status, targetSegment, limit = 100, offset = 0 } = filters;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (targetSegment) {
      where.targetSegment = targetSegment;
    }

    const campaigns = await this.prisma.marketingCampaign.findMany({
      where,
      include: {
        analytics: {
          orderBy: { dateKey: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.marketingCampaign.count({ where });

    return { campaigns, total };
  }

  /**
   * 创建营销活动
   */
  async createCampaign(data: any) {
    const campaign = await this.prisma.marketingCampaign.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        status: data.status ?? 'draft',
        targetSegment: data.targetSegment ?? 'all',
        budget: data.budget ?? 0,
        spent: 0,
        startAt: data.startAt,
        endAt: data.endAt,
      },
    });

    // 创建预算记录
    if (data.budget > 0) {
      await this.prisma.marketingBudget.create({
        data: {
          campaignId: campaign.id,
          totalBudget: data.budget,
          emailBudget: data.emailBudget ?? 0,
          pushBudget: data.pushBudget ?? 0,
          bannerBudget: data.bannerBudget ?? 0,
          discountBudget: data.discountBudget ?? 0,
        },
      });
    }

    return campaign;
  }

  /**
   * 更新营销活动
   */
  async updateCampaign(id: string, data: any) {
    const campaign = await this.prisma.marketingCampaign.update({
      where: { id },
      data,
    });

    // 如果更新了预算，同时更新预算记录
    if (data.budget !== undefined) {
      await this.prisma.marketingBudget.upsert({
        where: { campaignId: id },
        create: {
          campaignId: id,
          totalBudget: data.budget,
        },
        update: {
          totalBudget: data.budget,
        },
      });
    }

    return campaign;
  }

  /**
   * 删除营销活动
   */
  async deleteCampaign(id: string) {
    return this.prisma.marketingCampaign.delete({
      where: { id },
    });
  }

  /**
   * 获取营销活动详情
   */
  async getCampaignDetail(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id },
      include: {
        analytics: {
          orderBy: { dateKey: 'desc' },
        },
      },
    });

    const budget = await this.prisma.marketingBudget.findUnique({
      where: { campaignId: id },
    });

    const targetCount = await this.prisma.marketingCampaignTarget.count({
      where: { campaignId: id },
    });

    return {
      campaign,
      budget,
      targetCount,
    };
  }

  /**
   * 获取营销活动效果分析
   */
  async getCampaignAnalytics(campaignId: string, filters: any = {}) {
    const { startDate, endDate, limit = 100, offset = 0 } = filters;

    const where: any = { campaignId };
    if (startDate && endDate) {
      where.dateKey = {
        gte: startDate,
        lte: endDate,
      };
    }

    const analytics = await this.prisma.marketingAnalytics.findMany({
      where,
      orderBy: { dateKey: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.marketingAnalytics.count({ where });

    // 计算汇总数据
    const summary = {
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalConverted: 0,
      totalRevenue: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
      avgConversionRate: 0,
      avgCac: 0,
      avgRoi: 0,
    };

    if (analytics.length > 0) {
      summary.totalSent = analytics.reduce((sum, item) => sum + item.sent, 0);
      summary.totalOpened = analytics.reduce((sum, item) => sum + item.opened, 0);
      summary.totalClicked = analytics.reduce((sum, item) => sum + item.clicked, 0);
      summary.totalConverted = analytics.reduce((sum, item) => sum + item.converted, 0);
      summary.totalRevenue = analytics.reduce((sum, item) => sum + item.revenue, 0);
      summary.avgOpenRate = analytics.reduce((sum, item) => sum + item.openRate, 0) / analytics.length;
      summary.avgClickRate = analytics.reduce((sum, item) => sum + item.clickRate, 0) / analytics.length;
      summary.avgConversionRate = analytics.reduce((sum, item) => sum + item.conversionRate, 0) / analytics.length;
      summary.avgCac = analytics.reduce((sum, item) => sum + item.cac, 0) / analytics.length;
      summary.avgRoi = analytics.reduce((sum, item) => sum + item.roi, 0) / analytics.length;
    }

    return { analytics, total, summary };
  }

  /**
   * 保存营销活动效果数据
   */
  async saveMarketingAnalytics(campaignId: string, dateKey: string, data: any) {
    const existing = await this.prisma.marketingAnalytics.findUnique({
      where: {
        campaignId_dateKey: {
          campaignId,
          dateKey,
        },
      },
    });

    if (existing) {
      return this.prisma.marketingAnalytics.update({
        where: {
          campaignId_dateKey: {
            campaignId,
            dateKey,
          },
        },
        data,
      });
    } else {
      return this.prisma.marketingAnalytics.create({
        data: {
          campaignId,
          dateKey,
          ...data,
        },
      });
    }
  }

  /**
   * 添加目标用户到活动
   */
  async addTargetUsers(campaignId: string, userIds: string[]) {
    const targets = userIds.map((userId) => ({
      campaignId,
      userId,
      target: userId,
    }));

    return this.prisma.marketingCampaignTarget.createMany({
      data: targets,
      skipDuplicates: true,
    });
  }

  /**
   * 获取活动目标用户
   */
  async getTargetUsers(campaignId: string, filters: any = {}) {
    const { limit = 100, offset = 0 } = filters;

    const targets = await this.prisma.marketingCampaignTarget.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.marketingCampaignTarget.count({
      where: { campaignId },
    });

    return { targets, total };
  }

  /**
   * 更新目标用户状态
   */
  async updateTargetUserStatus(campaignId: string, userId: string, status: any) {
    return this.prisma.marketingCampaignTarget.update({
      where: {
        campaignId_userId: {
          campaignId,
          userId,
        },
      },
      data: status,
    });
  }

  /**
   * 获取营销活动预算
   */
  async getCampaignBudget(campaignId: string) {
    return this.prisma.marketingBudget.findUnique({
      where: { campaignId },
    });
  }

  /**
   * 更新营销活动预算
   */
  async updateCampaignBudget(campaignId: string, data: any) {
    return this.prisma.marketingBudget.upsert({
      where: { campaignId },
      create: {
        campaignId,
        totalBudget: data.totalBudget,
        emailBudget: data.emailBudget ?? 0,
        pushBudget: data.pushBudget ?? 0,
        bannerBudget: data.bannerBudget ?? 0,
        discountBudget: data.discountBudget ?? 0,
      },
      update: data,
    });
  }

  /**
   * 获取营销活动统计
   */
  async getMarketingStats(filters: any = {}) {
    const { startDate, endDate } = filters;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const totalCampaigns = await this.prisma.marketingCampaign.count({ where });
    const activeCampaigns = await this.prisma.marketingCampaign.count({
      where: { ...where, status: 'active' },
    });

    const campaigns = await this.prisma.marketingCampaign.findMany({
      where,
      include: {
        analytics: true,
      },
    });

    let totalBudget = 0;
    let totalSpent = 0;
    let totalRevenue = 0;
    let totalConverted = 0;

    campaigns.forEach((campaign) => {
      totalBudget += campaign.budget;
      totalSpent += campaign.spent;
      campaign.analytics.forEach((analytic) => {
        totalRevenue += analytic.revenue;
        totalConverted += analytic.converted;
      });
    });

    const avgRoi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

    return {
      totalCampaigns,
      activeCampaigns,
      totalBudget,
      totalSpent,
      totalRevenue,
      totalConverted,
      avgRoi: avgRoi.toFixed(2),
    };
  }

  /**
   * 获取按目标受众分组的活动统计
   */
  async getCampaignsBySegment(filters: any = {}) {
    const { startDate, endDate } = filters;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const campaigns = await this.prisma.marketingCampaign.findMany({
      where,
      include: {
        analytics: true,
      },
    });

    const segments: any = {};

    campaigns.forEach((campaign) => {
      const segment = campaign.targetSegment || 'unknown';
      if (!segments[segment]) {
        segments[segment] = {
          segment,
          count: 0,
          budget: 0,
          spent: 0,
          revenue: 0,
          converted: 0,
        };
      }

      segments[segment].count += 1;
      segments[segment].budget += campaign.budget;
      segments[segment].spent += campaign.spent;

      campaign.analytics.forEach((analytic) => {
        segments[segment].revenue += analytic.revenue;
        segments[segment].converted += analytic.converted;
      });
    });

    return Object.values(segments);
  }

  /**
   * 获取按活动类型分组的活动统计
   */
  async getCampaignsByType(filters: any = {}) {
    const { startDate, endDate } = filters;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const campaigns = await this.prisma.marketingCampaign.findMany({
      where,
      include: {
        analytics: true,
      },
    });

    const types: any = {};

    campaigns.forEach((campaign) => {
      const type = campaign.type || 'unknown';
      if (!types[type]) {
        types[type] = {
          type,
          count: 0,
          budget: 0,
          spent: 0,
          revenue: 0,
          converted: 0,
        };
      }

      types[type].count += 1;
      types[type].budget += campaign.budget;
      types[type].spent += campaign.spent;

      campaign.analytics.forEach((analytic) => {
        types[type].revenue += analytic.revenue;
        types[type].converted += analytic.converted;
      });
    });

    return Object.values(types);
  }
}
