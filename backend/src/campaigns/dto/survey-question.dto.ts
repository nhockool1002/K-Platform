import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export type SurveyAnswerType = 'YES_NO' | 'TEXT';

export class SurveyQuestionDto {
  @IsString({ message: 'question phải là chuỗi' })
  @MinLength(1, { message: 'question không được để trống' })
  question!: string;

  @IsIn(['YES_NO', 'TEXT'], { message: 'answerType chỉ nhận YES_NO hoặc TEXT' })
  answerType!: SurveyAnswerType;

  @IsOptional()
  @IsBoolean({ message: 'requiresReceipt phải là boolean' })
  requiresReceipt?: boolean;
}
