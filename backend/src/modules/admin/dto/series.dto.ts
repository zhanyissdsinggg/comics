import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';

export class CreateSeriesDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(['comic', 'novel'])
  type?: string;

  @IsOptional()
  @IsBoolean()
  adult?: boolean;

  @IsOptional()
  @IsArray()
  genres?: string[];

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  episodePrice?: number;

  @IsOptional()
  @IsBoolean()
  ttfEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  ttfIntervalHours?: number;
}

export class UpdateSeriesDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['comic', 'novel'])
  type?: string;

  @IsOptional()
  @IsBoolean()
  adult?: boolean;

  @IsOptional()
  @IsArray()
  genres?: string[];

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  episodePrice?: number;

  @IsOptional()
  @IsBoolean()
  ttfEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  ttfIntervalHours?: number;
}
