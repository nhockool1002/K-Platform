import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../prisma/client.js';

const SETTING_KEY = 'sepay';

export interface SepayConfigValue {
  bankId?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  webhookApiKey?: string;
}

export interface SepayConfig {
  bankId: string;
  bankAccountNumber: string;
  bankAccountName: string;
  webhookApiKey: string;
}

// Dùng nội bộ bởi PaymentsService (QR) và SepayWebhookGuard (xác thực) — ưu
// tiên đọc cấu hình đã lưu qua CMS "Cài đặt SePay" (SystemSetting key="sepay"),
// fallback về biến môi trường SEPAY_* nếu CMS chưa cấu hình (giữ tương thích
// ngược với .env cũ / e2e test chạy không cần seed DB).
@Injectable()
export class SepayConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getStoredValue(): Promise<SepayConfigValue> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    return (row?.value as SepayConfigValue | undefined) ?? {};
  }

  async getConfig(): Promise<SepayConfig | null> {
    const stored = await this.getStoredValue();

    const bankId = stored.bankId || this.config.get<string>('SEPAY_BANK_ID');
    const bankAccountNumber =
      stored.bankAccountNumber || this.config.get<string>('SEPAY_BANK_ACCOUNT_NUMBER');
    const bankAccountName =
      stored.bankAccountName || this.config.get<string>('SEPAY_BANK_ACCOUNT_NAME');
    const webhookApiKey = stored.webhookApiKey || this.config.get<string>('SEPAY_WEBHOOK_API_KEY');

    if (!bankId || !bankAccountNumber || !bankAccountName || !webhookApiKey) {
      return null;
    }
    return { bankId, bankAccountNumber, bankAccountName, webhookApiKey };
  }

  async save(userId: string, value: SepayConfigValue): Promise<void> {
    const jsonValue = value as unknown as Prisma.InputJsonValue;
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: jsonValue, updatedById: userId },
      update: { value: jsonValue, updatedById: userId },
    });
  }
}
