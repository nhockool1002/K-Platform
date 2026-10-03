import { IsIn } from 'class-validator';

// P4-10 — Bên A duyệt/từ chối Proof đã nộp (status PENDING).
export class DecideProofDto {
  @IsIn(['APPROVE', 'REJECT'], { message: 'action phải là APPROVE hoặc REJECT' })
  action!: 'APPROVE' | 'REJECT';
}
