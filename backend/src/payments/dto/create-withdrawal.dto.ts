import { IsInt, IsString, Matches, Min, MinLength } from 'class-validator';

// P2-08 (SCR-08) — lập lệnh rút KPoint về ngân hàng. `bankId` là mã ngân hàng
// theo chuẩn VietQR (vd. "Vietcombank", "MBBank") — chỉ dùng để Admin tra cứu
// thủ công lúc duyệt (P7-09), không gọi API chuyển tiền tự động ở Phase 2.
export class CreateWithdrawalDto {
  @IsInt({ message: 'amountKpoint phải là số nguyên' })
  @Min(50_000, { message: 'Số KPoint rút tối thiểu 50.000' })
  amountKpoint!: number;

  @IsString({ message: 'bankId phải là chuỗi' })
  @MinLength(2, { message: 'bankId không hợp lệ' })
  bankId!: string;

  @IsString({ message: 'bankAccountNumber phải là chuỗi' })
  @Matches(/^[0-9]{6,20}$/, { message: 'Số tài khoản phải gồm 6-20 chữ số' })
  bankAccountNumber!: string;

  @IsString({ message: 'bankAccountName phải là chuỗi' })
  @MinLength(2, { message: 'bankAccountName không hợp lệ' })
  bankAccountName!: string;
}
