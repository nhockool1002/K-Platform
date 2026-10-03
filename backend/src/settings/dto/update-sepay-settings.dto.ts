import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

// Cài đặt SePay (CMS "Cài Đặt" → "Cài đặt SePay"). `webhookApiKey` optional —
// để trống nghĩa là giữ nguyên giá trị đã lưu (không ghi đè bằng rỗng), khớp
// hành vi "để trống nếu không đổi" của UI.
export class UpdateSepaySettingsDto {
  @IsString({ message: 'bankId phải là chuỗi' })
  @MinLength(2, { message: 'bankId không hợp lệ' })
  bankId!: string;

  @IsString({ message: 'bankAccountNumber phải là chuỗi' })
  @Matches(/^[0-9]{6,20}$/, { message: 'Số tài khoản phải gồm 6-20 chữ số' })
  bankAccountNumber!: string;

  @IsString({ message: 'bankAccountName phải là chuỗi' })
  @MinLength(2, { message: 'bankAccountName không hợp lệ' })
  bankAccountName!: string;

  @IsOptional()
  @IsString({ message: 'webhookApiKey phải là chuỗi' })
  webhookApiKey?: string;
}
