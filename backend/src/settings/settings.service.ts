import { Injectable } from '@nestjs/common';
import { SepayConfigService } from './sepay-config.service.js';
import { ActivationFeeConfigService } from './activation-fee-config.service.js';
import { ExchangeRateConfigService } from './exchange-rate-config.service.js';
import { DisputeSlaConfigService } from './dispute-sla-config.service.js';
import type { UpdateSepaySettingsDto } from './dto/update-sepay-settings.dto.js';
import type { UpdateActivationFeeDto } from './dto/update-activation-fee.dto.js';
import type { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto.js';
import type { UpdateInternationalPaymentDto } from './dto/update-international-payment.dto.js';
import type { UpdateDisputeSlaDto } from './dto/update-dispute-sla.dto.js';

@Injectable()
export class SettingsService {
  constructor(
    private readonly sepayConfig: SepayConfigService,
    private readonly activationFeeConfig: ActivationFeeConfigService,
    private readonly exchangeRateConfig: ExchangeRateConfigService,
    private readonly disputeSlaConfig: DisputeSlaConfigService,
  ) {}

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

  async getActivationFee() {
    const feeKpoint = await this.activationFeeConfig.getFeeKpoint();
    return { amountKpoint: feeKpoint.toString() };
  }

  async updateActivationFee(userId: string, dto: UpdateActivationFeeDto) {
    await this.activationFeeConfig.setFeeKpoint(userId, dto.amountKpoint);
    return this.getActivationFee();
  }

  // B-02 — "Cài đặt thanh toán Quốc tế" (chuẩn bị trước cho BMC — Phase 6).
  async getInternationalPaymentSettings() {
    const [rate, reviewDays] = await Promise.all([
      this.exchangeRateConfig.getCurrentRate(),
      this.exchangeRateConfig.getReviewDays(),
    ]);
    return { usdToVnd: rate.usdToVnd, rateUpdatedAt: rate.updatedAt, reviewDays };
  }

  async updateExchangeRate(userId: string, dto: UpdateExchangeRateDto) {
    await this.exchangeRateConfig.setRate(userId, dto.usdToVnd);
    return this.getInternationalPaymentSettings();
  }

  async updateReviewDays(userId: string, dto: UpdateInternationalPaymentDto) {
    await this.exchangeRateConfig.setReviewDays(userId, dto.reviewDays);
    return this.getInternationalPaymentSettings();
  }

  async getExchangeRateHistory() {
    const rows = await this.exchangeRateConfig.listHistory();
    return rows.map((r) => ({
      id: r.id,
      usdToVnd: Number(r.usdToVnd),
      updatedBy: r.updatedBy?.email ?? null,
      createdAt: r.createdAt,
    }));
  }

  // B-03/B-04 — SLA Dispute, mở từ Modal ngay trong màn Dispute Center.
  async getDisputeSla() {
    return this.disputeSlaConfig.getConfig();
  }

  async updateDisputeSla(userId: string, dto: UpdateDisputeSlaDto) {
    return this.disputeSlaConfig.setConfig(userId, dto);
  }
}
