import { SetMetadata } from '@nestjs/common';
import type { AuditActionType, AuditLevel } from '../prisma/client.js';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  action?: AuditActionType;
  level?: AuditLevel;
  skip?: boolean;
}

export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);
