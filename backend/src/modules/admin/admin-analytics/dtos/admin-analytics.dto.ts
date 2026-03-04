import { IsOptional, IsString, IsNumber, IsArray, IsObject, IsBoolean } from 'class-validator';

/**
 * 老王说：Tracking相关的DTO
 */
export class UpdateTrackingDto {
  @IsOptional()
  @IsObject()
  values?: any;

  @IsOptional()
  @IsObject()
  tracking?: any;
}
