import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class DecideBmcTopupDto {
  @IsIn(['APPROVE', 'REJECT'], { message: 'decision phải là APPROVE hoặc REJECT' })
  decision!: 'APPROVE' | 'REJECT';

  @ValidateIf((o: DecideBmcTopupDto) => o.decision === 'REJECT')
  @IsString({ message: 'Vui lòng nhập lý do từ chối' })
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
