'use client';

// Client cho CMS "Yêu Cầu Rút Tiền" (backend/src/payments/admin-withdrawals.controller.ts) —
// chỉ Admin/Root Admin gọi được (RBAC enforce ở backend).

import { apiFetch } from './auth-client';
import type { WithdrawalStatus } from './wallet-client';

export interface AdminWithdrawal {
  id: string;
  userId: string;
  amountKpoint: string;
  bankId: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: WithdrawalStatus;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string };
}

export async function listAdminWithdrawals(status?: WithdrawalStatus): Promise<AdminWithdrawal[]> {
  const suffix = status ? `?status=${status}` : '';
  return apiFetch<AdminWithdrawal[]>(`/admin/withdrawals${suffix}`, { auth: true });
}

export async function decideWithdrawal(
  id: string,
  decision: 'APPROVE' | 'REJECT',
  note?: string,
): Promise<AdminWithdrawal> {
  return apiFetch<AdminWithdrawal>(`/admin/withdrawals/${id}/decision`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ decision, note }),
  });
}
