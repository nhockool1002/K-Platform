import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideWithdrawalDto {
  @IsIn(['APPROVE', 'REJECT'], { message: 'decision phải là APPROVE hoặc REJECT' })
  decision!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString({ message: 'note phải là chuỗi' })
  @MaxLength(500, { message: 'note tối đa 500 ký tự' })
  note?: string;
}
