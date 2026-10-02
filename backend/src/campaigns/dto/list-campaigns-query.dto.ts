import { IsIn, IsOptional, IsString } from 'class-validator';

const PLATFORMS = ['GOOGLE_MAPS', 'FACEBOOK', 'SHOPEE', 'TIKTOK'] as const;

export class ListCampaignsQueryDto {
  @IsOptional()
  @IsIn(PLATFORMS, { message: 'platform không hợp lệ' })
  platform?: (typeof PLATFORMS)[number];

  @IsOptional()
  @IsString({ message: 'search phải là chuỗi' })
  search?: string;
}
