import { IsInt, Min } from 'class-validator';

export class UpdateInternationalPaymentDto {
  @IsInt({ message: 'reviewDays phải là số nguyên' })
  @Min(1, { message: 'reviewDays phải ít nhất 1 ngày' })
  reviewDays!: number;
}
