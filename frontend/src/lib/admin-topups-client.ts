'use client';

// Client cho CMS "Đối soát nạp tiền" + "Thanh toán quốc tế"
// (backend/src/payments/admin-international-payments.controller.ts). Chỉ Admin/Root Admin.

import { ApiError, apiFetch, getAccessToken } from './auth-client';
import type { BmcTopupStatus } from './bmc-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type TopupSource = 'SEPAY' | 'BMC';

export interface ReconciliationRow {
  id: string;
  source: TopupSource;
  user: { id: string; email: string };
  reference: string;
  amountUsd: string | null;
  usdToVnd: string | null;
  kpointAmount: string;
  status: BmcTopupStatus | 'CREDITED';
  packageName: string | null;
  rejectReason: string | null;
  hasReceipt: boolean;
  verifiedBy: { id: string; email: string } | null;
  verifiedAt: string | null;
  createdAt: string;
  reviewDeadline: string | null;
  isOverdue: boolean;
}

export interface ListTopupsFilter {
  source?: TopupSource;
  status?: BmcTopupStatus;
}

export async function listReconciliation(filter: ListTopupsFilter): Promise<ReconciliationRow[]> {
  const params = new URLSearchParams();
  if (filter.source) params.set('source', filter.source);
  if (filter.status) params.set('status', filter.status);
  const qs = params.toString();
  return apiFetch<ReconciliationRow[]>(`/admin/topups${qs ? `?${qs}` : ''}`, { auth: true });
}

export async function decideBmcTopup(
  id: string,
  decision: 'APPROVE' | 'REJECT',
  reason?: string,
): Promise<unknown> {
  return apiFetch(`/admin/bmc/topups/${id}/decision`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ decision, reason }),
  });
}

// Biên lai cần Bearer token nên không mở trực tiếp bằng <a href>: tải blob rồi tạo object URL.
export async function openBmcReceipt(id: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/admin/bmc/topups/${id}/receipt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message ?? 'Không tải được biên lai');
  }
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface AdminInternationalPackage {
  id: string;
  name: string;
  amountUsd: string;
  bmcUrl: string;
  active: boolean;
  sortOrder: number;
}

export interface SaveInternationalPackageInput {
  name: string;
  amountUsd: number;
  bmcUrl: string;
  active: boolean;
  sortOrder: number;
}

export async function listInternationalPackages(): Promise<AdminInternationalPackage[]> {
  return apiFetch<AdminInternationalPackage[]>('/admin/bmc/packages', { auth: true });
}

export async function createInternationalPackage(
  input: SaveInternationalPackageInput,
): Promise<AdminInternationalPackage> {
  return apiFetch<AdminInternationalPackage>('/admin/bmc/packages', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function updateInternationalPackage(
  id: string,
  input: Partial<SaveInternationalPackageInput>,
): Promise<AdminInternationalPackage> {
  return apiFetch<AdminInternationalPackage>(`/admin/bmc/packages/${id}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function deleteInternationalPackage(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/bmc/packages/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}
