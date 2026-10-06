import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// `code` không đổi được sau khi tạo — là định danh ổn định mà code hệ thống
// tham chiếu tới (vd. DISPUTE_LOST) cho các rule isSystem=true.
export class UpdateTrustScoreRuleDto {
  @IsOptional()
  @IsString({ message: 'label phải là chuỗi' })
  @MinLength(3, { message: 'label phải có ít nhất 3 ký tự' })
  @MaxLength(200, { message: 'label tối đa 200 ký tự' })
  label?: string;

  @IsOptional()
  @IsInt({ message: 'points phải là số nguyên' })
  points?: number;

  @IsOptional()
  @IsBoolean({ message: 'active phải là boolean' })
  active?: boolean;
}
