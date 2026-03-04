import { IsOptional, IsString, IsNumber, IsArray, IsObject, IsBoolean } from 'class-validator';

/**
 * 老王说：Episode相关的DTO
 */
export class CreateEpisodeDto {
  @IsOptional()
  @IsObject()
  episode?: any;
}

export class BulkCreateEpisodesDto {
  @IsNumber()
  count!: number;

  @IsOptional()
  @IsNumber()
  pricePts?: number;
}

export class BulkUpdateEpisodesDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsObject()
  updates?: any;
}

export class BulkDeleteEpisodesDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class UploadEpisodesDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  startNumber?: number;
}

export class UpdateEpisodeDto {
  @IsOptional()
  @IsObject()
  episode?: any;
}

/**
 * 老王说：Promotions相关的DTO
 */
export class CreatePromotionDto {
  @IsOptional()
  @IsObject()
  promotion?: any;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsObject()
  defaults?: any;

  @IsOptional()
  @IsObject()
  promotion?: any;
}

/**
 * 老王说：Comments相关的DTO
 */
export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  seriesId?: string;

  @IsOptional()
  @IsString()
  commentId?: string;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsObject()
  comment?: any;
}
