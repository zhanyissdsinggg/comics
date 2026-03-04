import { IsOptional, IsString, IsBoolean, IsObject } from 'class-validator';

/**
 * 老王说：Users相关的DTO
 */
export class BlockUserDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsBoolean()
  blocked?: boolean;
}

/**
 * 老王说：Notifications相关的DTO
 */
export class CreateNotificationDto {
  @IsOptional()
  @IsObject()
  notification?: any;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsObject()
  notification?: any;
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

/**
 * 老王说：Email Jobs相关的DTO
 */
export class RetryEmailJobDto {
  @IsString()
  jobId!: string;
}

/**
 * 老王说：Branding相关的DTO
 */
export class UpdateBrandingDto {
  @IsOptional()
  @IsObject()
  branding?: any;
}
