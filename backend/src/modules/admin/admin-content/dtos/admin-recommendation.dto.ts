import { Transform, Type } from "class-transformer";
import type { BooleanLike, NumberLike } from "../../utils/param-parsing";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
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

function toOptionalBoolean(value: unknown): boolean | unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return value;
}

function parseConfigPayload(value: unknown): unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  return value;
}

export class RecommendationPaginationFiltersDto {
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

export class RecommendationAnalyticsFiltersDto extends RecommendationPaginationFiltersDto {
  @IsOptional()
  @IsString()
  slot?: string;

  @IsOptional()
  @IsString()
  seriesId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class RecommendationPerformanceFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PopularSeriesFiltersDto {
  @IsOptional()
  @IsString()
  rankingType?: string;

  @IsOptional()
  @IsString()
  seriesType?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  adult?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateRecommendationSlotDto {
  @ValidateIf((input) => !input.name)
  @IsString()
  @IsNotEmpty()
  slot?: string;

  @ValidateIf((input) => !input.slot)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seriesIds?: string[];
}

export class UpdateRecommendationSlotDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slot?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seriesIds?: string[];
}

export class RankingConfigPayloadDto {
  @IsOptional()
  @IsString()
  rankingType?: string;

  @IsOptional()
  @IsString()
  timeRange?: string;

  @IsOptional()
  @IsString()
  seriesType?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  adult?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(1)
  @Max(200)
  maxItems?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  active?: boolean;
}

export class CreateRankingConfigDto {
  @ValidateIf((input) => !input.name)
  @IsString()
  @IsNotEmpty()
  ranking?: string;

  @ValidateIf((input) => !input.ranking)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => parseConfigPayload(value))
  @ValidateNested()
  @Type(() => RankingConfigPayloadDto)
  config?: RankingConfigPayloadDto;

  @IsOptional()
  @IsString()
  rankingType?: string;

  @IsOptional()
  @IsString()
  timeRange?: string;

  @IsOptional()
  @IsString()
  seriesType?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  adult?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(1)
  @Max(200)
  maxItems?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  active?: boolean;
}

export class UpdateRankingConfigDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ranking?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => parseConfigPayload(value))
  @ValidateNested()
  @Type(() => RankingConfigPayloadDto)
  config?: RankingConfigPayloadDto;

  @IsOptional()
  @IsString()
  rankingType?: string;

  @IsOptional()
  @IsString()
  timeRange?: string;

  @IsOptional()
  @IsString()
  seriesType?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  adult?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(1)
  @Max(200)
  maxItems?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  active?: boolean;
}

export class SaveRecommendationAnalyticsInputDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(0)
  clicks?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(0)
  views?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(0)
  impressions?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(0)
  conversions?: number;
}

export class SaveRecommendationAnalyticsBodyDto {
  @IsString()
  @IsNotEmpty()
  slotId!: string;

  @IsString()
  @IsNotEmpty()
  seriesId!: string;

  @IsDateString()
  dateKey!: string;

  @ValidateNested()
  @Type(() => SaveRecommendationAnalyticsInputDto)
  data!: SaveRecommendationAnalyticsInputDto;
}

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
