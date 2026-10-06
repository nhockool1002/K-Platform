'use client';

// Client CMS SCR-23 — ví & sổ cái (backend/src/cms-ops/admin-wallets.controller.ts).

import { apiFetch } from './auth-client';

export interface AdminWallet {
  id: string;
  user: { id: string; email: string; role: string; disabledAt: string | null };
  balanceKpoint: string;
  reservedKpoint: string;
  availableKpoint: string;
}

export interface AdminWalletTx {
  id: string;
  type: string;
  side: string;
  balanceDeltaKpoint: string;
  reservedDeltaKpoint: string;
  relatedCampaignId: string | null;
  note: string | null;
  createdAt: string;
}

export async function listAdminWallets(search = ''): Promise<AdminWallet[]> {
  const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiFetch<AdminWallet[]>(`/admin/wallets${qs}`, { auth: true });
}

export async function listAdminWalletTransactions(userId: string): Promise<AdminWalletTx[]> {
  return apiFetch<AdminWalletTx[]>(`/admin/wallets/${userId}/transactions`, { auth: true });
}

export async function adjustAdminWallet(
  userId: string,
  deltaKpoint: number,
  reason: string,
): Promise<Pick<AdminWallet, 'balanceKpoint' | 'reservedKpoint' | 'availableKpoint'>> {
  return apiFetch(`/admin/wallets/${userId}/adjustments`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ deltaKpoint, reason }),
  });
}
