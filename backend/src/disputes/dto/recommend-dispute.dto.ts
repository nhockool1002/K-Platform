import { IsIn } from 'class-validator';

// FN-DISP-02 — Moderator thẩm định, chỉ được đề xuất (không duyệt chi trực tiếp).
export class RecommendDisputeDto {
  @IsIn(['PEND_APP', 'PEND_REJ'], { message: 'recommendation phải là PEND_APP hoặc PEND_REJ' })
  recommendation!: 'PEND_APP' | 'PEND_REJ';
}
