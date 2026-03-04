import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from "class-validator";

export class AdminLoginDto {
  @IsString({ message: "adminKey 必须是字符串" })
  @IsNotEmpty({ message: "adminKey 不能为空" })
  @MinLength(1, { message: "adminKey 长度不能为空" })
  @MaxLength(500, { message: "adminKey 长度不能超过500个字符" })
  adminKey!: string;
}

export class AdminRefreshTokenDto {
  @IsOptional()
  @IsString({ message: "refreshToken 必须是字符串" })
  @IsNotEmpty({ message: "refreshToken 不能为空" })
  refreshToken?: string;
}
