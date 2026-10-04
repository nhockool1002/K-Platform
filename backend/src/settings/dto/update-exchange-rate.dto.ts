import { IsNumber, Min } from 'class-validator';

export class UpdateExchangeRateDto {
  @IsNumber({}, { message: 'usdToVnd phải là số' })
  @Min(1, { message: 'usdToVnd phải lớn hơn 0' })
  usdToVnd!: number;
}
