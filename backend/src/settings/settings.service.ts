import { Injectable } from '@nestjs/common';
import { SepayConfigService } from './sepay-config.service.js';
import type { UpdateSepaySettingsDto } from './dto/update-sepay-settings.dto.js';

@Injectable()
export class SettingsService {
  constructor(private readonly sepayConfig: SepayConfigService) {}

  // Không bao giờ trả lại webhookApiKey thô qua API — chỉ báo đã cấu hình hay
  // chưa (`hasWebhookApiKey`), khớp UX "•••••••• (đã cấu hình)" của CMS.
  async getSepaySettings() {
    const stored = await this.sepayConfig.getStoredValue();
    return {
      bankId: stored.bankId ?? '',
      bankAccountNumber: stored.bankAccountNumber ?? '',
      bankAccountName: stored.bankAccountName ?? '',
      hasWebhookApiKey: Boolean(stored.webhookApiKey),
    };
  }

  async updateSepaySettings(userId: string, dto: UpdateSepaySettingsDto) {
    const existing = await this.sepayConfig.getStoredValue();
    const webhookApiKey = dto.webhookApiKey?.trim()
      ? dto.webhookApiKey.trim()
      : existing.webhookApiKey;

    await this.sepayConfig.save(userId, {
      bankId: dto.bankId,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountName: dto.bankAccountName,
      webhookApiKey,
    });

    return this.getSepaySettings();
  }
}
