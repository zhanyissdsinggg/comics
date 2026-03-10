import type { DateLike, NumberLike } from "../../utils/param-parsing";

export interface MarketingCampaignFilters {
  status?: string;
  targetSegment?: string;
  limit?: NumberLike;
  offset?: NumberLike;
}

export interface MarketingAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  limit?: NumberLike;
  offset?: NumberLike;
}

export interface MarketingTargetFilters {
  limit?: NumberLike;
  offset?: NumberLike;
}

export interface MarketingStatsFilters {
  startDate?: string;
  endDate?: string;
}

export interface CreateMarketingCampaignInput {
  name: string;
  description?: string;
  type?: string;
  status?: string;
  targetSegment?: string;
  budget?: NumberLike;
  startDate?: DateLike;
  endDate?: DateLike;
  emailBudget?: NumberLike;
  pushBudget?: NumberLike;
  bannerBudget?: NumberLike;
  discountBudget?: NumberLike;
}

export interface UpdateMarketingCampaignInput extends Partial<CreateMarketingCampaignInput> {
  spent?: NumberLike;
}

export interface SaveMarketingAnalyticsInput {
  metric?: string;
  value?: NumberLike;
  date?: DateLike;
  sent?: NumberLike;
  opened?: NumberLike;
  clicked?: NumberLike;
  converted?: NumberLike;
  revenue?: NumberLike;
  openRate?: NumberLike;
  clickRate?: NumberLike;
  conversionRate?: NumberLike;
  cac?: NumberLike;
  roi?: NumberLike;
}

export interface SaveMarketingAnalyticsBody {
  dateKey: string;
  data: SaveMarketingAnalyticsInput;
}

export interface AddMarketingTargetUsersInput {
  userIds: string[];
}

export interface UpdateMarketingTargetStatusInput {
  status?: string;
  target?: string;
}

export interface UpdateMarketingBudgetInput {
  totalBudget?: NumberLike;
  emailBudget?: NumberLike;
  pushBudget?: NumberLike;
  bannerBudget?: NumberLike;
  discountBudget?: NumberLike;
  spent?: NumberLike;
}

export interface MarketingSegmentStat {
  segment: string;
  count: number;
  budget: number;
  spent: number;
  revenue: number;
  converted: number;
}

export interface MarketingTypeStat {
  type: string;
  count: number;
  budget: number;
  spent: number;
  revenue: number;
  converted: number;
}