import { IsInt, Min } from 'class-validator';

// CMS "Cài Đặt" → "Cài đặt phí kích hoạt" — phí 1 lần mở khoá tạo Campaign
// cho Tài khoản Dịch vụ. 0 = cho phép kích hoạt miễn phí.
export class UpdateActivationFeeDto {
  @IsInt({ message: 'amountKpoint phải là số nguyên' })
  @Min(0, { message: 'amountKpoint không được âm' })
  amountKpoint!: number;
}
