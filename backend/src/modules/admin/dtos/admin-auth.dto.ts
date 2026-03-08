import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from "class-validator";

export class AdminLoginDto {
  @IsString({ message: "adminKey must be a string" })
  @IsNotEmpty({ message: "adminKey is required" })
  @MinLength(1, { message: "adminKey cannot be empty" })
  @MaxLength(500, { message: "adminKey is too long" })
  adminKey!: string;

  @IsOptional()
  @IsString({ message: "totpCode must be a string" })
  @Matches(/^\d{6}$/, { message: "totpCode must be a 6-digit code" })
  totpCode?: string;
}

export class AdminRefreshTokenDto {
  @IsOptional()
  @IsString({ message: "refreshToken must be a string" })
  @IsNotEmpty({ message: "refreshToken cannot be empty" })
  refreshToken?: string;
}
