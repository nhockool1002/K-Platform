import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

// SCR-21 — Admin/Mod sửa thông tin hiển thị của Campaign. KHÔNG cho sửa
// rewardPerSlot/totalSlots: hai giá trị này đã khoá vào reserved_kpoint lúc tạo,
// đổi sau sẽ làm lệch số ký quỹ.
export class UpdateCampaignAdminDto {
  @IsOptional()
  @IsString({ message: 'title phải là chuỗi' })
  @MinLength(3, { message: 'title phải có ít nhất 3 ký tự' })
  @MaxLength(120, { message: 'title tối đa 120 ký tự' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'location phải là chuỗi' })
  @MaxLength(200, { message: 'location tối đa 200 ký tự' })
  location?: string;

  @IsOptional()
  @IsInt({ message: 'minTrustScore phải là số nguyên' })
  @Min(0, { message: 'minTrustScore tối thiểu 0' })
  @Max(100, { message: 'minTrustScore tối đa 100' })
  minTrustScore?: number;
}
