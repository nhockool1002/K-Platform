import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../prisma/client.js';

const SETTING_KEY = 'activation_fee';

// Phí kích hoạt mặc định khi Admin chưa cấu hình gì (khớp phí tạo Campaign
// hiện có — xem CREATION_FEE_KPOINT trong campaigns.service.ts — nhưng đây
// là 2 khoản phí độc lập, chỉnh 1 bên không ảnh hưởng bên kia).
const DEFAULT_ACTIVATION_FEE_KPOINT = 50_000n;

interface ActivationFeeValue {
  amountKpoint?: number;
}

// CMS "Cài Đặt" → "Cài đặt phí kích hoạt" — phí 1 lần để mở khoá tạo Campaign
// cho Tài khoản Dịch vụ (xem account-activation.service.ts).
@Injectable()
export class ActivationFeeConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeeKpoint(): Promise<bigint> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    const value = row?.value as ActivationFeeValue | undefined;
    if (
      value?.amountKpoint !== undefined &&
      Number.isFinite(value.amountKpoint) &&
      value.amountKpoint >= 0
    ) {
      return BigInt(Math.trunc(value.amountKpoint));
    }
    return DEFAULT_ACTIVATION_FEE_KPOINT;
  }

  async setFeeKpoint(userId: string, amountKpoint: number): Promise<void> {
    const value: ActivationFeeValue = { amountKpoint };
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value: value as unknown as Prisma.InputJsonValue,
        updatedById: userId,
      },
      update: { value: value as unknown as Prisma.InputJsonValue, updatedById: userId },
    });
  }
}
