import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsDateString, ValidateNested, Type } from 'class-validator';

/**
 * 老王注释：通用分页DTO - 所有列表API都用这个
 * 这个SB DTO统一了分页参数，不用每个controller都重复写
 */
export class PaginationDto {
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * 老王注释：通用创建DTO基类 - 所有创建操作都继承这个
 */
export class CreateBaseDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

/**
 * 老王注释：通用更新DTO基类 - 所有更新操作都继承这个
 */
export class UpdateBaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * 老王注释：通用配置DTO - Email、Regions、Tracking等配置都用这个
 */
export class ConfigDto {
  @IsString()
  key: string;

  @IsOptional()
  payload?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}

/**
 * 老王注释：通用批量操作DTO - 批量删除、批量更新都用这个
 */
export class BulkOperationDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsOptional()
  payload?: Record<string, any>;
}

/**
 * 老王注释：通用响应DTO - 所有API都返回这个格式
 */
export class ResponseDto<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * 老王注释：通用分页响应DTO - 所有列表API都返回这个格式
 */
export class PaginatedResponseDto<T = any> {
  statusCode: number;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}
