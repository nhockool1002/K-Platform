'use client';

// Client cho API Submission/Proof thật (Phase 4 — backend/src/submissions).

import { ApiError, apiFetch, getAccessToken } from './auth-client';
import type { PlatformKey } from './mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type SubmissionStatus =
  'APPLIED' | 'INVITED' | 'REJECTED_APPLICATION' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPUTED';

export interface SubmissionCampaign {
  id: string;
  title: string;
  platform: PlatformKey;
  location: string | null;
  rewardPerSlot: string;
  dripFeedLimit: number;
}

export type DisputeStatus = 'OPEN' | 'RECOMMENDED' | 'RESOLVED';

export interface SubmissionDispute {
  id: string;
  status: DisputeStatus;
  reason: string;
  modRecommendation: 'PEND_APP' | 'PEND_REJ' | null;
  finalDecision: 'APPROVE' | 'REJECT' | null;
  createdAt: string;
}

export interface Submission {
  id: string;
  campaignId: string;
  publisherId: string;
  status: SubmissionStatus;
  proofUrl: string | null;
  watermarkUrl: string | null;
  reviewUrl: string | null;
  reviewNote: string | null;
  rejectReason: string | null;
  autoApproveAt: string | null;
  createdAt: string;
  campaign?: SubmissionCampaign;
  dispute?: SubmissionDispute | null;
}

// FormData — không dùng apiFetch() vì nó luôn set Content-Type: application/
// json; multipart cần trình duyệt tự sinh boundary, không được set thủ công.
export async function submitProof(
  submissionId: string,
  file: File,
  input: { reviewUrl?: string; reviewNote?: string },
): Promise<Submission> {
  const formData = new FormData();
  formData.append('file', file);
  if (input.reviewUrl) formData.append('reviewUrl', input.reviewUrl);
  if (input.reviewNote) formData.append('reviewNote', input.reviewNote);

  const token = getAccessToken();
  const res = await fetch(`${API_URL}/submissions/${submissionId}/proof`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
  }
  return data as Submission;
}

export async function getSubmission(id: string): Promise<Submission> {
  return apiFetch<Submission>(`/submissions/${id}`, { auth: true });
}

export async function listMySubmissions(): Promise<Submission[]> {
  return apiFetch<Submission[]>('/submissions/mine', { auth: true });
}

export async function decideProof(
  id: string,
  action: 'APPROVE' | 'REJECT',
  reason?: string,
): Promise<Submission> {
  return apiFetch<Submission>(`/submissions/${id}/decision`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ action, reason }),
  });
}

// Backend serve file qua /uploads/* ở API_URL gốc (không có /api/v1) —
// API_URL đã có sẵn /api/v1, cắt bỏ để ráp đúng origin.
export function resolveUploadUrl(path: string): string {
  const origin = API_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${path}`;
}
