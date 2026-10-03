'use client';

// Client cho CMS "Thống kê doanh thu" (issue #55 — backend/src/reports).
// Chỉ Admin/Root Admin gọi được (RBAC enforce ở backend).

import { apiFetch } from './auth-client';

export type ReportPeriod = 'day' | 'month' | 'year' | 'all';

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
