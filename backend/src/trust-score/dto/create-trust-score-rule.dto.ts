import { IsInt, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// B-05 — Admin tự tạo thêm lý do +/- Trust Score qua CMS ("tôi sẽ nghĩ ra
// thêm lý do khác để trừ" — yêu cầu gốc). Luôn tạo với isSystem=false (chỉ
// chọn thủ công lúc Admin +/- điểm tay cho 1 tài khoản, không tự động trigger).
export class CreateTrustScoreRuleDto {
  @IsString({ message: 'code phải là chuỗi' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'code chỉ gồm chữ hoa, số và dấu gạch dưới' })
  @MinLength(3, { message: 'code phải có ít nhất 3 ký tự' })
  @MaxLength(50, { message: 'code tối đa 50 ký tự' })
  code!: string;

  @IsString({ message: 'label phải là chuỗi' })
  @MinLength(3, { message: 'label phải có ít nhất 3 ký tự' })
  @MaxLength(200, { message: 'label tối đa 200 ký tự' })
  label!: string;

  @IsInt({ message: 'points phải là số nguyên' })
  points!: number;
}
