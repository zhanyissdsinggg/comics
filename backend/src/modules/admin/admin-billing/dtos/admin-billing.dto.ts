import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

type OrderPayload = Record<string, unknown>;

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

export class CreateOrderDto {
  @IsOptional()
  @IsObject()
  values?: OrderPayload;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  paidDelta?: number | string;

  @IsOptional()
  bonusDelta?: number | string;

  @IsOptional()
  @IsObject()
  order?: OrderPayload;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsObject()
  order?: OrderPayload;
}
