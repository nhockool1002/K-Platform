import { IsString, IsUUID, MinLength } from 'class-validator';

// FN-DISP-01 — Bên B tạo Khiếu nại khi Proof bị từ chối.
export class CreateDisputeDto {
  @IsUUID('4', { message: 'submissionId không hợp lệ' })
  submissionId!: string;

  @IsString({ message: 'reason phải là chuỗi' })
  @MinLength(5, { message: 'reason phải có ít nhất 5 ký tự' })
  reason!: string;
}
