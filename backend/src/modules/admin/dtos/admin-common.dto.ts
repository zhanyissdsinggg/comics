import { IsOptional, IsString, IsArray, IsObject } from 'class-validator';

/**
 * 老王说：Promotions相关的DTO
 */
export class CreatePromotionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  promotion?: any;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  promotion?: any;
}

export class UpdatePromotionDefaultsDto {
  @IsOptional()
  @IsObject()
  defaults?: any;
}

export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class BulkUpdateDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsObject()
  updates?: any;
}

/**
 * 老王说：Billing相关的DTO
 */
export class CreateBillingDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsObject()
  package?: any;
}

export class UpdateBillingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  package?: any;
}

/**
 * 老王说：Notifications相关的DTO
 */
export class CreateNotificationDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  notification?: any;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  notification?: any;
}

/**
 * 老王说：Comments相关的DTO
 */
export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  comment?: any;
}

/**
 * 老王说：Rankings相关的DTO
 */
export class CreateRankingDto {
  @IsOptional()
  @IsObject()
  ranking?: any;
}

export class UpdateRankingDto {
  @IsOptional()
  @IsObject()
  ranking?: any;
}

/**
 * 老王说：Tracking相关的DTO
 */
export class UpdateTrackingDto {
  @IsOptional()
  @IsObject()
  tracking?: any;
}

/**
 * 老王说：Regions相关的DTO
 */
export class CreateRegionDto {
  @IsOptional()
  @IsObject()
  region?: any;
}

export class UpdateRegionDto {
  @IsOptional()
  @IsObject()
  region?: any;
}

/**
 * 老王说：Branding相关的DTO
 */
export class UpdateBrandingDto {
  @IsOptional()
  @IsObject()
  branding?: any;
}

/**
 * 老王说：Email相关的DTO
 */
export class UpdateEmailConfigDto {
  @IsOptional()
  @IsObject()
  config?: any;
}

export class TestEmailDto {
  @IsOptional()
  @IsObject()
  email?: any;
}

