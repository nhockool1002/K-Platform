'use client';

// Client cho CMS RBAC — phân công Campaign cho Moderator cụ thể (P7-08,
// backend/src/campaigns/admin-campaigns.controller.ts). Chỉ Admin/Root Admin.

import { apiFetch } from './auth-client';
import type { PlatformKey } from './mock-data';

export interface AdminCampaign {
  id: string;
  title: string;
  platform: PlatformKey;
  status: 'ACTIVE' | 'ARCHIVED';
  totalSlots: number;
  rewardPerSlot: string;
  owner: { id: string; email: string };
  assignedModerator: { id: string; email: string } | null;
}

export async function listAdminCampaigns(): Promise<AdminCampaign[]> {
  return apiFetch<AdminCampaign[]>('/admin/campaigns', { auth: true });
}

export async function assignModerator(
  campaignId: string,
  moderatorId: string | null,
): Promise<AdminCampaign> {
  return apiFetch<AdminCampaign>(`/admin/campaigns/${campaignId}/assign-moderator`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ moderatorId }),
  });
}

// SCR-21 — chi tiết, sửa thông tin hiển thị, lưu trữ (= "xoá" trong CMS, hoàn ký quỹ slot chưa dùng).
export interface AdminCampaignDetail extends AdminCampaign {
  location: string | null;
  minTrustScore: number;
  dripFeedLimit: number;
  createdAt: string;
  owner: { id: string; email: string; disabledAt: string | null };
  slotsOccupied: number;
  statusCounts: Record<string, number>;
  refundableKpoint: string;
}

export interface ArchiveCampaignResult {
  status: 'ACTIVE' | 'ARCHIVED';
  refundedKpoint: string;
  refundedSlots: number;
}

export async function getAdminCampaign(id: string): Promise<AdminCampaignDetail> {
  return apiFetch<AdminCampaignDetail>(`/admin/campaigns/${id}`, { auth: true });
}

export async function updateAdminCampaign(
  id: string,
  patch: { title?: string; location?: string; minTrustScore?: number },
): Promise<AdminCampaign> {
  return apiFetch<AdminCampaign>(`/admin/campaigns/${id}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(patch),
  });
}

export async function archiveAdminCampaign(id: string): Promise<ArchiveCampaignResult> {
  return apiFetch<ArchiveCampaignResult>(`/admin/campaigns/${id}/archive`, {
    method: 'PATCH',
    auth: true,
  });
}
