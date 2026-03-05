import { IsOptional, IsString, IsNumber, IsArray, IsObject, IsBoolean } from 'class-validator';

/**
 * 老王说：通用Admin DTO集合
 * 这些SB DTO用来处理各种admin controllers的body参数
 */

// Branding
export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  siteLogoUrl?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  homeBannerUrl?: string;

  @IsOptional()
  @IsObject()
  branding?: any;
}

// Comments
export class HideCommentDto {
  @IsOptional()
  @IsString()
  seriesId?: string;

  @IsOptional()
  @IsString()
  commentId?: string;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;
}

export class RecalcRatingDto {
  @IsOptional()
  @IsString()
  seriesId?: string;
}

// Email Jobs
export class RetryEmailJobDto {
  @IsOptional()
  @IsString()
  jobId?: string;
}

// Email
export class SaveEmailConfigDto {
  @IsOptional()
  resendApiKey?: string;

  @IsOptional()
  sendgridApiKey?: string;

  @IsOptional()
  smsWebhookUrl?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  adminNotifyEmail?: string;

  @IsOptional()
  @IsString()
  testRecipient?: string;
}

export class TestEmailDto {
  @IsOptional()
  @IsString()
  to?: string;
}

// Notifications
export class CreateNotificationDto {
  @IsOptional()
  @IsObject()
  notification?: any;
}

// Orders
export class RefundOrderDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  paidDelta?: number | string;

  @IsOptional()
  bonusDelta?: number | string;
}

export class AdjustWalletDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  paidDelta?: number | string;

  @IsOptional()
  bonusDelta?: number | string;
}

// Promotions
export class UpdatePromotionDefaultsDto {
  @IsOptional()
  @IsObject()
  defaults?: any;
}

export class CreatePromotionDto {
  @IsOptional()
  @IsObject()
  promotion?: any;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsObject()
  promotion?: any;
}

// Regions
export class SaveRegionConfigDto {
  @IsOptional()
  countryCodes?: any[];

  @IsOptional()
  lengthRules?: any;
}

// Series Episodes
export class CreateEpisodeDto {
  @IsOptional()
  @IsObject()
  episode?: any;
}

export class BulkCreateEpisodesDto {
  @IsOptional()
  count?: number | string;

  @IsOptional()
  pricePts?: number | string;
}

export class BulkUpdateEpisodesDto {
  @IsOptional()
  @IsArray()
  ids?: string[];

  @IsOptional()
  @IsObject()
  updates?: any;
}

export class BulkDeleteEpisodesDto {
  @IsOptional()
  @IsArray()
  ids?: string[];
}

export class UploadEpisodesDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  startNumber?: number | string;
}

// Tracking
export class SaveTrackingDto {
  @IsOptional()
  @IsObject()
  values?: any;
}

// Users
export class BlockUserDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  blocked?: boolean;
}

// Billing
export class CreateTopupDto {
  @IsOptional()
  packageId?: string;

  @IsOptional()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  amount?: number | string;

  @IsOptional()
  paidPts?: number | string;

  @IsOptional()
  bonusPts?: number | string;

  @IsOptional()
  price?: number | string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UpdateTopupDto {
  @IsOptional()
  paidPts?: number | string;

  @IsOptional()
  bonusPts?: number | string;

  @IsOptional()
  price?: number | string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

// Episodes
export class UpdateEpisodeDto {
  @IsOptional()
  @IsObject()
  episode?: any;
}
