import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditContext {
  ip: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  method: string;
  path: string;
  actorId: string | null;
  actorRole: string | null;
  requestPayload: Record<string, unknown> | null;
  written: boolean;
}

export const auditStorage = new AsyncLocalStorage<AuditContext>();
