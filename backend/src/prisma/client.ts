// Cổng duy nhất cho Prisma generated client — mọi nơi khác trong backend import
// PrismaClient/UserRole/ActiveMode từ đây, không import thẳng '@prisma/client' hay
// đường dẫn generated/prisma. Lý do: client được generate ra output tuỳ chỉnh
// (xem schema.prisma) thay vì node_modules/.prisma/client mặc định, vì pnpm deploy
// --legacy (dùng khi build Docker) không bảo toàn đúng cấu trúc node_modules/.prisma
// của pnpm, gây lỗi "Cannot find module '.prisma/client/default'" lúc runtime.
// Generated client là module CommonJS nên phải default-import rồi destructure (named
// import thẳng không resolve được dưới Node ESM — xem package.json "type": "module").
import type {
  ActiveMode as ActiveModeEnum,
  PrismaClient as PrismaClientClass,
  UserRole as UserRoleEnum,
} from '../../generated/prisma/index.js';
import pkg from '../../generated/prisma/index.js';

export const PrismaClient = pkg.PrismaClient;
export const UserRole = pkg.UserRole;
export const ActiveMode = pkg.ActiveMode;

export type PrismaClient = PrismaClientClass;
export type UserRole = UserRoleEnum;
export type ActiveMode = ActiveModeEnum;
