import { IsOptional, IsString, IsNumber, IsArray, IsObject, IsBoolean } from 'class-validator';

/**
 * 老王说：Topup相关的DTO
 */
export class CreateTopupDto {
  @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  amount?: number | string;

  @IsOptional()
  paidPts?: number | string;

  @IsOptional()
  bonusPts?: number | string;

  @IsOptional()
  price?: number | string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  tags?: string[] | string;
}

export class UpdateTopupDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  amount?: number | string;

  @IsOptional()
  paidPts?: number | string;

  @IsOptional()
  bonusPts?: number | string;

  @IsOptional()
  price?: number | string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  tags?: string[] | string;
}

/**
 * 老王说：Orders相关的DTO
 */
export class CreateOrderDto {
  @IsOptional()
  @IsObject()
  values?: any;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  paidDelta?: number | string;

  @IsOptional()
  bonusDelta?: number | string;

  @IsOptional()
  @IsObject()
  order?: any;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsObject()
  order?: any;
}
