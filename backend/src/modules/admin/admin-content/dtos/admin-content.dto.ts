import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from "class-validator";

type LooseObject = Record<string, unknown>;

export class CreateEpisodeDto {
  @IsOptional()
  @IsObject()
  episode?: LooseObject;
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
  updates?: LooseObject;
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
  episode?: LooseObject;
}

export class CreatePromotionDto {
  @IsOptional()
  @IsObject()
  promotion?: LooseObject;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsObject()
  defaults?: LooseObject;

  @IsOptional()
  @IsObject()
  promotion?: LooseObject;
}

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
  comment?: LooseObject;
}
