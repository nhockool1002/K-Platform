import { IsEmail, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @MinLength(1, { message: 'Vui lòng nhập mật khẩu' })
  password!: string;
}
