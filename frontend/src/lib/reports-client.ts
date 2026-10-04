'use client';

// Client cho CMS "Thống kê doanh thu" (issue #55 — backend/src/reports).
// Chỉ Admin/Root Admin gọi được (RBAC enforce ở backend).

import { apiFetch } from './auth-client';
import type { PlatformKey } from './mock-data';

export type ReportPeriod = 'day' | 'month' | 'year' | 'all';

// P7-01/02/03/04/SCR-09 — CMS Overview, mở cho cả Admin và Moderator.
export interface KpiOverview {
  circulatingKpoint: string;
  totalReservedKpoint: string;
  reviewsToday: number;
  campaignFeeRevenueThisMonth: string;
  pendingWithdrawals: number;
  pendingDisputes: number;
  recentActiveCampaigns: {
    id: string;
    title: string;
    platform: PlatformKey;
    totalSlots: number;
    slotsFilled: number;
    dripFeedLimit: number;
  }[];
}

export async function getKpiOverview(): Promise<KpiOverview> {
  return apiFetch<KpiOverview>('/admin/reports/kpi-overview', { auth: true });
}

export interface ReportsOverview {
  period: ReportPeriod;
  periodLabel: string;
  revenue: {
    campaignCreationFeeKpoint: string;
    campaignCount: number;
    activationFeeKpoint: string;
    activationCount: number;
    totalKpoint: string;
  };
  escrow: {
    totalReservedKpoint: string;
    campaigns: {
      id: string;
      title: string;
      ownerEmail: string;
      totalSlots: number;
      approvedSlots: number;
      lockedKpoint: string;
    }[];
  };
  topEscrowOwners: { userId: string; email: string; totalKpoint: string; campaignCount: number }[];
  topTopupUsers: { userId: string; email: string; totalKpoint: string }[];
  topEarners: { userId: string; email: string; totalKpoint: string }[];
}

export async function getReportsOverview(period: ReportPeriod): Promise<ReportsOverview> {
  return apiFetch<ReportsOverview>(`/admin/reports/overview?period=${period}`, { auth: true });
}
