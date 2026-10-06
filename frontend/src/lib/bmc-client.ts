'use client';

// Client cho nạp quốc tế qua Buy Me a Coffee (backend/src/payments/international-payments.controller.ts).

import { ApiError, apiFetch, getAccessToken } from './auth-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type BmcTopupStatus =
  'AWAITING_PAYMENT' | 'PENDING_MANUAL_VERIFICATION' | 'APPROVED' | 'REJECTED';

export interface BmcPackage {
  id: string;
  name: string;
  amountUsd: string;
  estimatedKpoint: string;
  bmcUrl: string;
}

export interface BmcPackagesResponse {
  usdToVnd: number;
  packages: BmcPackage[];
}

export interface BmcTopup {
  id: string;
  reference: string;
  packageName: string;
  amountUsd: string;
  usdToVnd: string;
  kpointAmount: string;
  status: BmcTopupStatus;
  hasReceipt: boolean;
  rejectReason: string | null;
  bmcUrl: string;
  createdAt: string;
}

export async function getBmcPackages(): Promise<BmcPackagesResponse> {
  return apiFetch<BmcPackagesResponse>('/payments/bmc/packages', { auth: true });
}

export async function initiateBmcTopup(packageId: string): Promise<BmcTopup> {
  return apiFetch<BmcTopup>('/payments/bmc/topups', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ packageId }),
  });
}

export async function listMyBmcTopups(): Promise<BmcTopup[]> {
  return apiFetch<BmcTopup[]>('/payments/bmc/topups', { auth: true });
}

// FormData — không dùng apiFetch() vì nó luôn set Content-Type: application/json.
export async function uploadBmcReceipt(topupId: string, file: File): Promise<BmcTopup> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const res = await fetch(`${API_URL}/payments/bmc/topups/${topupId}/receipt`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
  }
  return data as BmcTopup;
}
