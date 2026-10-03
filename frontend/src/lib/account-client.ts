'use client';

import { apiFetch } from './auth-client';

export interface ActivationStatus {
  activated: boolean;
  activatedAt: string | null;
  feeKpoint: string;
}

export async function getActivationStatus(): Promise<ActivationStatus> {
  return apiFetch<ActivationStatus>('/account/activation-status', { auth: true });
}

export async function activateAccount(): Promise<ActivationStatus> {
  return apiFetch<ActivationStatus>('/account/activate', { method: 'POST', auth: true });
}
