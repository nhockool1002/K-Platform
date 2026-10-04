import { IsInt, Min } from 'class-validator';

export class UpdateDisputeSlaDto {
  @IsInt({ message: 'moderatorHours phải là số nguyên' })
  @Min(1, { message: 'moderatorHours phải ít nhất 1 giờ' })
  moderatorHours!: number;

  @IsInt({ message: 'adminHours phải là số nguyên' })
  @Min(1, { message: 'adminHours phải ít nhất 1 giờ' })
  adminHours!: number;
}
