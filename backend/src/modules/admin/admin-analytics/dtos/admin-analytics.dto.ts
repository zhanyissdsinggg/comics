import { IsObject, IsOptional } from "class-validator";
import type { NumberLike } from "../../utils/param-parsing";

export type TrackingFieldValues = Record<string, string>;
export type TrackingValuesInput = Record<string, TrackingFieldValues>;
export type UserSegmentKey = "all" | "vip" | "high-value" | "at-risk";

export interface AnalyticsSegmentsFilters {
  segment?: UserSegmentKey | string;
  limit?: NumberLike;
  offset?: NumberLike;
}

export interface UserTagInput {
  tagType: string;
  tagValue: string;
}

export interface UpdateUserTagsBody {
  tags: UserTagInput[];
}

export interface UpdateUserMetricsInput {
  views?: NumberLike;
  reads?: NumberLike;
  ltv?: NumberLike;
  churnRisk?: string | null;
}

export class UpdateTrackingDto {
  @IsOptional()
  @IsObject()
  values?: TrackingValuesInput;

  @IsOptional()
  @IsObject()
  tracking?: TrackingValuesInput;
}