import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, IsArray } from 'class-validator';

export class CreateEpisodeDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNumber()
  number!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsDateString()
  releasedAt?: string;

  @IsOptional()
  @IsNumber()
  pricePts?: number;

  @IsOptional()
  @IsBoolean()
  ttfEligible?: boolean;

  @IsOptional()
  @IsNumber()
  previewFreePages?: number;

  @IsOptional()
  @IsArray()
  pages?: any[];

  @IsOptional()
  @IsArray()
  paragraphs?: string[];
}

export class BulkCreateEpisodesDto {
  @IsNumber()
  count!: number;

  @IsNumber()
  pricePts!: number;
}

export class UpdateEpisodeDto {
  @IsOptional()
  @IsNumber()
  number?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  releasedAt?: string;

  @IsOptional()
  @IsNumber()
  pricePts?: number;

  @IsOptional()
  @IsBoolean()
  ttfEligible?: boolean;

  @IsOptional()
  @IsNumber()
  previewFreePages?: number;
}
