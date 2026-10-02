import { IsEnum } from 'class-validator';
import { UserRole } from '../../prisma/client.js';

export class UpdateUserRoleDto {
  @IsEnum(UserRole, { message: 'role không hợp lệ' })
  role!: UserRole;
}
