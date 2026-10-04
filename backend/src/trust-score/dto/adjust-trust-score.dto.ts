import { IsInt, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';

// B-05 — Admin +/- Trust Score trực tiếp cho 1 tài khoản bất kỳ. `ruleCode`
// tuỳ chọn (chọn từ danh sách lý do có sẵn) — để trống thì bắt buộc có `note`
// giải thích lý do tự do.
export class AdjustTrustScoreDto {
  @IsInt({ message: 'delta phải là số nguyên' })
  @NotEquals(0, { message: 'delta phải khác 0' })
  delta!: number;

  @IsOptional()
  @IsString({ message: 'ruleCode phải là chuỗi' })
  ruleCode?: string;

  @IsOptional()
  @IsString({ message: 'note phải là chuỗi' })
  @MaxLength(500, { message: 'note tối đa 500 ký tự' })
  note?: string;
}
