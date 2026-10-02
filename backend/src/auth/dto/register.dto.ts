import { IsEmail, IsIn, IsOptional, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password!: string;

  @IsOptional()
  @IsIn(['A', 'B'], { message: 'activeMode chỉ nhận giá trị A hoặc B' })
  activeMode?: 'A' | 'B';
}
