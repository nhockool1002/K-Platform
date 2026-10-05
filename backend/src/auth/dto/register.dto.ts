import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Gender } from '../../prisma/client.js';
import { VN_PROVINCES } from '../../common/vn-provinces.js';

const VN_PHONE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password!: string;

  @IsString({ message: 'Vui lòng xác nhận mật khẩu' })
  confirmPassword!: string;

  @IsOptional()
  @IsIn(['A', 'B'], { message: 'activeMode chỉ nhận giá trị A hoặc B' })
  activeMode?: 'A' | 'B';

  @IsString({ message: 'Vui lòng nhập họ và tên' })
  @MinLength(2, { message: 'Họ và tên phải có ít nhất 2 ký tự' })
  @MaxLength(100)
  fullName!: string;

  @Matches(VN_PHONE, { message: 'Số điện thoại không hợp lệ (vd. 0912345678 hoặc +84912345678)' })
  phone!: string;

  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  dateOfBirth!: string;

  @IsEnum(Gender, { message: 'Vui lòng chọn giới tính' })
  gender!: Gender;

  @IsIn(VN_PROVINCES as unknown as string[], { message: 'Vui lòng chọn tỉnh/thành' })
  province!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;
}
