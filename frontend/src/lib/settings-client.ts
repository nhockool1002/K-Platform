'use client';

// Client cho API Cài Đặt hệ thống thật (backend/src/settings) — CMS "Cài Đặt
// > Cài đặt SePay". Chỉ Admin/Root Admin gọi được (RBAC enforce ở backend).

import { apiFetch } from './auth-client';

export interface SepaySettings {
  bankId: string;
  bankAccountNumber: string;
  bankAccountName: string;
  hasWebhookApiKey: boolean;
}

export interface UpdateSepaySettingsInput {
  bankId: string;
  bankAccountNumber: string;
  bankAccountName: string;
  // Để trống/không truyền = giữ nguyên key đã lưu.
  webhookApiKey?: string;
}

export async function getSepaySettings(): Promise<SepaySettings> {
  return apiFetch<SepaySettings>('/admin/settings/sepay', { auth: true });
}

export async function updateSepaySettings(input: UpdateSepaySettingsInput): Promise<SepaySettings> {
  return apiFetch<SepaySettings>('/admin/settings/sepay', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(input),
  });
}

export interface ActivationFeeSettings {
  amountKpoint: string;
}

export async function getActivationFeeSettings(): Promise<ActivationFeeSettings> {
  return apiFetch<ActivationFeeSettings>('/admin/settings/activation-fee', { auth: true });
}

export async function updateActivationFeeSettings(
  amountKpoint: number,
): Promise<ActivationFeeSettings> {
  return apiFetch<ActivationFeeSettings>('/admin/settings/activation-fee', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ amountKpoint }),
  });
}

// B-02 — "Cài đặt thanh toán" tab Quốc tế (chuẩn bị trước cho BMC, Phase 6).
export interface InternationalPaymentSettings {
  usdToVnd: number;
  rateUpdatedAt: string | null;
  reviewDays: number;
}

export interface ExchangeRateHistoryRow {
  id: string;
  usdToVnd: number;
  updatedBy: string | null;
  createdAt: string;
}

export async function getInternationalPaymentSettings(): Promise<InternationalPaymentSettings> {
  return apiFetch<InternationalPaymentSettings>('/admin/settings/international-payment', {
    auth: true,
  });
}

export async function updateExchangeRate(usdToVnd: number): Promise<InternationalPaymentSettings> {
  return apiFetch<InternationalPaymentSettings>(
    '/admin/settings/international-payment/exchange-rate',
    { method: 'PUT', auth: true, body: JSON.stringify({ usdToVnd }) },
  );
}

export async function updateReviewDays(reviewDays: number): Promise<InternationalPaymentSettings> {
  return apiFetch<InternationalPaymentSettings>(
    '/admin/settings/international-payment/review-days',
    { method: 'PUT', auth: true, body: JSON.stringify({ reviewDays }) },
  );
}

export async function getExchangeRateHistory(): Promise<ExchangeRateHistoryRow[]> {
  return apiFetch<ExchangeRateHistoryRow[]>(
    '/admin/settings/international-payment/exchange-rate/history',
    { auth: true },
  );
}

// B-03/B-04 — Modal "Cài đặt SLA" trong CMS Dispute Center.
export interface DisputeSlaSettings {
  moderatorHours: number;
  adminHours: number;
}

export async function getDisputeSla(): Promise<DisputeSlaSettings> {
  return apiFetch<DisputeSlaSettings>('/admin/settings/dispute-sla', { auth: true });
}

export async function updateDisputeSla(config: DisputeSlaSettings): Promise<DisputeSlaSettings> {
  return apiFetch<DisputeSlaSettings>('/admin/settings/dispute-sla', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(config),
  });
}
