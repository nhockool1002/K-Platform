import { IsEnum } from 'class-validator';
// @prisma/client là CommonJS; dưới Node ESM named import không resolve được.
import type { UserRole as UserRoleType } from '@prisma/client';
import pkg from '@prisma/client';
const { UserRole } = pkg;

export class UpdateUserRoleDto {
  @IsEnum(UserRole, { message: 'role không hợp lệ' })
  role!: UserRoleType;
}
