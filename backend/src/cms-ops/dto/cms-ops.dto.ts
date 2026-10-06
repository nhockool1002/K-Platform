import {
  IsBoolean,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';

// SCR-23 — Admin điều chỉnh số dư ví có lý do. deltaKpoint âm = trừ tiền.
// Không được = 0 (vô nghĩa, dễ nhầm), giới hạn độ lớn để tránh nhập nhầm số.
export class AdjustWalletDto {
  @IsInt({ message: 'deltaKpoint phải là số nguyên' })
  @NotEquals(0, { message: 'deltaKpoint không được bằng 0' })
  @Min(-100_000_000, { message: 'deltaKpoint không được nhỏ hơn -100.000.000' })
  @Max(100_000_000, { message: 'deltaKpoint không được lớn hơn 100.000.000' })
  deltaKpoint!: number;

  @IsString({ message: 'reason phải là chuỗi' })
  @MinLength(5, { message: 'reason phải có ít nhất 5 ký tự' })
  @MaxLength(300, { message: 'reason tối đa 300 ký tự' })
  reason!: string;
}

// SCR-24 — khoá / mở khoá tài khoản nghi gian lận.
export class SetUserDisabledDto {
  @IsBoolean({ message: 'disabled phải là true/false' })
  disabled!: boolean;
}
