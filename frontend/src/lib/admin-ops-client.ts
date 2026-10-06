'use client';

// Client CMS SCR-25 — giám sát vận hành (backend/src/cms-ops/admin-ops.controller.ts).

import { apiFetch } from './auth-client';

export interface OpsStatus {
  checkedAt: string;
  watermarkQueue: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
  };
  failedJobs: {
    id: string;
    submissionId: string;
    attemptsMade: number;
    failedReason: string;
    failedAt: string | null;
  }[];
  overdueAutoApprove: number;
  stuckWatermark: number;
  serverErrors24h: number;
}

export async function getOpsStatus(): Promise<OpsStatus> {
  return apiFetch<OpsStatus>('/admin/ops/status', { auth: true });
}

export async function retryFailedWatermarkJobs(): Promise<{ retryRequested: number }> {
  return apiFetch<{ retryRequested: number }>('/admin/ops/watermark/retry-failed', {
    method: 'POST',
    auth: true,
  });
}
