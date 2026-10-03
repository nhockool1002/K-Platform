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
