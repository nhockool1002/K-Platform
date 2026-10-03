import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

// P4-02/FN-TASK-01 — multipart: file bắt buộc (validate riêng ở controller
// qua FileInterceptor, không phải class-validator), 2 field này chỉ là ngữ
// cảnh hiển thị cho Bên A lúc duyệt, không bắt buộc theo spec API.
export class SubmitProofDto {
  @IsOptional()
  @IsUrl({}, { message: 'reviewUrl phải là URL hợp lệ' })
  reviewUrl?: string;

  @IsOptional()
  @IsString({ message: 'reviewNote phải là chuỗi' })
  @MaxLength(2000, { message: 'reviewNote tối đa 2000 ký tự' })
  reviewNote?: string;
}
