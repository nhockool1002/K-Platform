import { IsObject, IsString, MinLength } from 'class-validator';

export class ApplyCampaignDto {
  // Fingerprint thiết bị do client sinh (vd. hash từ user agent + canvas/audio
  // fingerprint) — backend hash lại (sha256) trước khi lưu, không tin tưởng
  // giá trị thô từ client làm định danh cuối cùng. Dùng để chặn multi-account
  // từ cùng 1 thiết bị (FN-CAMP-02 / P3-10).
  @IsString({ message: 'fingerprint phải là chuỗi' })
  @MinLength(8, { message: 'fingerprint không hợp lệ' })
  fingerprint!: string;

  // Câu trả lời Survey, dạng { [question]: answer }.
  @IsObject({ message: 'surveyAnswers phải là object' })
  surveyAnswers!: Record<string, unknown>;
}
