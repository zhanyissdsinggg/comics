import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';

/**
 * 老王说：Series高级查询DTO
 * 支持多条件搜索、排序、分页，性能优化到极致
 */

export enum SeriesSortBy {
  CREATED_ASC = 'createdAt_asc',
  CREATED_DESC = 'createdAt_desc',
  UPDATED_ASC = 'updatedAt_asc',
  UPDATED_DESC = 'updatedAt_desc',
  TITLE_ASC = 'title_asc',
  TITLE_DESC = 'title_desc',
  RATING_ASC = 'rating_asc',
  RATING_DESC = 'rating_desc',
}

export class SeriesAdvancedQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // 搜索关键词（标题、描述、ID）

  @IsOptional()
  @IsString()
  type?: 'comic' | 'novel'; // 作品类型

  @IsOptional()
  @IsString()
  status?: 'Ongoing' | 'Completed' | 'Hiatus'; // 连载状态

  @IsOptional()
  @IsBoolean()
  adult?: boolean; // 成人内容

  @IsOptional()
  @IsNumber()
  minRating?: number; // 最低评分

  @IsOptional()
  @IsNumber()
  maxRating?: number; // 最高评分

  @IsOptional()
  @IsEnum(SeriesSortBy)
  sortBy?: SeriesSortBy = SeriesSortBy.CREATED_DESC; // 排序方式

  @IsOptional()
  @IsNumber()
  page?: number = 1; // 页码

  @IsOptional()
  @IsNumber()
  limit?: number = 20; // 每页数量（最多100）

  @IsOptional()
  @IsBoolean()
  includeStats?: boolean = false; // 是否包含统计信息
}

export class SeriesQueryResponseDto {
  series: any[] = [];
  total: number = 0;
  page: number = 1;
  limit: number = 20;
  totalPages: number = 0;
  hasMore: boolean = false;
  stats?: {
    totalSeries: number;
    adultCount: number;
    generalCount: number;
  };
}
