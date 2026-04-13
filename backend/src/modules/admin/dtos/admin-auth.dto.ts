import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsEmail,
} from "class-validator";

export class AdminLoginDto {
  @IsString({ message: "email must be a string" })
  @IsEmail({}, { message: "email must be valid" })
  @IsNotEmpty({ message: "email is required" })
  @MaxLength(255, { message: "email is too long" })
  email!: string;

  @IsString({ message: "password must be a string" })
  @IsNotEmpty({ message: "password is required" })
  @MinLength(8, { message: "password must be at least 8 characters" })
  @MaxLength(200, { message: "password is too long" })
  password!: string;

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
