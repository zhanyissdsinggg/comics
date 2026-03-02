/**
 * 老王说：Admin促销管理相关的DTOs
 * 这些SB类定义了所有促销管理请求的数据结构和验证规则
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsDate,
  IsEnum,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 促销类型枚举
 * 老王说：促销类型必须是这几个，别tm乱来
 */
export enum PromotionType {
  DISCOUNT = "discount",
  COUPON = "coupon",
  BUNDLE = "bundle",
  SEASONAL = "seasonal",
}

/**
 * 创建促销DTO
 * 老王说：创建促销必须按这个格式，别tm乱传参数
 */
export class CreatePromotionDto {
  @IsString({ message: "促销名称必须是字符串" })
  @IsNotEmpty({ message: "促销名称不能为空" })
  name: string;

  @IsString({ message: "促销描述必须是字符串" })
  @IsOptional()
  description?: string;

  @IsEnum(PromotionType, { message: "促销类型必须是有效的类型" })
  @IsNotEmpty({ message: "促销类型不能为空" })
  type: PromotionType;

  @IsNumber({}, { message: "折扣率必须是数字" })
  @Min(0, { message: "折扣率不能为负数" })
  @Max(100, { message: "折扣率不能超过100" })
  @IsOptional()
  discountRate?: number;

  @IsNumber({}, { message: "折扣金额必须是数字" })
  @Min(0, { message: "折扣金额不能为负数" })
  @IsOptional()
  discountAmount?: number;

  @IsDate({ message: "开始时间必须是有效的日期" })
  @IsNotEmpty({ message: "开始时间不能为空" })
  @Type(() => Date)
  startDate: Date;

  @IsDate({ message: "结束时间必须是有效的日期" })
  @IsNotEmpty({ message: "结束时间不能为空" })
  @Type(() => Date)
  endDate: Date;

  @IsNumber({}, { message: "最大使用次数必须是数字" })
  @Min(0, { message: "最大使用次数不能为负数" })
  @IsOptional()
  maxUsage?: number;
}

/**
 * 更新促销DTO
 * 老王说：更新促销信息，这些字段都是可选的
 */
export class UpdatePromotionDto {
  @IsString({ message: "促销名称必须是字符串" })
  @IsOptional()
  name?: string;

  @IsString({ message: "促销描述必须是字符串" })
  @IsOptional()
  description?: string;

  @IsEnum(PromotionType, { message: "促销类型必须是有效的类型" })
  @IsOptional()
  type?: PromotionType;

  @IsNumber({}, { message: "折扣率必须是数字" })
  @Min(0, { message: "折扣率不能为负数" })
  @Max(100, { message: "折扣率不能超过100" })
  @IsOptional()
  discountRate?: number;

  @IsNumber({}, { message: "折扣金额必须是数字" })
  @Min(0, { message: "折扣金额不能为负数" })
  @IsOptional()
  discountAmount?: number;

  @IsDate({ message: "开始时间必须是有效的日期" })
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate({ message: "结束时间必须是有效的日期" })
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsNumber({}, { message: "最大使用次数必须是数字" })
  @Min(0, { message: "最大使用次数不能为负数" })
  @IsOptional()
  maxUsage?: number;
}

/**
 * 查询促销列表DTO
 * 老王说：分页查询必须按这个格式
 */
export class QueryPromotionsDto {
  @IsNumber({}, { message: "页码必须是数字" })
  @Min(1, { message: "页码不能小于1" })
  @IsOptional()
  page?: number = 1;

  @IsNumber({}, { message: "每页数量必须是数字" })
  @Min(1, { message: "每页数量不能小于1" })
  @Max(100, { message: "每页数量不能超过100" })
  @IsOptional()
  pageSize?: number = 20;

  @IsEnum(PromotionType, { message: "促销类型必须是有效的类型" })
  @IsOptional()
  type?: PromotionType;

  @IsString({ message: "搜索关键词必须是字符串" })
  @IsOptional()
  search?: string;
}
