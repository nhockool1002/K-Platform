import { IsOptional, IsUUID } from 'class-validator';

// P7-08 — null/bỏ trống = gỡ phân công, mở lại cho mọi Moderator xử lý.
export class AssignModeratorDto {
  @IsOptional()
  @IsUUID('4', { message: 'moderatorId không hợp lệ' })
  moderatorId?: string | null;
}
