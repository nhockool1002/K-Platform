import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../prisma/client.js';

const SETTING_KEY = 'dispute_sla';

// B-03/B-04 — mặc định Moderator phải đề xuất trong 12h đầu (Admin cũng có
// thể xử lý luôn trong khung này), Admin phải chốt phán quyết cuối trong
// 24h đầu — quá hạn Moderator thì Admin được phép phán quyết thẳng (bỏ qua
// bước đề xuất) thay vì chờ mãi (xem disputes.service.ts: resolve()).
const DEFAULT_MODERATOR_SLA_HOURS = 12;
const DEFAULT_ADMIN_SLA_HOURS = 24;

interface DisputeSlaValue {
  moderatorHours?: number;
  adminHours?: number;
}

export interface DisputeSlaConfig {
  moderatorHours: number;
  adminHours: number;
}

// CMS — mở từ Modal "Cài đặt SLA" ngay trong màn Dispute Center (chỉ Admin/
// Root Admin thấy + chỉnh được, xem mod-disputes.controller.ts).
@Injectable()
export class DisputeSlaConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<DisputeSlaConfig> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    const value = row?.value as DisputeSlaValue | undefined;
    const moderatorHours =
      value?.moderatorHours !== undefined && value.moderatorHours > 0
        ? value.moderatorHours
        : DEFAULT_MODERATOR_SLA_HOURS;
    const adminHours =
      value?.adminHours !== undefined && value.adminHours > 0
        ? value.adminHours
        : DEFAULT_ADMIN_SLA_HOURS;
    return { moderatorHours, adminHours };
  }

  async setConfig(userId: string, config: DisputeSlaConfig): Promise<DisputeSlaConfig> {
    const value: DisputeSlaValue = config;
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value: value as unknown as Prisma.InputJsonValue,
        updatedById: userId,
      },
      update: { value: value as unknown as Prisma.InputJsonValue, updatedById: userId },
    });
    return this.getConfig();
  }
}
