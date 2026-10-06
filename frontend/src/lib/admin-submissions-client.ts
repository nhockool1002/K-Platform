'use client';

// Client CMS SCR-22 — duyệt Proof thủ công (backend/src/submissions/admin-submissions.controller.ts).

import { apiFetch } from './auth-client';

export interface AdminProof {
  id: string;
  status: 'PENDING';
  proofUrl: string | null;
  watermarkUrl: string | null;
  reviewUrl: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  campaign: { id: string; title: string };
  publisher: { id: string; email: string };
}

export async function listAdminProofs(stuckWatermark = false): Promise<AdminProof[]> {
  const qs = stuckWatermark ? '?stuckWatermark=true' : '';
  return apiFetch<AdminProof[]>(`/admin/submissions${qs}`, { auth: true });
}

export async function decideAdminProof(
  id: string,
  action: 'APPROVE' | 'REJECT',
  reason?: string,
): Promise<unknown> {
  return apiFetch(`/admin/submissions/${id}/decision`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ action, reason }),
  });
}
