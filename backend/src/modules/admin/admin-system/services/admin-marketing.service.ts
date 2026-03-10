import { Injectable } from '@nestjs/common';
import type {
  MarketingAnalytics,
  MarketingBudget,
  MarketingCampaign,
  MarketingCampaignTarget,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import type {
  CreateMarketingCampaignInput,
  MarketingAnalyticsFilters,
  MarketingCampaignFilters,
  MarketingSegmentStat,
  MarketingStatsFilters,
  MarketingTargetFilters,
  MarketingTypeStat,
  SaveMarketingAnalyticsInput,
  UpdateMarketingBudgetInput,
  UpdateMarketingCampaignInput,
  UpdateMarketingTargetStatusInput,
} from '../dtos/admin-marketing.dto';
import { hasText, readDateLike, readIntLike, readNumberLike } from '../../utils/param-parsing';

export type MarketingCampaignWithAnalytics = MarketingCampaign & { analytics: MarketingAnalytics[] };

export interface MarketingCampaignListResult {
  campaigns: MarketingCampaignWithAnalytics[];
  total: number;
}

export interface MarketingCampaignDetailResult {
  campaign: MarketingCampaignWithAnalytics | null;
  budget: MarketingBudget | null;
  targetCount: number;
}

export interface MarketingAnalyticsSummary {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalRevenue: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgConversionRate: number;
  avgCac: number;
  avgRoi: number;
}

export interface MarketingAnalyticsResult {
  analytics: MarketingAnalytics[];
  total: number;
  summary: MarketingAnalyticsSummary;
}

export interface MarketingTargetListResult {
  targets: MarketingCampaignTarget[];
  total: number;
}

interface MarketingAnalyticsWriteData {
  metric?: string;
  value?: number;
  date?: Date;
  sent?: number;
  opened?: number;
  clicked?: number;
  converted?: number;
  revenue?: number;
  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
  cac?: number;
  roi?: number;
}

export interface MarketingStatsResult {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  totalConverted: number;
  avgRoi: string;
}

function buildCampaignWhere(filters: MarketingCampaignFilters): Prisma.MarketingCampaignWhereInput {
  const where: Prisma.MarketingCampaignWhereInput = {};

  if (hasText(filters.status)) {
    where.status = filters.status;
  }
  if (hasText(filters.targetSegment)) {
    where.targetSegment = filters.targetSegment;
  }

  return where;
}

function buildCampaignDateWhere(filters: MarketingStatsFilters): Prisma.MarketingCampaignWhereInput {
  const where: Prisma.MarketingCampaignWhereInput = {};
  const startDate = readDateLike(filters.startDate);
  const endDate = readDateLike(filters.endDate);

  if (startDate && endDate) {
    where.createdAt = {
      gte: startDate,
      lte: endDate,
    };
  }

  return where;
}

function buildCampaignCreateData(input: CreateMarketingCampaignInput): Prisma.MarketingCampaignUncheckedCreateInput {
  const data: Prisma.MarketingCampaignUncheckedCreateInput = {
    name: input.name,
    status: input.status ?? 'draft',
    targetSegment: input.targetSegment ?? 'all',
    budget: readIntLike(input.budget, 0),
    spent: 0,
  };

  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.type !== undefined) {
    data.type = input.type;
  }

  const startDate = readDateLike(input.startDate);
  if (startDate) {
    data.startDate = startDate;
  }

  const endDate = readDateLike(input.endDate);
  if (endDate) {
    data.endDate = endDate;
  }

  return data;
}

function readNullableCampaignDate(value: UpdateMarketingCampaignInput['startDate']): Date | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  return readDateLike(value);
}

function buildCampaignUpdateData(input: UpdateMarketingCampaignInput): Prisma.MarketingCampaignUncheckedUpdateInput {
  const data: Prisma.MarketingCampaignUncheckedUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.type !== undefined) {
    data.type = input.type;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }
  if (input.targetSegment !== undefined) {
    data.targetSegment = input.targetSegment;
  }
  if (input.budget !== undefined) {
    data.budget = readIntLike(input.budget, 0);
  }
  if (input.spent !== undefined) {
    data.spent = readIntLike(input.spent, 0);
  }

  if (input.startDate !== undefined) {
    const startDate = readNullableCampaignDate(input.startDate);
    if (startDate !== undefined) {
      data.startDate = startDate;
    }
  }

  if (input.endDate !== undefined) {
    const endDate = readNullableCampaignDate(input.endDate);
    if (endDate !== undefined) {
      data.endDate = endDate;
    }
  }

  return data;
}

function buildBudgetCreateData(
  campaignId: string,
  input: Pick<UpdateMarketingBudgetInput, 'totalBudget' | 'emailBudget' | 'pushBudget' | 'bannerBudget' | 'discountBudget' | 'spent'>,
): Prisma.MarketingBudgetUncheckedCreateInput {
  return {
    campaignId,
    totalBudget: readIntLike(input.totalBudget, 0),
    emailBudget: readIntLike(input.emailBudget, 0),
    pushBudget: readIntLike(input.pushBudget, 0),
    bannerBudget: readIntLike(input.bannerBudget, 0),
    discountBudget: readIntLike(input.discountBudget, 0),
    spent: readIntLike(input.spent, 0),
  };
}

function buildBudgetUpdateData(input: UpdateMarketingBudgetInput): Prisma.MarketingBudgetUncheckedUpdateInput {
  const data: Prisma.MarketingBudgetUncheckedUpdateInput = {};

  if (input.totalBudget !== undefined) {
    data.totalBudget = readIntLike(input.totalBudget, 0);
  }
  if (input.emailBudget !== undefined) {
    data.emailBudget = readIntLike(input.emailBudget, 0);
  }
  if (input.pushBudget !== undefined) {
    data.pushBudget = readIntLike(input.pushBudget, 0);
  }
  if (input.bannerBudget !== undefined) {
    data.bannerBudget = readIntLike(input.bannerBudget, 0);
  }
  if (input.discountBudget !== undefined) {
    data.discountBudget = readIntLike(input.discountBudget, 0);
  }
  if (input.spent !== undefined) {
    data.spent = readIntLike(input.spent, 0);
  }

  return data;
}

function buildMarketingAnalyticsWhere(
  campaignId: string,
  filters: MarketingAnalyticsFilters,
): Prisma.MarketingAnalyticsWhereInput {
  const where: Prisma.MarketingAnalyticsWhereInput = { campaignId };

  if (hasText(filters.startDate) && hasText(filters.endDate)) {
    where.dateKey = {
      gte: filters.startDate,
      lte: filters.endDate,
    };
  }

  return where;
}

function buildMarketingAnalyticsData(
  input: SaveMarketingAnalyticsInput,
): MarketingAnalyticsWriteData {
  const data: MarketingAnalyticsWriteData = {};

  if (input.metric !== undefined) {
    data.metric = input.metric;
  }

  const value = readNumberLike(input.value);
  if (value !== undefined) {
    data.value = Math.trunc(value);
  }

  const date = readDateLike(input.date);
  if (date) {
    data.date = date;
  }

  const intFields: Array<keyof Pick<SaveMarketingAnalyticsInput, 'sent' | 'opened' | 'clicked' | 'converted' | 'revenue'>> = [
    'sent',
    'opened',
    'clicked',
    'converted',
    'revenue',
  ];
  for (const field of intFields) {
    if (input[field] !== undefined) {
      data[field] = readIntLike(input[field], 0);
    }
  }

  const floatFields: Array<keyof Pick<SaveMarketingAnalyticsInput, 'openRate' | 'clickRate' | 'conversionRate' | 'cac' | 'roi'>> = [
    'openRate',
    'clickRate',
    'conversionRate',
    'cac',
    'roi',
  ];
  for (const field of floatFields) {
    const parsed = readNumberLike(input[field]);
    if (parsed !== undefined) {
      data[field] = parsed;
    }
  }

  return data;
}

function createAnalyticsSummary(analytics: MarketingAnalytics[]): MarketingAnalyticsSummary {
  const summary: MarketingAnalyticsSummary = {
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

  if (analytics.length === 0) {
    return summary;
  }

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

  return summary;
}

@Injectable()
export class AdminMarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async getCampaigns(filters: MarketingCampaignFilters = {}): Promise<MarketingCampaignListResult> {
    const limit = readIntLike(filters.limit, 100, 1, 500);
    const offset = readIntLike(filters.offset, 0, 0);
    const where = buildCampaignWhere(filters);

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

  async createCampaign(input: CreateMarketingCampaignInput): Promise<MarketingCampaign> {
    const campaign = await this.prisma.marketingCampaign.create({
      data: buildCampaignCreateData(input),
    });

    const budget = readIntLike(input.budget, 0);
    if (budget > 0) {
      await this.prisma.marketingBudget.create({
        data: buildBudgetCreateData(campaign.id, {
          totalBudget: budget,
          emailBudget: input.emailBudget,
          pushBudget: input.pushBudget,
          bannerBudget: input.bannerBudget,
          discountBudget: input.discountBudget,
        }),
      });
    }

    return campaign;
  }

  async updateCampaign(id: string, input: UpdateMarketingCampaignInput): Promise<MarketingCampaign> {
    const campaign = await this.prisma.marketingCampaign.update({
      where: { id },
      data: buildCampaignUpdateData(input),
    });

    if (input.budget !== undefined) {
      const budget = readIntLike(input.budget, 0);
      await this.prisma.marketingBudget.upsert({
        where: { campaignId: id },
        create: buildBudgetCreateData(id, { totalBudget: budget }),
        update: { totalBudget: budget },
      });
    }

    return campaign;
  }

  async deleteCampaign(id: string): Promise<MarketingCampaign> {
    return this.prisma.marketingCampaign.delete({
      where: { id },
    });
  }

  async getCampaignDetail(id: string): Promise<MarketingCampaignDetailResult> {
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

  async getCampaignAnalytics(
    campaignId: string,
    filters: MarketingAnalyticsFilters = {},
  ): Promise<MarketingAnalyticsResult> {
    const limit = readIntLike(filters.limit, 100, 1, 500);
    const offset = readIntLike(filters.offset, 0, 0);
    const where = buildMarketingAnalyticsWhere(campaignId, filters);

    const analytics = await this.prisma.marketingAnalytics.findMany({
      where,
      orderBy: { dateKey: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.marketingAnalytics.count({ where });

    return {
      analytics,
      total,
      summary: createAnalyticsSummary(analytics),
    };
  }

  async saveMarketingAnalytics(
    campaignId: string,
    dateKey: string,
    input: SaveMarketingAnalyticsInput,
  ): Promise<MarketingAnalytics> {
    const existing = await this.prisma.marketingAnalytics.findUnique({
      where: {
        campaignId_dateKey: {
          campaignId,
          dateKey,
        },
      },
    });

    const data = buildMarketingAnalyticsData(input);

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
    }

    return this.prisma.marketingAnalytics.create({
      data: {
        campaignId,
        dateKey,
        ...data,
      },
    });
  }

  async addTargetUsers(campaignId: string, userIds: string[]): Promise<Prisma.BatchPayload> {
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

  async getTargetUsers(
    campaignId: string,
    filters: MarketingTargetFilters = {},
  ): Promise<MarketingTargetListResult> {
    const limit = readIntLike(filters.limit, 100, 1, 500);
    const offset = readIntLike(filters.offset, 0, 0);

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

  async updateTargetUserStatus(
    campaignId: string,
    userId: string,
    input: UpdateMarketingTargetStatusInput,
  ): Promise<MarketingCampaignTarget> {
    const data: Prisma.MarketingCampaignTargetUncheckedUpdateInput = {};

    if (input.status !== undefined) {
      data.status = input.status;
    }
    if (input.target !== undefined) {
      data.target = input.target;
    }

    return this.prisma.marketingCampaignTarget.update({
      where: {
        campaignId_userId: {
          campaignId,
          userId,
        },
      },
      data,
    });
  }

  async getCampaignBudget(campaignId: string): Promise<MarketingBudget | null> {
    return this.prisma.marketingBudget.findUnique({
      where: { campaignId },
    });
  }

  async updateCampaignBudget(
    campaignId: string,
    input: UpdateMarketingBudgetInput,
  ): Promise<MarketingBudget> {
    return this.prisma.marketingBudget.upsert({
      where: { campaignId },
      create: buildBudgetCreateData(campaignId, input),
      update: buildBudgetUpdateData(input),
    });
  }

  async getMarketingStats(filters: MarketingStatsFilters = {}): Promise<MarketingStatsResult> {
    const where = buildCampaignDateWhere(filters);

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

  async getCampaignsBySegment(filters: MarketingStatsFilters = {}): Promise<MarketingSegmentStat[]> {
    const where = buildCampaignDateWhere(filters);

    const campaigns = await this.prisma.marketingCampaign.findMany({
      where,
      include: {
        analytics: true,
      },
    });

    const segments: Record<string, MarketingSegmentStat> = {};

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

  async getCampaignsByType(filters: MarketingStatsFilters = {}): Promise<MarketingTypeStat[]> {
    const where = buildCampaignDateWhere(filters);

    const campaigns = await this.prisma.marketingCampaign.findMany({
      where,
      include: {
        analytics: true,
      },
    });

    const types: Record<string, MarketingTypeStat> = {};

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