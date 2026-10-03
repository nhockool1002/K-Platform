import { IsIn } from 'class-validator';

// FN-DISP-03 — Admin phán quyết cuối cùng.
export class ResolveDisputeDto {
  @IsIn(['APPROVE', 'REJECT'], { message: 'decision phải là APPROVE hoặc REJECT' })
  decision!: 'APPROVE' | 'REJECT';
}
