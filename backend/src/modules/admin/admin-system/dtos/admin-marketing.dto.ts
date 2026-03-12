import { Transform, Type } from "class-transformer";
import type { DateLike, NumberLike } from "../../utils/param-parsing";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return typeof value === "number" ? value : Number(value);
}

function toOptionalInteger(value: unknown): number | undefined {
  const parsed = toOptionalNumber(value);
  if (parsed === undefined) {
    return undefined;
  }

  return Number.isFinite(parsed) ? Math.trunc(parsed) : parsed;
}

export class MarketingCampaignFiltersDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  targetSegment?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(0)
  offset?: number;
}

export class MarketingAnalyticsFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(0)
  offset?: number;
}

export class MarketingTargetFiltersDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(0)
  offset?: number;
}

export class MarketingStatsFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateMarketingCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  targetSegment?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  emailBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  pushBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  bannerBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  discountBudget?: number;
}

export class UpdateMarketingCampaignDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  targetSegment?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  emailBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  pushBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  bannerBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  discountBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  spent?: number;
}

export class SaveMarketingAnalyticsInputDto {
  @IsOptional()
  @IsString()
  metric?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  sent?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  opened?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  clicked?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  converted?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  revenue?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  openRate?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  clickRate?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  conversionRate?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  cac?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  roi?: number;
}

export class SaveMarketingAnalyticsBodyDto {
  @IsDateString()
  dateKey!: string;

  @ValidateNested()
  @Type(() => SaveMarketingAnalyticsInputDto)
  data!: SaveMarketingAnalyticsInputDto;
}

export class AddMarketingTargetUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds!: string[];
}

export class UpdateMarketingTargetStatusDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  target?: string;
}

export class UpdateMarketingBudgetDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  totalBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  emailBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  pushBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  bannerBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  discountBudget?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  spent?: number;
}

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
