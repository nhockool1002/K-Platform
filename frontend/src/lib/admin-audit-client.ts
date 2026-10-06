'use client';

// Client cho CMS Audit Logs (backend/src/audit/admin-audit-logs.controller.ts) — chỉ Admin/Root Admin.

import { apiFetch } from './auth-client';

export type AuditLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditLogRow {
  id: string;
  createdAt: string;
  actor: { id: string; email: string } | null;
  actorRole: string | null;
  targetResource: string;
  actionType: string;
  level: AuditLevel;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  ip: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
}

export interface AuditLogDetail extends AuditLogRow {
  payloadBefore: unknown;
  payloadAfter: unknown;
  requestPayload: unknown;
}

export interface AuditLogPage {
  items: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogFilter {
  page?: number;
  pageSize?: number;
  actor?: string;
  role?: string;
  action?: string;
  level?: AuditLevel;
  ip?: string;
  from?: string;
  to?: string;
}

export async function listAuditLogs(filter: AuditLogFilter): Promise<AuditLogPage> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  return apiFetch<AuditLogPage>(`/admin/audit-logs?${params.toString()}`, { auth: true });
}

export async function getAuditLog(id: string): Promise<AuditLogDetail> {
  return apiFetch<AuditLogDetail>(`/admin/audit-logs/${id}`, { auth: true });
}
