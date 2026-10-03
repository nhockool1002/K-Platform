'use client';

// Client cho API Dispute phía Bên B (FN-DISP-01 — backend/src/disputes).

import { apiFetch } from './auth-client';

export interface DisputeSummary {
  id: string;
  submissionId: string;
  reason: string;
  status: 'OPEN' | 'RECOMMENDED' | 'RESOLVED';
  modRecommendation: 'PEND_APP' | 'PEND_REJ' | null;
  finalDecision: 'APPROVE' | 'REJECT' | null;
  createdAt: string;
}

export async function createDispute(submissionId: string, reason: string): Promise<DisputeSummary> {
  return apiFetch<DisputeSummary>('/disputes', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ submissionId, reason }),
  });
}
