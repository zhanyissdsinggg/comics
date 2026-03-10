import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";
import type { BrandingConfig } from "../../../branding/branding.config";
import type { EmailConfigInput } from "../../../email/email-config";

export type NotificationPayloadInput = {
  userId?: string;
  type?: string;
  title?: string;
  message?: string;
  seriesId?: string | null;
  episodeId?: string | null;
  broadcast?: boolean;
};

export type RegionCodeInput = {
  code?: string;
  label?: string;
};

export type PhoneLengthRules = Record<string, number[]>;

export type RegionConfigInput = {
  countryCodes?: RegionCodeInput[];
  lengthRules?: PhoneLengthRules;
};

export type TestEmailPayloadInput = {
  to?: string;
};

export type BrandingPayloadInput = Partial<
  Pick<BrandingConfig, "siteLogoUrl" | "faviconUrl" | "homeBannerUrl">
>;

export class BlockUserDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsBoolean()
  blocked?: boolean;
}

export class CreateNotificationDto {
  @IsOptional()
  @IsObject()
  notification?: NotificationPayloadInput;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsObject()
  notification?: NotificationPayloadInput;
}

export class CreateRegionDto {
  @IsOptional()
  @IsObject()
  region?: RegionConfigInput;
}

export class UpdateRegionDto {
  @IsOptional()
  @IsObject()
  region?: RegionConfigInput;
}

export class UpdateEmailConfigDto {
  @IsOptional()
  @IsObject()
  config?: EmailConfigInput;
}

export class TestEmailDto {
  @IsOptional()
  @IsObject()
  email?: TestEmailPayloadInput;
}

export class RetryEmailJobDto {
  @IsString()
  jobId!: string;
}

export class UpdateBrandingDto {
  @IsOptional()
  @IsObject()
  branding?: BrandingPayloadInput;
}
