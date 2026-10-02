import { MinLength } from 'class-validator';

export class ResetPasswordDto {
  @MinLength(10, { message: 'Token không hợp lệ' })
  token!: string;

  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  newPassword!: string;
}
