'use client';

// Client cho API Campaigns thật (Phase 3 — backend/src/campaigns). Dữ liệu
// trả về đã JSON-safe (rewardPerSlot là string, BigInt đã serialize ở backend).

import { apiFetch } from './auth-client';
import type { PlatformKey } from './mock-data';

export type SurveyAnswerType = 'YES_NO' | 'TEXT';

export interface SurveyQuestion {
  question: string;
  answerType: SurveyAnswerType;
  requiresReceipt?: boolean;
}

export interface Campaign {
  id: string;
  ownerId: string;
  title: string;
  platform: PlatformKey;
  location: string | null;
  totalSlots: number;
  rewardPerSlot: string;
  dripFeedLimit: number;
  minTrustScore: number;
  surveyQuestions: SurveyQuestion[] | null;
  status: 'ACTIVE' | 'ARCHIVED';
  slotsFilled: number;
  createdAt: string;
  updatedAt: string;
}

export type SubmissionStatus =
  'APPLIED' | 'INVITED' | 'REJECTED_APPLICATION' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPUTED';

export interface Applicant {
  id: string;
  campaignId: string;
  publisherId: string;
  surveyAnswers: Record<string, unknown> | null;
  status: SubmissionStatus;
  createdAt: string;
  publisher: { id: string; email: string; trustScore: number };
  // Giai đoạn Proof (Phase 4) — chỉ có giá trị khi status là PENDING/APPROVED/REJECTED.
  proofUrl: string | null;
  watermarkUrl: string | null;
  reviewUrl: string | null;
  reviewNote: string | null;
  // Phase 5 — lý do Bên A từ chối Proof (nếu có).
  rejectReason: string | null;
  autoApproveAt: string | null;
}

export interface CreateCampaignInput {
  title: string;
  platform: PlatformKey;
  location?: string;
  totalSlots: number;
  rewardPerSlot: number;
  dripFeedLimit: number;
  minTrustScore?: number;
  surveyQuestions?: SurveyQuestion[];
}

export async function listPublicCampaigns(params?: {
  platform?: PlatformKey;
  search?: string;
}): Promise<Campaign[]> {
  const qs = new URLSearchParams();
  if (params?.platform) qs.set('platform', params.platform);
  if (params?.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<Campaign[]>(`/campaigns${suffix}`);
}

export async function getCampaign(id: string): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}`);
}

export async function listMyCampaigns(): Promise<Campaign[]> {
  return apiFetch<Campaign[]>('/campaigns/mine', { auth: true });
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return apiFetch<Campaign>('/campaigns', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function applyCampaign(
  campaignId: string,
  input: { fingerprint: string; surveyAnswers: Record<string, unknown> },
) {
  return apiFetch<Applicant>(`/campaigns/${campaignId}/apply`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function listApplicants(campaignId: string): Promise<Applicant[]> {
  return apiFetch<Applicant[]>(`/campaigns/${campaignId}/applicants`, { auth: true });
}

export async function decideApplicant(
  campaignId: string,
  submissionId: string,
  action: 'INVITE' | 'REJECT',
) {
  return apiFetch<Applicant>(`/campaigns/${campaignId}/applicants/${submissionId}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ action }),
  });
}

export async function archiveCampaign(campaignId: string): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${campaignId}/archive`, { method: 'PATCH', auth: true });
}

// Fingerprint thiết bị đơn giản, ổn định cho cùng 1 trình duyệt — đủ dùng cho
// anti multi-account ở mức wireframe-fidelity (xem backend ApplyCampaignDto).
// Không dùng thư viện fingerprinting nặng (canvas/audio) ở giai đoạn này.
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  const KEY = 'kplatform.deviceFingerprint';
  let fp = window.localStorage.getItem(KEY);
  if (!fp) {
    fp = `${navigator.userAgent}-${crypto.randomUUID()}`;
    window.localStorage.setItem(KEY, fp);
  }
  return fp;
}
