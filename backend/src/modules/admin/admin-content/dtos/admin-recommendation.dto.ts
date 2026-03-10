import type { DateLike, BooleanLike, NumberLike } from "../../utils/param-parsing";

export interface RecommendationPaginationFilters {
  limit?: NumberLike;
  offset?: NumberLike;
}

export interface RecommendationAnalyticsFilters extends RecommendationPaginationFilters {
  slot?: string;
  seriesId?: string;
  startDate?: string;
  endDate?: string;
}

export interface RecommendationPerformanceFilters {
  startDate?: string;
  endDate?: string;
}

export interface PopularSeriesFilters {
  rankingType?: string;
  seriesType?: string;
  adult?: BooleanLike;
  limit?: NumberLike;
}

export interface CreateRecommendationSlotInput {
  slot?: string;
  name?: string;
  seriesIds?: string[];
}

export type UpdateRecommendationSlotInput = Partial<CreateRecommendationSlotInput>;

export interface RankingConfigPayload {
  rankingType?: string;
  timeRange?: string;
  seriesType?: string;
  adult?: boolean;
  maxItems?: number;
  active?: boolean;
}

export interface CreateRankingConfigInput {
  ranking?: string;
  name?: string;
  config?: RankingConfigPayload | string;
  rankingType?: string;
  timeRange?: string;
  seriesType?: string;
  adult?: BooleanLike;
  maxItems?: NumberLike;
  active?: BooleanLike;
}

export type UpdateRankingConfigInput = Partial<CreateRankingConfigInput>;

export interface SaveRecommendationAnalyticsInput {
  clicks?: NumberLike;
  views?: NumberLike;
  impressions?: NumberLike;
  conversions?: NumberLike;
}

export interface SaveRecommendationAnalyticsBody {
  slotId: string;
  seriesId: string;
  dateKey: string;
  data: SaveRecommendationAnalyticsInput;
}