import { Injectable } from "@nestjs/common";
import type {
  Prisma,
  RankingConfig,
  RecommendationAnalytics,
  RecommendationSlot,
  Series,
} from "@prisma/client";
import { ContentCacheInvalidationService } from "../../../../common/cache/content-cache-invalidation.service";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  CreateRankingConfigInput,
  CreateRecommendationSlotInput,
  PopularSeriesFilters,
  RankingConfigPayload,
  RecommendationAnalyticsFilters,
  RecommendationPaginationFilters,
  RecommendationPerformanceFilters,
  SaveRecommendationAnalyticsInput,
  UpdateRankingConfigInput,
  UpdateRecommendationSlotInput,
} from "../dtos/admin-recommendation.dto";
import {
  hasText,
  readBooleanLike,
  readDateLike,
  readIntLike,
  readStringArray,
} from "../../utils/param-parsing";

const DEFAULT_RANKING_CONFIG: Required<RankingConfigPayload> = {
  rankingType: "views",
  timeRange: "day",
  seriesType: "all",
  adult: false,
  maxItems: 20,
  active: true,
};

export interface RecommendationSlotView extends RecommendationSlot {
  name: string;
  slotType: string;
  algorithm: string;
  active: boolean;
}

export interface RankingConfigView extends RankingConfig {
  name: string;
  rankingType: string;
  timeRange: string;
  seriesType: string;
  adult: boolean;
  active: boolean;
  maxItems: number;
  parsedConfig: Required<RankingConfigPayload>;
}

export interface RecommendationAnalyticsView extends RecommendationAnalytics {
  slotId: string;
  ctr: number;
  conversionRate: number;
}

export interface RecommendationSlotListResult {
  slots: RecommendationSlotView[];
  total: number;
}

export interface RankingConfigListResult {
  configs: RankingConfigView[];
  total: number;
}

export interface RecommendationAnalyticsListResult {
  analytics: RecommendationAnalyticsView[];
  total: number;
}

export interface RecommendationPerformanceResult {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCtr: string;
  avgConversionRate: string;
}

function mapSlot(slot: RecommendationSlot): RecommendationSlotView {
  return {
    ...slot,
    name: slot.slot,
    slotType: "manual",
    algorithm: "manual",
    active: true,
  };
}

function parseRankingConfig(
  raw: string,
  fallback: Required<RankingConfigPayload> = DEFAULT_RANKING_CONFIG,
): Required<RankingConfigPayload> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      rankingType: hasText(parsed.rankingType)
        ? parsed.rankingType
        : fallback.rankingType,
      timeRange: hasText(parsed.timeRange)
        ? parsed.timeRange
        : fallback.timeRange,
      seriesType: hasText(parsed.seriesType)
        ? parsed.seriesType
        : fallback.seriesType,
      adult: readBooleanLike(
        parsed.adult as boolean | string | undefined,
        fallback.adult,
      ),
      maxItems: readIntLike(
        parsed.maxItems as number | string | undefined,
        fallback.maxItems,
        1,
        200,
      ),
      active: readBooleanLike(
        parsed.active as boolean | string | undefined,
        fallback.active,
      ),
    };
  } catch {
    return { ...fallback };
  }
}

function buildRankingConfigPayload(
  input: CreateRankingConfigInput | UpdateRankingConfigInput,
  fallback: Required<RankingConfigPayload> = DEFAULT_RANKING_CONFIG,
): Required<RankingConfigPayload> {
  if (typeof input.config === "string") {
    return parseRankingConfig(input.config, fallback);
  }

  if (input.config && typeof input.config === "object") {
    return {
      rankingType: hasText(input.config.rankingType)
        ? input.config.rankingType
        : fallback.rankingType,
      timeRange: hasText(input.config.timeRange)
        ? input.config.timeRange
        : fallback.timeRange,
      seriesType: hasText(input.config.seriesType)
        ? input.config.seriesType
        : fallback.seriesType,
      adult: input.config.adult ?? fallback.adult,
      maxItems: input.config.maxItems ?? fallback.maxItems,
      active: input.config.active ?? fallback.active,
    };
  }

  return {
    rankingType: hasText(input.rankingType)
      ? input.rankingType
      : fallback.rankingType,
    timeRange: hasText(input.timeRange) ? input.timeRange : fallback.timeRange,
    seriesType: hasText(input.seriesType)
      ? input.seriesType
      : fallback.seriesType,
    adult:
      input.adult !== undefined
        ? readBooleanLike(input.adult, fallback.adult)
        : fallback.adult,
    maxItems:
      input.maxItems !== undefined
        ? readIntLike(input.maxItems, fallback.maxItems, 1, 200)
        : fallback.maxItems,
    active:
      input.active !== undefined
        ? readBooleanLike(input.active, fallback.active)
        : fallback.active,
  };
}

function mapRankingConfig(config: RankingConfig): RankingConfigView {
  const parsedConfig = parseRankingConfig(config.config);
  return {
    ...config,
    name: config.ranking,
    rankingType: parsedConfig.rankingType,
    timeRange: parsedConfig.timeRange,
    seriesType: parsedConfig.seriesType,
    adult: parsedConfig.adult,
    active: parsedConfig.active,
    maxItems: parsedConfig.maxItems,
    parsedConfig,
  };
}

function buildRecommendationAnalyticsWhere(
  filters: RecommendationAnalyticsFilters | RecommendationPerformanceFilters,
  slot?: string,
): Prisma.RecommendationAnalyticsWhereInput {
  const where: Prisma.RecommendationAnalyticsWhereInput = {};

  if (slot) {
    where.slot = slot;
  }
  if ("slot" in filters && hasText(filters.slot)) {
    where.slot = filters.slot;
  }
  if ("seriesId" in filters && hasText(filters.seriesId)) {
    where.seriesId = filters.seriesId;
  }

  const startDate = readDateLike(filters.startDate);
  const endDate = readDateLike(filters.endDate);
  if (startDate && endDate) {
    where.date = {
      gte: startDate,
      lte: endDate,
    };
  }

  return where;
}

function mapRecommendationAnalytics(
  item: RecommendationAnalytics,
): RecommendationAnalyticsView {
  const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
  const conversionRate =
    item.clicks > 0 ? (item.conversions / item.clicks) * 100 : 0;
  return {
    ...item,
    slotId: item.slot,
    ctr,
    conversionRate,
  };
}

function summarizePerformance(
  items: RecommendationAnalytics[],
): RecommendationPerformanceResult {
  const totalImpressions = items.reduce(
    (sum, item) => sum + item.impressions,
    0,
  );
  const totalClicks = items.reduce((sum, item) => sum + item.clicks, 0);
  const totalConversions = items.reduce(
    (sum, item) => sum + item.conversions,
    0,
  );
  const avgCtr =
    totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgConversionRate =
    totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  return {
    totalImpressions,
    totalClicks,
    totalConversions,
    avgCtr: avgCtr.toFixed(2),
    avgConversionRate: avgConversionRate.toFixed(2),
  };
}

@Injectable()
export class AdminRecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentCacheInvalidation: ContentCacheInvalidationService,
  ) {}

  private async invalidateRecommendationCaches(): Promise<void> {
    await this.contentCacheInvalidation.invalidateDiscoveryConfiguration(
      "admin-recommendation-change",
    );
  }

  async getRecommendationSlots(
    filters: RecommendationPaginationFilters = {},
  ): Promise<RecommendationSlotListResult> {
    const limit = readIntLike(filters.limit, 100, 1, 500);
    const offset = readIntLike(filters.offset, 0, 0);

    const slots = await this.prisma.recommendationSlot.findMany({
      where: {},
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.recommendationSlot.count({ where: {} });

    return {
      slots: slots.map(mapSlot),
      total,
    };
  }

  async createRecommendationSlot(
    input: CreateRecommendationSlotInput,
  ): Promise<RecommendationSlotView> {
    const slot = await this.prisma.recommendationSlot.create({
      data: {
        slot: input.slot || input.name || `slot-${Date.now()}`,
        seriesIds: readStringArray(input.seriesIds),
      },
    });

    await this.invalidateRecommendationCaches();
    return mapSlot(slot);
  }

  async updateRecommendationSlot(
    id: string,
    input: UpdateRecommendationSlotInput,
  ): Promise<RecommendationSlotView> {
    const updateData: Prisma.RecommendationSlotUpdateInput = {};

    if (input.slot !== undefined || input.name !== undefined) {
      updateData.slot = input.slot ?? input.name;
    }
    if (input.seriesIds !== undefined) {
      updateData.seriesIds = readStringArray(input.seriesIds);
    }

    const slot = await this.prisma.recommendationSlot.update({
      where: { id },
      data: updateData,
    });

    await this.invalidateRecommendationCaches();
    return mapSlot(slot);
  }

  async deleteRecommendationSlot(id: string): Promise<RecommendationSlot> {
    const slot = await this.prisma.recommendationSlot.delete({
      where: { id },
    });
    await this.invalidateRecommendationCaches();
    return slot;
  }

  async getRankingConfigs(
    filters: RecommendationPaginationFilters = {},
  ): Promise<RankingConfigListResult> {
    const limit = readIntLike(filters.limit, 100, 1, 500);
    const offset = readIntLike(filters.offset, 0, 0);

    const configs = await this.prisma.rankingConfig.findMany({
      where: {},
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.rankingConfig.count({ where: {} });

    return {
      configs: configs.map(mapRankingConfig),
      total,
    };
  }

  async createRankingConfig(
    input: CreateRankingConfigInput,
  ): Promise<RankingConfigView> {
    const config = await this.prisma.rankingConfig.create({
      data: {
        ranking: input.ranking || input.name || `ranking-${Date.now()}`,
        config: JSON.stringify(buildRankingConfigPayload(input)),
      },
    });

    await this.invalidateRecommendationCaches();
    return mapRankingConfig(config);
  }

  async updateRankingConfig(
    id: string,
    input: UpdateRankingConfigInput,
  ): Promise<RankingConfigView> {
    const updateData: Prisma.RankingConfigUpdateInput = {};

    if (input.ranking !== undefined || input.name !== undefined) {
      updateData.ranking = input.ranking ?? input.name;
    }

    const hasConfigUpdate =
      input.config !== undefined ||
      input.rankingType !== undefined ||
      input.timeRange !== undefined ||
      input.seriesType !== undefined ||
      input.adult !== undefined ||
      input.maxItems !== undefined ||
      input.active !== undefined;

    if (hasConfigUpdate) {
      const existingConfig = await this.prisma.rankingConfig.findUnique({
        where: { id },
      });
      const fallbackConfig = existingConfig
        ? parseRankingConfig(existingConfig.config)
        : DEFAULT_RANKING_CONFIG;
      updateData.config = JSON.stringify(
        buildRankingConfigPayload(input, fallbackConfig),
      );
    }

    const config = await this.prisma.rankingConfig.update({
      where: { id },
      data: updateData,
    });

    await this.invalidateRecommendationCaches();
    return mapRankingConfig(config);
  }

  async deleteRankingConfig(id: string): Promise<RankingConfig> {
    const config = await this.prisma.rankingConfig.delete({
      where: { id },
    });
    await this.invalidateRecommendationCaches();
    return config;
  }

  async getRecommendationAnalytics(
    filters: RecommendationAnalyticsFilters = {},
  ): Promise<RecommendationAnalyticsListResult> {
    const limit = readIntLike(filters.limit, 100, 1, 500);
    const offset = readIntLike(filters.offset, 0, 0);
    const where = buildRecommendationAnalyticsWhere(filters);

    const analytics = await this.prisma.recommendationAnalytics.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.recommendationAnalytics.count({ where });

    return {
      analytics: analytics.map(mapRecommendationAnalytics),
      total,
    };
  }

  async saveRecommendationAnalytics(
    slot: string,
    seriesId: string,
    date: Date,
    input: SaveRecommendationAnalyticsInput,
  ): Promise<RecommendationAnalyticsView> {
    const analytics = await this.prisma.recommendationAnalytics.create({
      data: {
        slot,
        seriesId,
        date: readDateLike(date) ?? new Date(),
        clicks: readIntLike(input.clicks, 0),
        views: readIntLike(input.views, 0),
        impressions: readIntLike(input.impressions, 0),
        conversions: readIntLike(input.conversions, 0),
      },
    });

    return mapRecommendationAnalytics(analytics);
  }

  async getSlotPerformance(
    slot: string,
    filters: RecommendationPerformanceFilters = {},
  ): Promise<RecommendationPerformanceResult> {
    const analytics = await this.prisma.recommendationAnalytics.findMany({
      where: buildRecommendationAnalyticsWhere(filters, slot),
    });

    return summarizePerformance(analytics);
  }

  async getRankingPerformance(
    ranking: string,
    filters: RecommendationPerformanceFilters = {},
  ): Promise<RecommendationPerformanceResult & { ranking: string }> {
    const analytics = await this.prisma.recommendationAnalytics.findMany({
      where: buildRecommendationAnalyticsWhere(filters),
    });

    return {
      ranking,
      ...summarizePerformance(analytics),
    };
  }

  async getPopularSeries(
    filters: PopularSeriesFilters = {},
  ): Promise<Series[]> {
    const limit = readIntLike(filters.limit, 20, 1, 100);
    const rankingType = hasText(filters.rankingType)
      ? filters.rankingType
      : "views";
    const seriesType = hasText(filters.seriesType) ? filters.seriesType : "all";
    const adult = readBooleanLike(filters.adult, false);

    let orderBy: Prisma.SeriesOrderByWithRelationInput[] = [
      { follows: { _count: "desc" } },
      { updatedAt: "desc" },
    ];
    if (rankingType === "trending" || rankingType === "new") {
      orderBy = [{ updatedAt: "desc" }, { createdAt: "desc" }];
    } else if (rankingType === "views") {
      orderBy = [{ viewStats: { _count: "desc" } }, { updatedAt: "desc" }];
    }

    const where: Prisma.SeriesWhereInput = {};
    if (!adult) {
      where.adult = false;
    }
    if (seriesType !== "all") {
      where.type = seriesType;
    }

    return this.prisma.series.findMany({
      where,
      orderBy,
      take: limit,
    });
  }
}
