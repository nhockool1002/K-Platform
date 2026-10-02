import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

// Payload SePay POST tới webhook (tài liệu SePay — "Cấu hình Webhooks"). Khai
// đủ field SePay gửi vì ValidationPipe global bật forbidNonWhitelisted: field
// lạ sẽ bị 400 thay vì bị bỏ qua.
export class SepayWebhookDto {
  @IsInt({ message: 'id phải là số nguyên' })
  id!: number;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsOptional()
  @IsString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  subAccount?: string | null;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsOptional()
  @IsString()
  content?: string;

  // SePay gửi "in" (tiền vào) hoặc "out" (tiền ra) — chỉ "in" mới cộng KPoint.
  @IsOptional()
  @IsIn(['in', 'out'])
  transferType?: 'in' | 'out';

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt({ message: 'transferAmount phải là số nguyên' })
  transferAmount!: number;

  @IsOptional()
  @IsInt()
  accumulated?: number;

  @IsOptional()
  @IsString()
  referenceCode?: string;
}
