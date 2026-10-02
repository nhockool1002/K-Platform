import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SurveyQuestionDto } from './survey-question.dto.js';

// Khớp PLATFORM_LABEL ở frontend (src/lib/mock-data.ts) — 4 nền tảng hỗ trợ theo SRS.
const PLATFORMS = ['GOOGLE_MAPS', 'FACEBOOK', 'SHOPEE', 'TIKTOK'] as const;

export class CreateCampaignDto {
  @IsString({ message: 'title phải là chuỗi' })
  @MinLength(3, { message: 'title phải có ít nhất 3 ký tự' })
  title!: string;

  @IsIn(PLATFORMS, { message: 'platform không hợp lệ' })
  platform!: (typeof PLATFORMS)[number];

  @IsOptional()
  @IsString({ message: 'location phải là chuỗi' })
  location?: string;

  @IsInt({ message: 'totalSlots phải là số nguyên' })
  @Min(1, { message: 'totalSlots phải ít nhất 1' })
  @Max(1000, { message: 'totalSlots tối đa 1000' })
  totalSlots!: number;

  @IsInt({ message: 'rewardPerSlot phải là số nguyên' })
  @Min(10_000, { message: 'rewardPerSlot tối thiểu 10.000 KPoint' })
  rewardPerSlot!: number;

  @IsInt({ message: 'dripFeedLimit phải là số nguyên' })
  @Min(1, { message: 'dripFeedLimit phải ít nhất 1' })
  @Max(100, { message: 'dripFeedLimit tối đa 100' })
  dripFeedLimit!: number;

  @IsOptional()
  @IsInt({ message: 'minTrustScore phải là số nguyên' })
  @Min(0, { message: 'minTrustScore tối thiểu 0' })
  @Max(100, { message: 'minTrustScore tối đa 100' })
  minTrustScore?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDto)
  @ArrayMaxSize(20, { message: 'Tối đa 20 câu hỏi khảo sát' })
  surveyQuestions?: SurveyQuestionDto[];
}
