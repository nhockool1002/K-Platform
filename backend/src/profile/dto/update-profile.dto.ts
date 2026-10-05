import {
  IsDateString,
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

// Email KHÔNG nằm trong DTO này — ValidationPipe (forbidNonWhitelisted) sẽ từ chối
// mọi request cố đổi email. Email chỉ đổi qua quản trị viên.
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @Matches(VN_PHONE, { message: 'Số điện thoại không hợp lệ (vd. 0912345678 hoặc +84912345678)' })
  phone?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsIn(VN_PROVINCES as unknown as string[], { message: 'Tỉnh/thành không hợp lệ' })
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
