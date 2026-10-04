import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAccountProfileDto {
  @IsOptional()
  @IsEmail({}, { message: 'email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'password phải là chuỗi' })
  @MinLength(8, { message: 'password phải có ít nhất 8 ký tự' })
  password?: string;
}
