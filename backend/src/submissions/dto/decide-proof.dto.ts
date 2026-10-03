import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

// P4-10 — Bên A duyệt/từ chối Proof đã nộp (status PENDING).
export class DecideProofDto {
  @IsIn(['APPROVE', 'REJECT'], { message: 'action phải là APPROVE hoặc REJECT' })
  action!: 'APPROVE' | 'REJECT';

  // Phase 5 (FN-DISP-01) — lý do từ chối, hiển thị cho Bên B + Moderator/Admin
  // nếu Bên B tạo Dispute. Chỉ áp dụng khi action = REJECT, không bắt buộc.
  @IsOptional()
  @IsString({ message: 'reason phải là chuỗi' })
  @MaxLength(1000, { message: 'reason tối đa 1000 ký tự' })
  reason?: string;
}
