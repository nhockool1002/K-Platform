'use client';

// Client cho CMS Dispute Center (SCR-11 — backend/src/disputes/mod-disputes.controller.ts
// + admin-disputes.controller.ts). Đọc/đề xuất: Moderator/Admin/Root Admin.
// Phán quyết cuối: chỉ Admin/Root Admin (RBAC enforce ở backend).

import { apiFetch } from './auth-client';
import type { PlatformKey } from './mock-data';

export type DisputeStatus = 'OPEN' | 'RECOMMENDED' | 'RESOLVED';

export interface DisputeCampaign {
  id: string;
  title: string;
  platform: PlatformKey;
  rewardPerSlot: string;
  owner: { id: string; email: string };
}

export interface DisputeSubmission {
  id: string;
  proofUrl: string | null;
  watermarkUrl: string | null;
  reviewUrl: string | null;
  reviewNote: string | null;
  rejectReason: string | null;
  campaign: DisputeCampaign;
  publisher: { id: string; email: string; trustScore: number };
}

export interface DisputeDetail {
  id: string;
  submissionId: string;
  reason: string;
  status: DisputeStatus;
  modRecommendation: 'PEND_APP' | 'PEND_REJ' | null;
  finalDecision: 'APPROVE' | 'REJECT' | null;
  createdAt: string;
  submission: DisputeSubmission;
  moderator: { id: string; email: string } | null;
  admin: { id: string; email: string } | null;
  // B-03/B-04 — hạn SLA tính sẵn từ backend theo cấu hình hiện hành.
  sla: {
    moderatorDeadline: string;
    adminDeadline: string;
    isOverdueModerator: boolean;
    isOverdueAdmin: boolean;
  };
}

export async function listDisputes(status?: DisputeStatus): Promise<DisputeDetail[]> {
  const suffix = status ? `?status=${status}` : '';
  return apiFetch<DisputeDetail[]>(`/mod/disputes${suffix}`, { auth: true });
}

export async function recommendDispute(
  id: string,
  recommendation: 'PEND_APP' | 'PEND_REJ',
): Promise<DisputeDetail> {
  return apiFetch<DisputeDetail>(`/mod/disputes/${id}/recommend`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ recommendation }),
  });
}

export async function resolveDispute(
  id: string,
  decision: 'APPROVE' | 'REJECT',
): Promise<{ disputeId: string; resolved: boolean; decision: string; escalated: boolean }> {
  return apiFetch(`/admin/disputes/${id}/resolve`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ decision }),
  });
}
