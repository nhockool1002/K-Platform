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
