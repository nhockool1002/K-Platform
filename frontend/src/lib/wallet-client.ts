'use client';

// Client cho API Ví KPoint & SePay thật (Phase 2 — backend/src/payments). Mọi
// số KPoint trả về là string (BigInt đã serialize ở backend) — convert qua
// Number() khi hiển thị, giống quy ước của campaigns-client.ts.

import { apiFetch } from './auth-client';

export interface Wallet {
  balanceKpoint: string;
  reservedKpoint: string;
  availableKpoint: string;
}

export interface SepayQrInfo {
  bankId: string;
  accountNumber: string;
  accountName: string;
  content: string;
  qrImageUrl: string;
}

export type WalletTxType =
  | 'TOPUP_SEPAY'
  | 'TOPUP_BMC'
  | 'WITHDRAWAL_REQUEST'
  | 'CAMPAIGN_RESERVE'
  | 'TASK_REWARD'
  | 'ACCOUNT_ACTIVATION'
  | 'WITHDRAWAL_COMPLETED'
  | 'WITHDRAWAL_REJECTED';
export type WalletTxSide = 'A' | 'B' | 'SHARED';

export interface WalletTransaction {
  id: string;
  type: WalletTxType;
  side: WalletTxSide;
  balanceDeltaKpoint: string;
  reservedDeltaKpoint: string;
  txnId: string | null;
  relatedCampaignId: string | null;
  note: string | null;
  createdAt: string;
}

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Withdrawal {
  id: string;
  amountKpoint: string;
  bankId: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: WithdrawalStatus;
  createdAt: string;
}

export interface CreateWithdrawalInput {
  amountKpoint: number;
  bankId: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export async function getWallet(): Promise<Wallet> {
  return apiFetch<Wallet>('/payments/wallet', { auth: true });
}

export async function getSepayQr(): Promise<SepayQrInfo> {
  return apiFetch<SepayQrInfo>('/payments/sepay-qr', { auth: true });
}

export async function listTransactions(side?: 'A' | 'B'): Promise<WalletTransaction[]> {
  const suffix = side ? `?side=${side}` : '';
  return apiFetch<WalletTransaction[]>(`/payments/transactions${suffix}`, { auth: true });
}

export async function createWithdrawal(input: CreateWithdrawalInput): Promise<Withdrawal> {
  return apiFetch<Withdrawal>('/payments/withdrawals', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function listWithdrawals(): Promise<Withdrawal[]> {
  return apiFetch<Withdrawal[]>('/payments/withdrawals', { auth: true });
}

// Danh sách ngân hàng phổ biến hỗ trợ VietQR — đủ dùng cho form rút tiền/hiển
// thị, không cần gọi API danh mục ngân hàng ngoài ở giai đoạn này.
export const VIETQR_BANKS = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank',
  'MBBank',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'SHB',
  'HDBank',
  'VIB',
  'SeABank',
  'OCB',
  'MSB',
  'SCB',
  'Eximbank',
] as const;
