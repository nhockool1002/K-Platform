import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole, ActiveMode } from '../../prisma/client.js';

// CMS Quản Trị Tài Khoản — Admin tạo tài khoản mới trực tiếp (không qua
// luồng tự đăng ký của /auth/register).
export class CreateAccountDto {
  @IsEmail({}, { message: 'email không hợp lệ' })
  email!: string;

  @IsString({ message: 'password phải là chuỗi' })
  @MinLength(8, { message: 'password phải có ít nhất 8 ký tự' })
  password!: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'role không hợp lệ' })
  role?: UserRole;

  @IsOptional()
  @IsEnum(ActiveMode, { message: 'activeMode không hợp lệ' })
  activeMode?: ActiveMode;
}
