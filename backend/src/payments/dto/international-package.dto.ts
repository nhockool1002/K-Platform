import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInternationalPackageDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsNumber({}, { message: 'amountUsd phải là số' })
  @Min(0.01)
  amountUsd!: number;

  @IsUrl({ require_protocol: true }, { message: 'bmcUrl phải là URL hợp lệ (có https://)' })
  bmcUrl!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class UpdateInternationalPackageDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsNumber({}, { message: 'amountUsd phải là số' })
  @Min(0.01)
  amountUsd?: number;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'bmcUrl phải là URL hợp lệ (có https://)' })
  bmcUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}
