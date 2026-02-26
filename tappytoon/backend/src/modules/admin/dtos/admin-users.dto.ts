/**
 * 老王说：Admin用户管理相关的DTOs
 * 这些SB类定义了所有用户管理请求的数据结构和验证规则
 */

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from "class-validator";

/**
 * 创建用户DTO
 * 老王说：创建用户必须按这个格式，别tm乱来
 */
export class CreateUserDto {
  @IsEmail({}, { message: "邮箱格式不正确" })
  @IsNotEmpty({ message: "邮箱不能为空" })
  email: string;

  @IsString({ message: "密码必须是字符串" })
  @IsNotEmpty({ message: "密码不能为空" })
  password: string;
}

/**
 * 更新用户DTO
 * 老王说：更新用户信息，这些字段都是可选的
 */
export class UpdateUserDto {
  @IsEmail({}, { message: "邮箱格式不正确" })
  @IsOptional()
  email?: string;

  @IsString({ message: "昵称必须是字符串" })
  @IsOptional()
  nickname?: string;

  @IsNumber({}, { message: "年龄必须是数字" })
  @Min(0, { message: "年龄不能为负数" })
  @Max(150, { message: "年龄不能超过150岁" })
  @IsOptional()
  age?: number;
}

/**
 * 查询用户列表DTO
 * 老王说：分页查询必须按这个格式
 */
export class QueryUsersDto {
  @IsNumber({}, { message: "页码必须是数字" })
  @Min(1, { message: "页码不能小于1" })
  @IsOptional()
  page?: number = 1;

  @IsNumber({}, { message: "每页数量必须是数字" })
  @Min(1, { message: "每页数量不能小于1" })
  @Max(100, { message: "每页数量不能超过100" })
  @IsOptional()
  pageSize?: number = 20;

  @IsString({ message: "搜索关键词必须是字符串" })
  @IsOptional()
  search?: string;
}

/**
 * 禁用用户DTO
 * 老王说：禁用用户需要提供原因
 */
export class DisableUserDto {
  @IsString({ message: "原因必须是字符串" })
  @IsNotEmpty({ message: "原因不能为空" })
  reason: string;
}
