'use client';

// Client CMS SCR-24 — chống gian lận (backend/src/cms-ops/admin-fraud.controller.ts).

import { apiFetch } from './auth-client';

export interface FraudPublisher {
  id: string;
  email: string;
  role: string;
  disabledAt: string | null;
}

export interface FraudCluster {
  kind: 'FINGERPRINT' | 'IP';
  campaignId: string;
  campaignTitle: string | null;
  signal: string;
  publishers: FraudPublisher[];
}

export async function listFraudClusters(): Promise<FraudCluster[]> {
  return apiFetch<FraudCluster[]>('/admin/fraud/clusters', { auth: true });
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<unknown> {
  return apiFetch(`/admin/fraud/users/${userId}/disabled`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ disabled }),
  });
}
