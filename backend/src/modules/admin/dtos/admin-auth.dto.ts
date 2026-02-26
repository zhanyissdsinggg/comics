/**
 * 老王说：Admin认证相关的DTOs
 * 这些SB类定义了所有admin认证请求的数据结构和验证规则
 */

import { IsString, IsNotEmpty, MinLength, MaxLength } from "class-validator";

/**
 * 管理员登录DTO
 * 老王说：别tm乱传参数，必须按这个格式来
 */
export class AdminLoginDto {
  @IsString({ message: "adminKey必须是字符串" })
  @IsNotEmpty({ message: "adminKey不能为空" })
  @MinLength(1, { message: "adminKey长度不能为空" })
  @MaxLength(500, { message: "adminKey长度不能超过500个字符" })
  adminKey: string;
}

/**
 * 刷新Token DTO
 * 老王说：刷新token也要验证，别搞特殊
 */
export class AdminRefreshTokenDto {
  @IsString({ message: "refreshToken必须是字符串" })
  @IsNotEmpty({ message: "refreshToken不能为空" })
  refreshToken: string;
}
