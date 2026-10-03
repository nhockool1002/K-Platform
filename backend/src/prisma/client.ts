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
  CampaignStatus as CampaignStatusEnum,
  DisputeDecision as DisputeDecisionEnum,
  DisputeStatus as DisputeStatusEnum,
  ModRecommendation as ModRecommendationEnum,
  PrismaClient as PrismaClientClass,
  SubmissionStatus as SubmissionStatusEnum,
  UserRole as UserRoleEnum,
  WalletTxSide as WalletTxSideEnum,
  WalletTxType as WalletTxTypeEnum,
  WithdrawalStatus as WithdrawalStatusEnum,
} from '../../generated/prisma/index.js';
import pkg from '../../generated/prisma/index.js';

export type { Prisma } from '../../generated/prisma/index.js';

export const PrismaClient = pkg.PrismaClient;
export const UserRole = pkg.UserRole;
export const ActiveMode = pkg.ActiveMode;
export const CampaignStatus = pkg.CampaignStatus;
export const SubmissionStatus = pkg.SubmissionStatus;
export const WalletTxType = pkg.WalletTxType;
export const WalletTxSide = pkg.WalletTxSide;
export const WithdrawalStatus = pkg.WithdrawalStatus;
export const DisputeStatus = pkg.DisputeStatus;
export const ModRecommendation = pkg.ModRecommendation;
export const DisputeDecision = pkg.DisputeDecision;

export type PrismaClient = PrismaClientClass;
export type UserRole = UserRoleEnum;
export type ActiveMode = ActiveModeEnum;
export type CampaignStatus = CampaignStatusEnum;
export type SubmissionStatus = SubmissionStatusEnum;
export type WalletTxType = WalletTxTypeEnum;
export type WalletTxSide = WalletTxSideEnum;
export type WithdrawalStatus = WithdrawalStatusEnum;
export type DisputeStatus = DisputeStatusEnum;
export type ModRecommendation = ModRecommendationEnum;
export type DisputeDecision = DisputeDecisionEnum;
